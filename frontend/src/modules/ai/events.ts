import type { Summary } from './domain/models';

/** Sự kiện của module AI. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'ai.summary.requested': { channelId: string; limit: number };
    'ai.summary.completed': { summary: Summary };
    'ai.summary.failed': { channelId: string; message: string };
  }
}

export {};
