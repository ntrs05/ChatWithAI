import { http } from '@/shared/http';
import type { AiGateway } from '../application/ports';
import type { Summary, SummaryRequest } from '../domain/models';

/** POST /api/ai/summarize → server tóm tắt và trả về Summary. */
export class HttpAiGateway implements AiGateway {
  summarize(request: SummaryRequest): Promise<Summary> {
    const { scope } = request;
    const body = {
      channelId: request.channelId,
      mode: scope.mode,
      limit: scope.mode === 'count' ? scope.limit : undefined,
      sinceMinutes: scope.mode === 'since' ? scope.minutes : undefined,
      prompt: request.prompt,
    };
    return http<Summary>('/ai/summarize', { method: 'POST', body });
  }
}
