import { describe, expect, it, vi } from 'vitest';
import type { PeerMesh } from '../application/ports';
import { AdaptiveMesh, type LiveKitMesh } from './LiveKitMesh';

const fakeMesh = (): PeerMesh => ({ join: vi.fn(), leave: vi.fn(), handleSignal: vi.fn(), onRemoteStream: vi.fn() });
const fakeSfu = (connect: () => Promise<void>) =>
  ({ connect: vi.fn(connect), leave: vi.fn(), onRemoteStream: vi.fn() }) as unknown as LiveKitMesh;
const env = { channelId: 'c', from: 'x', data: { kind: 'hello' } } as never;

describe('AdaptiveMesh', () => {
  it('dùng SFU khi nối được và không chuyển tín hiệu mesh', async () => {
    const mesh = fakeMesh();
    const a = new AdaptiveMesh('me', mesh, () => fakeSfu(async () => {}));
    a.join('c', null);
    await vi.waitFor(() => a.handleSignal(env));
    expect(mesh.join).not.toHaveBeenCalled();
    expect(mesh.handleSignal).not.toHaveBeenCalled();
  });

  it('quay về mesh khi SFU lỗi', async () => {
    const mesh = fakeMesh();
    const a = new AdaptiveMesh('me', mesh, () => fakeSfu(async () => Promise.reject(new Error('404'))));
    a.join('c', null);
    await vi.waitFor(() => expect(mesh.join).toHaveBeenCalledWith('c', null));
    a.handleSignal(env);
    expect(mesh.handleSignal).toHaveBeenCalled();
  });

  it('rời trong lúc đang nối thì không bật mesh', async () => {
    const mesh = fakeMesh();
    const a = new AdaptiveMesh('me', mesh, () => fakeSfu(() => new Promise((_, rej) => setTimeout(() => rej(new Error('x')), 10))));
    a.join('c', null);
    a.leave();
    await new Promise((r) => setTimeout(r, 30));
    expect(mesh.join).not.toHaveBeenCalled();
  });
});
