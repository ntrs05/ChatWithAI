import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus';

interface TestEvents {
  'chat.sent': { text: string };
  'user.left': { id: number };
}

describe('EventBus (Pub-Sub)', () => {
  it('giao sự kiện cho mọi subscriber của đúng tên sự kiện', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const other = vi.fn();
    bus.subscribe('chat.sent', a);
    bus.subscribe('chat.sent', b);
    bus.subscribe('user.left', other);

    bus.publish('chat.sent', { text: 'xin chào' });

    expect(a).toHaveBeenCalledWith({ text: 'xin chào' });
    expect(b).toHaveBeenCalledOnce();
    expect(other).not.toHaveBeenCalled();
  });

  it('huỷ đăng ký thì không nhận nữa', () => {
    const bus = new EventBus<TestEvents>();
    const h = vi.fn();
    const off = bus.subscribe('user.left', h);
    off();
    bus.publish('user.left', { id: 1 });
    expect(h).not.toHaveBeenCalled();
  });

  it('once() chỉ nhận một lần', () => {
    const bus = new EventBus<TestEvents>();
    const h = vi.fn();
    bus.once('user.left', h);
    bus.publish('user.left', { id: 1 });
    bus.publish('user.left', { id: 2 });
    expect(h).toHaveBeenCalledTimes(1);
  });

  it('lỗi ở một subscriber không ảnh hưởng subscriber khác', () => {
    const bus = new EventBus<TestEvents>();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn();
    bus.subscribe('chat.sent', () => {
      throw new Error('hỏng');
    });
    bus.subscribe('chat.sent', ok);
    bus.publish('chat.sent', { text: 'x' });
    expect(ok).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
