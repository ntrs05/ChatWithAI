import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { Button } from '@/shared/ui';
import { directService } from '../module';

/** Nút "Nhắn tin": mở (hoặc tạo) cuộc trò chuyện 1-1 với một người bạn rồi chuyển sang đó. */
export function MessageButton({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={busy}
      icon={<MessageCircle size={16} />}
      onClick={async () => {
        setBusy(true);
        try {
          const chat = await directService().open(userId);
          navigate(`/app/dm/${chat.id}`);
        } catch (err) {
          toast.error(errorMessage(err, 'Không mở được cuộc trò chuyện'));
        } finally {
          setBusy(false);
        }
      }}
    >
      Nhắn tin
    </Button>
  );
}
