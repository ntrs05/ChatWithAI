import { describe, expect, it } from 'vitest';
import { parseQuotaMb, quotaPercent } from './rules';

describe('admin rules', () => {
  it('tính phần trăm hạn mức', () => {
    expect(quotaPercent(50, 200)).toBe(25);
    expect(quotaPercent(500, 200)).toBe(100);
    expect(quotaPercent(1, 0)).toBe(100);
  });
  it('đọc số MB nhập vào', () => {
    expect(parseQuotaMb('100')).toBe(100);
    expect(parseQuotaMb(' 2,9 ')).toBe(2);
    expect(parseQuotaMb('abc')).toBeNull();
    expect(parseQuotaMb('-5')).toBeNull();
  });
});
