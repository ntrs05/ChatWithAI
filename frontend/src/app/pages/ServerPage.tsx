// TODO: server/chat/voice/ai xong thì thay từng ô bằng component thật, đọc channelId trên URL để biết mở chat hay voice.
export function ServerPage() {
  return (
    <div className="flex flex-1">
      <div className="w-56 shrink-0 border-r border-zinc-800"><Slot name="ChannelSidebar" from="server" /></div>
      <div className="flex flex-1 flex-col justify-center">
        <Slot name="ChatView" from="chat" />
        <Slot name="VoiceRoomView" from="voice" />
        <Slot name="SummaryPanel" from="ai" />
      </div>
      <div className="w-56 shrink-0 border-l border-zinc-800"><Slot name="MemberList" from="server" /></div>
    </div>
  );
}

// placeholder, thay bằng component thật khi module xong
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
