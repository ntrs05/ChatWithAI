export interface SummaryRequest {
  channelId: string;
  /** Số tin nhắn gần nhất cần tóm tắt */
  limit: number;
}

export interface Summary {
  channelId: string;
  generatedAt: string;
  model: string;
  messageCount: number;
  timeRange: { from: string; to: string } | null;
  participants: Array<{ name: string; count: number }>;
  topics: string[];
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
}

export const SUMMARY_RANGES = [20, 50, 100] as const;
export const DEFAULT_SUMMARY_RANGE = 50;

/** Chuyển bản tóm tắt thành văn bản thuần để sao chép. */
export function summaryToText(s: Summary, channelName: string): string {
  const lines = [`Tóm tắt #${channelName} (${s.messageCount} tin nhắn)`, '', s.overview];
  const section = (title: string, items: string[]) => {
    if (items.length) lines.push('', title, ...items.map((x) => `• ${x}`));
  };
  section('Ý chính:', s.keyPoints);
  section('Việc cần làm:', s.actionItems);
  section('Câu hỏi mở:', s.questions);
  return lines.join('\n');
}
