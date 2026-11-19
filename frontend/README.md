# Nebula — Frontend Hệ thống Chat & Voice

Frontend cho đồ án **Hệ thống Chat & Voice** (lấy cảm hứng từ Discord nhưng có thương hiệu, bảng màu, logo và hình ảnh riêng).
Xây dựng bằng **React 18 + TypeScript + Vite + Tailwind CSS + Zustand**, áp dụng 3 mẫu kiến trúc:

1. **Layered Architecture** — mỗi module chia tầng Presentation / Application / Domain / Infrastructure
2. **Modular Monolith** — 8 module độc lập trong một ứng dụng: `auth`, `server`, `chat`, `voice`, `ai`, `friends`, `direct`, `notifications`
3. **Pub-Sub** — module giao tiếp qua Event Bus; sự kiện realtime từ mạng cũng đổ vào cùng bus

---

## 1. Chạy thử

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Ứng dụng luôn nối **backend Nebula** thật (REST + SignalR) — cần chạy backend trước. Xem [mục 4](#4-kết-nối-backend-thật).

Các lệnh khác:

```bash
npm run build        # kiểm tra kiểu + build production
npm test             # 18 unit test (Event Bus, quy tắc domain, ...)
npm run check:arch   # kiểm tra tự động quy tắc Layered + Modular Monolith
```

---

## 2. Use Case → Module

| Use Case | Actor | Module | Tệp chính |
|---|---|---|---|
| UC01 Đăng ký / Đăng nhập | User, Admin | `auth` | `AuthService.ts`, `LoginPage.tsx`, `RegisterPage.tsx` |
| UC02 Tạo / Tham gia Server | User, Admin | `server` | `ServerService.ts`, `CreateServerModal.tsx`, `DiscoverPage.tsx` |
| UC03 Tạo Kênh (Text / Voice) | **Admin** | `server` | `domain/rules.ts` (`permissions`), `CreateChannelModal.tsx` |
| UC04 Gửi / Nhận tin nhắn Text | User | `chat` | `ChatService.send()`, `Composer.tsx`, sự kiện `chat.message.created` |
| UC05 Xem lịch sử tin nhắn | User | `chat` | `ChatService.loadOlder()`, `MessageList.tsx`, `SearchBox.tsx` |
| UC06 Tải lên File / Hình ảnh | User | `chat` | `FileStorage` port, `AttachmentView.tsx`, kéo-thả / dán ảnh |
| UC07 Tham gia / Rời kênh Voice | User | `voice` | `VoiceService.join()/leave()`, `WebRtcMesh.ts`, `VoiceRoomView.tsx` |
| UC08 Bật / Tắt Micro | User | `voice` | `VoiceService.toggleMute()`, `VoiceControls` |
| UC09 Tóm tắt tin nhắn bằng AI | User → **AI Service** | `ai` | `AiService.ts`, `AiGateway` port, `SummaryPanel.tsx` |
| Kết bạn (tìm người, gửi / chấp nhận / từ chối lời mời, hủy kết bạn) | User | `friends` | `FriendService.ts`, `FriendsView.tsx` (chỉ có khi dùng backend thật) |
| Chuột phải vào server: Đánh dấu đã đọc · Mời vào máy chủ · Tắt âm · Cài đặt thông báo · Rời khỏi máy chủ | User | `server` | `ServerContextMenu.tsx`, `ServerService.ts`, `shared/ui/ContextMenu.tsx` |

Quan hệ **Admin kế thừa User** (mũi tên nét đứt trong sơ đồ) được hiện thực bằng vai trò thành viên của server:
người tạo server là `admin`, có mọi quyền của `member` cộng thêm quyền tạo kênh. Quyền được kiểm tra ở **cả** client
(`permissions.canCreateChannel`) **và** server (backend trả lỗi 403).

---

## 3. Kiến trúc

### 3.1 Layered Architecture (bên trong mỗi module)

```
modules/chat/
├── presentation/    React component — chỉ hiển thị & nhận thao tác người dùng
│        │ gọi
├── application/     Service (use case) + Store (Zustand) + Port (interface)
│        │ dùng                     ▲ hiện thực (Dependency Inversion)
├── domain/          Model + quy tắc nghiệp vụ THUẦN (không React, không HTTP)
├── infrastructure/  HttpMessageRepository | WebRTC | Web Audio
├── events.ts        Hợp đồng sự kiện mà module công bố
├── module.ts        Khởi tạo service, tạo adapter HTTP
└── index.ts         PUBLIC API — thứ duy nhất module khác được import
```

Quy tắc phụ thuộc (được `npm run check:arch` kiểm tra tự động):

- `domain` không import tầng nào khác, không dùng React / Zustand / HTTP / realtime.
- `application` không import `presentation` hay `infrastructure` — chỉ làm việc qua **port** (interface).
- `presentation` không import `infrastructure`.

### 3.2 Modular Monolith

```
src/
├── app/            Composition Root: bootstrap.ts (lắp ráp module), router, layout ghép giao diện
├── modules/
│   ├── auth/       UC01
│   ├── server/     UC02, UC03
│   ├── chat/       UC04, UC05, UC06
│   ├── voice/      UC07, UC08
│   ├── ai/         UC09
│   ├── friends/    Bạn bè (danh sách, lời mời, kết bạn bằng tên + ID)
│   ├── direct/     Chat 1-1 giữa bạn bè
│   └── notifications/  Hộp thư thông báo (chuông)
├── shared/         Shared kernel: EventBus, RealtimeHub, HTTP client, UI kit, kiểu UserProfile
```

- Một ứng dụng, một lần build, một tiến trình — nhưng ranh giới module rõ ràng.
- Module khác chỉ được import `@/modules/<tên>` (file `index.ts`), **không** import sâu vào bên trong.
- Giao diện của nhiều module được ghép ở `app/` qua **slot**, ví dụ `ChannelSidebar` (server) nhận
  `renderVoiceExtra` để hiển thị người đang ở kênh thoại (voice), `ChatView` (chat) nhận `headerActions`
  là nút "Tóm tắt AI" (ai). Nhờ vậy `server` và `chat` không hề biết `voice` hay `ai` tồn tại.

### 3.3 Pub-Sub

**Event Bus** có kiểu (`shared/event-bus/EventBus.ts`). Mỗi module tự khai báo sự kiện của mình trong `events.ts`
(TypeScript *declaration merging*), nên shared không phụ thuộc ngược vào module.

| Sự kiện | Publisher | Subscriber |
|---|---|---|
| `auth.loggedIn` / `auth.loggedOut` | auth | bootstrap (kết nối realtime), server, chat, voice, ai |
| `server.listLoaded`, `server.joined` | server | voice (tải trạng thái kênh thoại) |
| `channel.selected` | server | chat (tải lịch sử), voice (tự vào kênh thoại), ai (đóng bản tóm tắt cũ) |
| `channel.created`, `member.joined` | *server (realtime)* | server |
| `chat.message.created` | *server (realtime)* | chat (hiển thị), server (đếm tin chưa đọc) |
| `chat.typing` | chat → realtime | chat ("… đang soạn tin") |
| `voice.participant.joined/left/updated` | *server (realtime)* | voice |
| `voice.signal` | voice → realtime | voice (WebRTC offer / answer / ICE) |
| `ai.summary.requested/completed/failed` | ai | (mở rộng: thông báo, log…) |
| `ui.toast` | mọi module | `Toaster` |

**RealtimeHub** (`shared/realtime/RealtimeHub.ts`) nối Transport mạng với Event Bus theo **topic**:

```
              topic "server:<id>", "voice:<channelId>"
 Backend ──► RealtimeTransport ──► RealtimeHub ──► EventBus ──► các module subscribe
 (SignalR hoặc BroadcastChannel)
```

Ví dụ luồng **UC04 Gửi tin nhắn**:

```
Composer ─► ChatService.send()
              ├─ (UC06) FileStorage.upload() từng tệp, báo tiến độ
              ├─ hiển thị tin "lạc quan" ngay (status: sending)
              └─ MessageRepository.send() ─► Server lưu tin
                                               └─ PUBLISH 'chat.message.created' lên topic server:<id>
   Mọi client subscribe topic ◄────────────────────┘
      ├─ chat   : chèn tin (khử trùng lặp theo id / nonce)
      └─ server : +1 tin chưa đọc nếu đang ở kênh khác
```

---

## 4. Kết nối backend thật

Backend là **Nebula** (`../../Nebula`, ASP.NET Core + MySQL). Chạy theo thứ tự:

```powershell
# 1) Backend (cổng 5000)
cd ..\..\Nebula
docker compose up -d --build
curl http://localhost:5000/health

# 2) Frontend
cd ..\discord_screenshots\frontend
copy .env.example .env      # rồi điền VITE_GOOGLE_CLIENT_ID nếu muốn dùng nút Google
npm install
npm run dev                 # http://localhost:5173
```

Vite dev server **chuyển tiếp** `/api` (REST) và `/hubs` (WebSocket SignalR) sang
`VITE_BACKEND_URL` (mặc định `http://localhost:5000`), nên trình duyệt chỉ nói chuyện với `:5173` — không cần CORS.

**Đăng nhập:** form email + mật khẩu (`/api/auth/login`, `/api/auth/register`) và nút **Tiếp tục với Google**
(`/api/auth/google`, backend tự xác minh ID token). Nút Google chỉ hiện khi có `VITE_GOOGLE_CLIENT_ID`; client ID phải
trùng `GOOGLE_CLIENT_ID` của backend và `http://localhost:5173` phải nằm trong *Authorized JavaScript origins* ở Google Cloud.

### Cách frontend ánh xạ sang API của Nebula

Mỗi module chỉ có MỘT file `Http*` (tầng infrastructure) biết dạng JSON của Nebula; domain/application/UI không đổi.

| Khái niệm frontend | Nebula | Ghi chú |
|---|---|---|
| Server | Server (`/api/servers`) | `isPublic` = `joinPolicy == "Open"`; `inviteCode` có ở mọi server bạn là thành viên |
| Role `owner` / `moderator` / `member` | `Owner` / `Moderator` / `Member` | chỉ chủ server tạo được kênh; chủ server và quản trị viên ghim / xóa tin người khác |
| Tham gia bằng mã mời | `POST /api/servers/join-by-code` | không phân biệt hoa thường; người bị cấm bị chặn |
| Khám phá server | `GET /api/servers/joinable` + `POST /api/servers/{id}/join` | |
| Kênh text / voice | `GET /api/servers/{id}/channels` (category → làm phẳng) | kênh mới tự vào đúng category |
| Lịch sử tin nhắn | `GET /api/conversations/{id}/history?beforeId=&take=` | `hasMore` do server tính |
| Gửi tin / tệp | `POST /api/conversations/{id}/messages`, `POST /api/files` | tệp tải về bằng fetch có token → blob URL |
| Tìm kiếm | `GET /api/search?q=&conversationId=` | |
| Voice | `POST /api/channels/{id}/voice/join|leave`, `PUT .../voice/state` | tín hiệu WebRTC qua hub `VoiceSignal` |
| Tóm tắt AI | `POST /api/ai/summarize` | |

### Realtime (SignalR)

`shared/realtime/SignalRTransport.ts` kết nối `/hubs/chat` với JWT. Nebula **tự đẩy sự kiện tới đúng người liên quan**
(không cần đăng ký topic như Socket.IO). Tên sự kiện của hub được đổi sang tên trên EventBus qua `shared/realtime/wire.ts`;
mỗi module tự đăng ký cách giải mã ở infrastructure của mình (`registerChatWire()`, `registerServerWire()`, `registerVoiceWire()`):

| Hub → client | Sự kiện EventBus |
|---|---|
| `MessageReceived` | `chat.message.created` |
| `Typing` | `chat.typing` |
| `ChannelCreated` | `channel.created` |
| `MemberJoined` / `MemberLeft` | `member.joined` / `member.left` |
| `AddedToServer` | `server.added` |
| `RemovedFromServer`, `ServerDeleted` | `server.removed` |
| `VoiceJoined`, `VoiceUpdated`, `VoiceLeft`, `VoiceSignal` | `voice.participant.joined/updated/left`, `voice.signal` |

| Client → hub | Gửi khi |
|---|---|
| `Typing(conversationId)` | người dùng đang gõ |
| `VoiceSignal({channelId, from, to, data})` | trao đổi offer / answer / ICE của WebRTC |

### Kiểm thử tích hợp với backend thật

```powershell
$env:VITE_NEBULA_TEST_URL="http://localhost:5000"; $env:VITE_API_BASE_URL="http://localhost:5000/api"
npx vitest run src/integration
```

Chạy chính code hạ tầng của frontend (đăng ký → nhóm → kênh → tin nhắn → typing → upload → voice → AI → bị kick) với hai
người dùng và hai kết nối SignalR. Mặc định bị bỏ qua khi không đặt `VITE_NEBULA_TEST_URL`.

---

## 5. Ghi chú & giới hạn

- **Voice** dùng mạng lưới WebRTC P2P (mesh), phù hợp phòng nhỏ (≤ 6–8 người). Phòng lớn nên dùng SFU (mediasoup, LiveKit).
- Tóm tắt AI do backend xử lý qua endpoint `/api/ai/summarize`.
- Nguồn hình ảnh & giấy phép: xem [CREDITS.md](CREDITS.md).

---

## 6. Bạn bè, mời vào server, tắt âm — dùng thế nào

- **Bạn bè:** thanh bên trái có nút **Bạn bè** (huy hiệu = số lời mời chờ bạn trả lời). Tab *Tất cả* · *Đang chờ* · *Thêm bạn*
  (tìm theo tên hoặc email → **Kết bạn**). Người kia nhận thông báo realtime và chấp nhận ở tab *Đang chờ*.
- **Chuột phải vào icon server** (thanh trái; hoặc vào banner tên server ở thanh kênh):

  | Mục | Làm gì |
  |---|---|
  | Đánh dấu đã đọc | xóa số chưa đọc của mọi kênh trong server, đồng thời lưu mốc đã đọc lên backend |
  | Mời vào máy chủ | chọn bạn bè bấm **Mời** (họ nhận lời mời ở Trang chủ và tự đồng ý), hoặc gửi mã mời |
  | Tắt âm máy chủ ▸ | 15 phút · 1 giờ · 3 giờ · 8 giờ · 24 giờ · cho đến khi bật lại (icon server mờ đi, có dấu tắt chuông) |
  | Cài đặt thông báo ▸ | Tất cả tin nhắn · Chỉ @mentions · Không có gì |
  | Rời khỏi máy chủ | có hộp xác nhận; chủ server phải giao quyền trước nên chỉ thấy lời giải thích |

  Cài đặt tắt âm / thông báo được **lưu theo tài khoản trên backend** (`noti_server_settings`) nên đổi thiết bị vẫn còn.
  Backend dùng chúng khi tạo thông báo @nhắc tên; frontend dùng chúng để quyết định có đếm "chưa đọc" hay không
  (tắt âm vẫn đếm khi bạn được @nhắc tên, giống Discord).

---

## 7. Tên + ID, chat 1-1, Cài đặt người dùng

- **ID công khai:** mỗi tài khoản có một **ID 4 chữ số từ 0000 đến 9999** (như Discord: `Nguyễn An#0042`), cấp tự động khi tạo tài khoản.
  ID chỉ cần khác nhau giữa những người **cùng tên hiển thị**, nên hai người trùng tên vẫn phân biệt được. Đổi tên hiển thị thì ID được giữ
  nếu chưa ai cùng tên mới dùng ID đó (nếu trùng, hệ thống cấp ID mới — xem ở Cài đặt). Rê chuột lên ảnh đại diện / tên của mình ở góc dưới
  bên trái để thấy **Tên và ID** (bấm để chép ID); cũng có trong **Cài đặt → Tài khoản của tôi** và ở tab *Thêm bạn*.
- **Kết bạn bằng tên + ID:** tab *Bạn bè → Thêm bạn* có 2 ô — *Tên hiển thị* và *ID (0–9999)*. Phải đúng **cả hai** (tên không phân biệt hoa/thường;
  ID gõ `42` hay `#0042` đều hiểu là 0042); không có ô tìm kiếm nên người lạ không dò ra ai được. Sai một trong hai đều báo cùng một lỗi
  (backend cố ý không cho biết "ID này có tồn tại").
- **Chat 1-1:** ở tab *Tất cả* của Bạn bè bấm **Nhắn tin** (hoặc chọn trong mục *Tin nhắn trực tiếp* ở thanh bên Trang chủ).
  Chỉ bạn bè mới bắt đầu được; hủy kết bạn thì vẫn xem lại được lịch sử nhưng ô soạn tin thay bằng lời giải thích.
  Tin mới, "đang gõ", chưa đọc đều realtime; chấm đỏ cạnh người có tin chưa đọc.
- **Cài đặt người dùng** (bánh răng cạnh tên, hoặc `/app/settings`):
  - *Tài khoản của tôi*: tên, ID (nút Chép), email, **đổi mật khẩu** (hỏi mật khẩu hiện tại; tài khoản Google chưa có mật khẩu thì thành "Đặt mật khẩu").
  - *Hồ sơ*: **ảnh đại diện** (chọn ảnh có sẵn hoặc tải ảnh lên), **tên hiển thị**, giới thiệu; nút Lưu chỉ sáng khi có thay đổi.
  - Đổi tên / ảnh áp dụng ngay cho bạn; người khác thấy bản mới khi tải lại trang (chưa đẩy realtime).

---

## 8. Realtime, thông báo, sửa / xóa / ghim / cảm xúc

**"Realtime" ở đây hoạt động thế nào:** frontend mở MỘT kết nối SignalR (`/hubs/chat`) ngay khi đăng nhập. Backend đẩy sự kiện xuống đúng
những người liên quan; `shared/realtime/wire.ts` đổi tên sự kiện của backend sang tên trên EventBus; module nào quan tâm thì `subscribe`.
Thêm một sự kiện realtime mới = (1) backend gọi `IRealtimeGateway.PushToUsersAsync(..., "TênSựKiện", payload)`; (2) module trong frontend gọi
`wire.onServerEvent('TênSựKiện', 'tên.trên.bus', decode)` ở tầng infrastructure; (3) `bus.subscribe` ở nơi cần phản ứng.

Hiện đã realtime: tin nhắn mới · đang gõ · **sửa / xóa / ghim / cảm xúc** · **đổi tên / ảnh đại diện** · **online / offline của bạn bè** ·
kênh & thành viên mới · lời mời kết bạn · lời mời vào server · **thông báo mới** · kênh thoại (vào/ra/mic + tín hiệu WebRTC).

- **Thông báo (chuông):** nút *Thông báo* ở thanh trái (huy hiệu = số chưa đọc). Danh sách mới → cũ, gom theo ngày, lọc *Chưa đọc*,
  *Đánh dấu tất cả đã đọc*, *Xem thêm*. Bấm một thông báo → mở đúng nơi (chat 1-1, kênh có tin nhắc tên, Bạn bè, Trang chủ để trả lời lời mời…).
  Mở đúng kênh / chat 1-1 đó thì thông báo của nó tự được đánh dấu đã đọc. Chỉ **được @nhắc tên** mới bật toast.
- **Rê chuột lên tin nhắn** → thanh thao tác:
  - 😀 **Thả cảm xúc** (8 cảm xúc nhanh); bấm lại chip của mình để gỡ. Hiện ngay, lỗi thì hoàn tác.
  - ✏️ **Sửa** (chỉ tin của mình): Enter lưu, Shift+Enter xuống dòng, Esc hủy; tin có nhãn "(đã chỉnh sửa)".
  - 📌 **Ghim / bỏ ghim**: chủ server trong server; cả hai người trong chat 1-1. Nút 📌 trên thanh tiêu đề mở danh sách *Tin đã ghim* → "Đi tới tin nhắn".
  - 🗑️ **Xóa** (có hộp xác nhận): xóa tin của mình; chủ server xóa được tin của người khác. Tin đã xóa hiện "Tin nhắn đã bị xóa".
