import { describe, expect, it } from 'vitest';
import { summarizeLocally, type SummarizerInput } from './localSummarizer';

const at = (m: number) => new Date(2026, 9, 19, 20, m).toISOString();
const say = (author: string, m: number, content: string): SummarizerInput => ({ author, content, createdAt: at(m), attachmentCount: 0 });

const conversation = [
  say('Minh Anh', 0, 'Tuần này cần chốt kiến trúc cho đồ án chat voice nhé'),
  say('Quốc Bảo', 1, 'Mình đề xuất kiến trúc phân lớp cho từng module của đồ án'),
  say('Thu Hà', 2, 'Đồng ý, toàn bộ đồ án nên là modular monolith tách module rõ ràng'),
  say('Gia Huy', 3, 'Realtime thì dùng pub sub qua socket để đẩy tin nhắn'),
  say('Quốc Bảo', 4, 'Deadline nộp báo cáo là thứ Sáu tuần này'),
  say('Thu Hà', 5, 'Ai phụ trách phần tóm tắt tin nhắn bằng AI vậy?'),
  say('Minh Anh', 6, 'Mình nhận phần AI và gọi mô hình ở backend'),
];

describe('summarizeLocally (AI Service mô phỏng)', () => {
  const s = summarizeLocally(conversation);

  it('thống kê người tham gia, người nói nhiều nhất đứng đầu', () => {
    expect(s.participants).toHaveLength(4);
    expect(s.participants[0].count).toBe(2);
  });

  it('nhận ra câu hỏi mở và việc cần làm', () => {
    expect(s.questions.some((q) => q.includes('Ai phụ trách'))).toBe(true);
    expect(s.actionItems.some((a) => a.includes('Deadline'))).toBe(true);
    expect(s.actionItems.some((a) => a.includes('Mình nhận'))).toBe(true);
  });

  it('rút ra chủ đề và ý chính', () => {
    expect(s.topics.length).toBeGreaterThan(0);
    expect(s.keyPoints.length).toBeGreaterThanOrEqual(2);
    expect(s.overview).toContain('7 tin nhắn');
  });

  it('kênh trống trả về thông báo phù hợp', () => {
    expect(summarizeLocally([]).overview).toMatch(/chưa có tin nhắn/);
  });
});
