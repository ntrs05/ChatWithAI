// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextMenu, type MenuItem } from './ContextMenu';

afterEach(cleanup);

describe('ContextMenu', () => {
  const make = (over: Partial<Record<string, () => void>> = {}): MenuItem[] => [
    { key: 'a', label: 'Mục A', onSelect: over.a },
    { key: 'sub', label: 'Có menu con', hint: 'Đang: Chỉ @mentions', children: [{ key: 'c1', label: 'Con 1', checked: true, onSelect: over.c1 }, { key: 'c2', label: 'Con 2', checked: false }] },
    { key: 'off', label: 'Bị vô hiệu', disabled: true, onSelect: over.off },
    { key: 'del', label: 'Rời đi', danger: true, separatorBefore: true, onSelect: over.del },
  ];

  it('hiện các mục, chọn một mục thì gọi onSelect rồi đóng', () => {
    const a = vi.fn();
    const onClose = vi.fn();
    render(<ContextMenu x={10} y={10} items={make({ a })} onClose={onClose} />);
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.click(screen.getByText('Mục A'));
    expect(a).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('mục bị vô hiệu không chạy', () => {
    const off = vi.fn();
    render(<ContextMenu x={0} y={0} items={make({ off })} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Bị vô hiệu'));
    expect(off).not.toHaveBeenCalled();
  });

  it('rê chuột vào mục có con thì mở menu con, hiện ô tích và hint', () => {
    const c1 = vi.fn();
    render(<ContextMenu x={0} y={0} items={make({ c1 })} onClose={() => {}} />);
    expect(screen.getByText('Đang: Chỉ @mentions')).toBeTruthy();
    expect(screen.queryByText('Con 1')).toBeNull();
    fireEvent.mouseEnter(screen.getByText('Có menu con'));
    expect(screen.getByText('Con 1')).toBeTruthy();
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    fireEvent.click(screen.getByText('Con 1'));
    expect(c1).toHaveBeenCalled();
  });

  it('đóng khi nhấn Esc hoặc bấm ra ngoài', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={make()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('bấm vào trong menu không bị coi là bấm ra ngoài', () => {
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={make()} onClose={onClose} />);
    fireEvent.mouseDown(screen.getByText('Có menu con'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
