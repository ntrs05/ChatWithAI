// Trang chủ sau khi đăng nhập. TODO: server xong thì thay bằng HomeView.
export function HomePage() {
  return <Slot name="HomeView" from="server" grow />;
}

// Ô giữ chỗ: chỉ ra chỗ này sẽ đặt component nào của module nào.
function Slot({ name, from, grow = false }: { name: string; from: string; grow?: boolean }) {
  return (
    <div className={`flex min-h-[110px] items-center justify-center p-3 ${grow ? 'flex-1' : ''}`}>
      <div className="rounded-xl border border-dashed border-zinc-600 px-5 py-4 text-center text-zinc-400">
        <p className="font-semibold text-zinc-100">{name}</p>
        <p className="mt-1 text-xs">module {from} · chưa ghép</p>
      </div>
    </div>
  );
}
