import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../lib';

export interface MenuItem {
  key: string;
  label: ReactNode;
  /** Dòng chữ nhỏ bên dưới nhãn (vd: mức thông báo hiện tại). */
  hint?: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Có giá trị (true/false) → hiện ô tích (kiểu radio / checkbox). */
  checked?: boolean;
  /** Kẻ một đường ngăn phía trên mục này. */
  separatorBefore?: boolean;
  onSelect?: () => void;
  /** Có mục con → mở menu con khi rê chuột / bấm. */
  children?: MenuItem[];
}

interface ContextMenuProps {
  /** Toạ độ con trỏ chuột (clientX / clientY). */
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const MARGIN = 8;

/** Một bảng menu; tự dịch vào trong khung nhìn nếu bị tràn mép màn hình. */
function MenuPanel({
  x,
  y,
  items,
  onClose,
  anchor,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  /** Với menu con: hình chữ nhật của mục cha, để mở sang trái nếu bên phải hết chỗ. */
  anchor?: DOMRect;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [subAnchor, setSubAnchor] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + width + MARGIN > window.innerWidth) left = anchor ? anchor.left - width + 4 : window.innerWidth - width - MARGIN;
    if (top + height + MARGIN > window.innerHeight) top = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    setPos({ left: Math.max(MARGIN, left), top: Math.max(MARGIN, top) });
  }, [x, y, anchor, items.length]);

  const openSub = (key: string, el: HTMLElement) => {
    setOpenKey(key);
    setSubAnchor(el.getBoundingClientRect());
  };

  const sub = items.find((i) => i.key === openKey && i.children);

  return (
    <>
      <div
        ref={ref}
        role="menu"
        className="fixed z-[70] min-w-[220px] max-w-[280px] animate-fade-in rounded-xl border border-white/10 bg-ink-950 p-1.5 shadow-2xl"
        style={pos}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item) => (
          <div key={item.key}>
            {item.separatorBefore && <div className="my-1.5 border-t border-white/5" />}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onMouseEnter={(e) => (item.children ? openSub(item.key, e.currentTarget) : setOpenKey(null))}
              onClick={(e) => {
                if (item.children) return openSub(item.key, e.currentTarget);
                item.onSelect?.();
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
                item.disabled && 'cursor-not-allowed opacity-40',
                !item.disabled && (item.danger ? 'text-rose-400 hover:bg-rose-500/15' : 'text-slate-200 hover:bg-brand-400/15 hover:text-white'),
                openKey === item.key && !item.danger && 'bg-brand-400/15 text-white',
              )}
            >
              {item.icon && <span className={item.danger ? 'text-rose-400' : 'text-brand-300'}>{item.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.hint && <span className="block truncate text-xs font-normal text-muted">{item.hint}</span>}
              </span>
              {item.checked !== undefined && (
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border',
                    item.checked ? 'border-brand-400 bg-brand-400 text-ink-950' : 'border-ink-500',
                  )}
                >
                  {item.checked && <Check size={14} strokeWidth={3} />}
                </span>
              )}
              {item.children && <ChevronRight size={16} className="text-muted" />}
            </button>
          </div>
        ))}
      </div>
      {sub?.children && subAnchor && (
        <MenuPanel x={subAnchor.right - 4} y={subAnchor.top - 6} items={sub.children} onClose={onClose} anchor={subAnchor} />
      )}
    </>
  );
}

/**
 * Menu chuột phải (kiểu Discord): hiện tại vị trí con trỏ, có menu con, ô tích, mục nguy hiểm màu đỏ.
 * Đóng khi bấm ra ngoài, nhấn Esc, cuộn, đổi kích thước cửa sổ hoặc chọn một mục.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[role="menu"]')) onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  return createPortal(<MenuPanel x={x} y={y} items={items} onClose={onClose} />, document.body);
}
