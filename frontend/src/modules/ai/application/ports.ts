import type { Summary, SummaryRequest } from '../domain/models';

/**
 * Cổng tới tác nhân "AI Service (Mô hình AI)" trong sơ đồ Use Case.
 * Backend thật nên gọi mô hình ngôn ngữ ở phía server để giữ bí mật API key.
 */
export interface AiGateway {
  summarize(request: SummaryRequest): Promise<Summary>;
}
