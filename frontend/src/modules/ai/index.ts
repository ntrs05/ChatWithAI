/**
 * PUBLIC API của module AI (UC09 — Tóm tắt tin nhắn bằng AI).
 */
import './events';

export { initAiModule, aiService } from './module';
export { useAiStore } from './application/aiStore';
export type { Summary } from './domain/models';
export { SummarizeButton, SummaryPanel } from './presentation/SummaryPanel';
