/** auto = AI tự tìm "cuộc trò chuyện vừa rồi"; count = N tin gần nhất; since = từ N phút trước đến giờ. */
export type SummaryScope = { mode: 'auto' } | { mode: 'count'; limit: number } | { mode: 'since'; minutes: number };

export interface SummaryRequest {
  channelId: string;
  scope: SummaryScope;
  /** Câu người dùng gõ sau @nebula, để AI biết cần tập trung vào đâu */
  prompt?: string;
}

export interface Summary {
  channelId: string;
  generatedAt: string;
  model: string;
  messageCount: number;
  timeRange: { from: string; to: string } | null;
  /** Mô tả phạm vi đã tóm tắt, VD "cuộc trò chuyện vừa rồi", "2 giờ qua" */
  scope: string;
  participants: Array<{ name: string; count: number }>;
  topics: string[];
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
}

export const SUMMARY_COUNTS = [20, 50, 100] as const;
export const SUMMARY_WINDOWS = [
  { minutes: 30, label: '30 phút' },
  { minutes: 60, label: '1 giờ' },
  { minutes: 180, label: '3 giờ' },
  { minutes: 1440, label: '24 giờ' },
] as const;
export const DEFAULT_SUMMARY_SCOPE: SummaryScope = { mode: 'auto' };

export const sameScope = (a: SummaryScope, b: SummaryScope): boolean =>
  a.mode === b.mode && (a.mode === 'count' ? a.limit === (b as typeof a).limit : a.mode === 'since' ? a.minutes === (b as typeof a).minutes : true);

/** Chuyển bản tóm tắt thành văn bản thuần để sao chép. */
export function summaryToText(s: Summary, channelName: string): string {
  const lines = [`Tóm tắt #${channelName} (${s.scope}, ${s.messageCount} tin nhắn)`, '', s.overview];
  const section = (title: string, items: string[]) => {
    if (items.length) lines.push('', title, ...items.map((x) => `• ${x}`));
  };
  section('Ý chính:', s.keyPoints);
  section('Việc cần làm:', s.actionItems);
  section('Câu hỏi mở:', s.questions);
  return lines.join('\n');
}
