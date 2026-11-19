import type { Summary, SummaryScope } from './domain/models';

/** Sự kiện của module AI. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'ai.summary.requested': { channelId: string; scope: SummaryScope };
    'ai.summary.completed': { summary: Summary };
    'ai.summary.failed': { channelId: string; message: string };
  }
}

export {};
