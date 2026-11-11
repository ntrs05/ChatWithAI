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

// TODO: SUMMARY_COUNTS, SUMMARY_WINDOWS, DEFAULT_SUMMARY_SCOPE, sameScope, summaryToText
