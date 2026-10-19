import { ApiError, http, tokenStore } from '@/shared/http';
import { readTable, requireMember, requireUser, respond } from '@/mock-backend';
import type { AiGateway } from '../application/ports';
import type { Summary, SummaryRequest } from '../domain/models';
import { summarizeLocally } from './localSummarizer';

/** Giả lập AI Service: đọc tin nhắn từ "CSDL" rồi tóm tắt cục bộ (có độ trễ như gọi mô hình thật). */
export class MockAiGateway implements AiGateway {
  summarize({ channelId, limit }: SummaryRequest): Promise<Summary> {
    return respond(() => {
      const me = requireUser(tokenStore.get());
      const channel = readTable('channels').find((c) => c.id === channelId);
      if (!channel || channel.type !== 'text') throw new ApiError('Chỉ tóm tắt được kênh văn bản', 400);
      requireMember(channel.serverId, me.id);

      const users = new Map(readTable('users').map((u) => [u.id, u.displayName]));
      const rows = readTable('messages')
        .filter((m) => m.channelId === channelId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(-limit);

      const result = summarizeLocally(
        rows.map((r) => ({
          author: users.get(r.authorId) ?? 'Ẩn danh',
          content: r.content,
          createdAt: r.createdAt,
          attachmentCount: r.attachments.length,
        })),
      );
      return {
        ...result,
        channelId,
        messageCount: rows.length,
        generatedAt: new Date().toISOString(),
        model: 'nebula-extractive-v1 (mô phỏng cục bộ)',
      };
    }, [900, 1600]);
  }
}

/** Backend thật: POST /api/ai/summarize → server gọi LLM và trả về Summary. */
export class HttpAiGateway implements AiGateway {
  summarize(request: SummaryRequest): Promise<Summary> {
    return http<Summary>('/ai/summarize', { method: 'POST', body: request });
  }
}
