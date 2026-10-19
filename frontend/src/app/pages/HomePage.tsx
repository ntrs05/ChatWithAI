import { useAuthStore } from '@/modules/auth';
import { HomeView } from '@/modules/server';

export function HomePage() {
  const name = useAuthStore((s) => s.user?.displayName ?? '');
  return (
    <div className="flex-1">
      <HomeView displayName={name} />
    </div>
  );
}
