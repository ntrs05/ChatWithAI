import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic } from 'lucide-react';
import { SettingsPage, type ExtraSettingsTab } from '@/modules/auth';
import { VoiceSettingsPanel } from '@/modules/voice';
import { useSettingsModal } from '@/shared/ui';

/** Tab do module khác đóng góp cho Cài đặt — chỗ GHÉP duy nhất là ở đây (app/). */
const extraTabs: ExtraSettingsTab[] = [{ id: 'voice', label: 'Giọng nói & Video', icon: Mic, render: () => <VoiceSettingsPanel /> }];

/** Cài đặt dạng popup phủ lên ứng dụng (giống Discord): bấm ✕, bấm ra ngoài khung hoặc nhấn Esc để đóng. */
export function SettingsModal() {
  const { open, tab, hide } = useSettingsModal();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={hide} data-testid="settings-backdrop" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt"
        className="relative h-full w-full max-w-5xl animate-fade-in overflow-hidden border border-ink-600 shadow-2xl md:h-[min(86vh,760px)] md:rounded-2xl"
      >
        <SettingsPage onClose={hide} extraTabs={extraTabs} initialTab={tab} />
      </div>
    </div>,
    document.body,
  );
}
