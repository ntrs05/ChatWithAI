export type SummaryScope = { mode: 'auto' } | { mode: 'count'; limit: number } | { mode: 'since'; minutes: number };

export interface SummaryRequest {
  channelId: string;
  scope: SummaryScope;
  prompt?: string;
}

export interface Summary {
  channelId: string;
  generatedAt: string;
  model: string;
  messageCount: number;
  timeRange: { from: string; to: string } | null;
  scope: string;
  participants: Array<{ name: string; count: number }>;
  topics: string[];
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
}

// TODO: SUMMARY_COUNTS, SUMMARY_WINDOWS, DEFAULT_SUMMARY_SCOPE, sameScope, summaryToText
