/**
 * Bộ tóm tắt TRÍCH XUẤT (extractive) chạy cục bộ — đóng vai "AI Service" khi chưa có backend.
 * Thuật toán: tách âm tiết tiếng Việt → bỏ stopword → đếm unigram/bigram → chấm điểm câu
 * theo tần suất từ khoá → chọn câu tiêu biểu, việc cần làm và câu hỏi.
 * Khi có backend, thay bằng mô hình ngôn ngữ lớn (LLM) qua HttpAiGateway.
 */
export interface SummarizerInput {
  author: string;
  content: string;
  createdAt: string;
  attachmentCount: number;
}

export interface SummarizerOutput {
  participants: Array<{ name: string; count: number }>;
  topics: string[];
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
  timeRange: { from: string; to: string } | null;
}

const STOPWORDS = new Set(
  (
    'và là của có không được cho các những này đó thì mà với để một nhé nha mình bạn mọi người vậy rồi cũng đã sẽ đang ở trong ' +
    'khi nào gì ai như thế lúc ra vào lên về nên hay hoặc nhưng vì nếu chỉ còn thôi đi ạ ơi à ừ ok oke nhỉ nhá luôn lại tôi em anh chị ' +
    'cả hết rất quá thật đây kia đâu sao bao nhiêu từ tới đến theo trên dưới sau trước giúp với vẫn đều chứ hả hen hử phải ' +
    'thứ ngày tuần giờ h nữa mới làm biết thấy muốn cần nói xem the a an to of is are'
  ).split(/\s+/),
);

const ACTION_RE = /\b(mình|tôi|em|anh|chị)\s+(nhận|làm|phụ trách|lo|sẽ)\b|deadline|hạn chót|hạn nộp|nhớ |cần |phải |họp|lịch|nộp/i;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function terms(text: string): string[] {
  const words = tokenize(text);
  const bigrams = words.slice(1).map((w, i) => `${words[i]} ${w}`);
  return [...words, ...bigrams];
}

const clip = (s: string, n = 150) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export function summarizeLocally(messages: SummarizerInput[]): SummarizerOutput {
  const msgs = messages.filter((m) => m.content.trim() || m.attachmentCount > 0);
  if (msgs.length === 0) {
    return {
      participants: [],
      topics: [],
      overview: 'Kênh này chưa có tin nhắn nào để tóm tắt.',
      keyPoints: [],
      actionItems: [],
      questions: [],
      timeRange: null,
    };
  }

  // 1. Người tham gia
  const counts = new Map<string, number>();
  msgs.forEach((m) => counts.set(m.author, (counts.get(m.author) ?? 0) + 1));
  const participants = [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // 2. Tần suất từ khoá (bigram được nhân đôi vì tiếng Việt có nhiều từ ghép 2 âm tiết)
  const freq = new Map<string, number>();
  msgs.forEach((m) => new Set(terms(m.content)).forEach((t) => freq.set(t, (freq.get(t) ?? 0) + (t.includes(' ') ? 2 : 1))));
  const topics = [...freq.entries()]
    .filter(([t, f]) => t.includes(' ') && f >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .filter((t, i, arr) => !arr.slice(0, i).some((prev) => prev.includes(t) || t.includes(prev)))
    .slice(0, 4);
  const topWords = topics.length
    ? topics
    : [...freq.entries()].filter(([t]) => !t.includes(' ')).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);

  // 3. Chấm điểm câu
  const scored = msgs.map((m, idx) => {
    const ts = terms(m.content);
    const score = ts.reduce((s, t) => s + (freq.get(t) ?? 0), 0) / Math.sqrt(ts.length + 1);
    return { m, idx, score };
  });
  const isQuestion = (c: string) => /\?\s*$/.test(c.trim()) || /\b(không|chưa|sao|nào)\s*\?/.test(c);
  const isAction = (c: string) => ACTION_RE.test(c);

  const keyCount = Math.min(5, Math.max(2, Math.ceil(msgs.length / 4)));
  const keyPoints = scored
    .filter((x) => x.m.content.trim().length > 20 && !isQuestion(x.m.content))
    .sort((a, b) => b.score - a.score)
    .slice(0, keyCount)
    .sort((a, b) => a.idx - b.idx)
    .map((x) => `${x.m.author}: ${clip(x.m.content.trim())}`);

  const actionItems = msgs
    .filter((m) => isAction(m.content) && !isQuestion(m.content))
    .slice(-5)
    .map((m) => `${m.author}: ${clip(m.content.trim(), 120)}`);

  const questions = msgs
    .filter((m) => isQuestion(m.content))
    .slice(-4)
    .map((m) => `${m.author}: ${clip(m.content.trim(), 120)}`);

  // 4. Tổng quan
  const from = msgs[0].createdAt;
  const to = msgs[msgs.length - 1].createdAt;
  const files = msgs.reduce((s, m) => s + m.attachmentCount, 0);
  const links = msgs.reduce((s, m) => s + (m.content.match(/https?:\/\/\S+/g)?.length ?? 0), 0);
  const top = participants[0];
  const parts = [
    `Trong ${msgs.length} tin nhắn (${timeOf(from)} → ${timeOf(to)}), ${participants.length} thành viên đã trao đổi`,
    topWords.length ? ` chủ yếu về ${topWords.map((t) => `“${t}”`).join(', ')}.` : '.',
    participants.length > 1 ? ` ${top.name} hoạt động tích cực nhất (${top.count} tin).` : '',
    files ? ` Có ${files} tệp/hình ảnh được chia sẻ.` : '',
    links ? ` Có ${links} liên kết được gửi.` : '',
    questions.length ? ` Còn ${questions.length} câu hỏi cần được trả lời.` : '',
  ];

  return {
    participants,
    topics: topWords,
    overview: parts.join(''),
    keyPoints,
    actionItems,
    questions,
    timeRange: { from, to },
  };
}
