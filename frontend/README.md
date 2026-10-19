# Nebula — Frontend Hệ thống Chat & Voice

Frontend cho đồ án **Hệ thống Chat & Voice** (lấy cảm hứng từ Discord nhưng có thương hiệu, bảng màu, logo và hình ảnh riêng).
Xây dựng bằng **React 18 + TypeScript + Vite + Tailwind CSS + Zustand**, áp dụng 3 mẫu kiến trúc:

1. **Layered Architecture** — mỗi module chia tầng Presentation / Application / Domain / Infrastructure
2. **Modular Monolith** — 5 module độc lập trong một ứng dụng: `auth`, `server`, `chat`, `voice`, `ai`
3. **Pub-Sub** — module giao tiếp qua Event Bus; sự kiện realtime từ mạng cũng đổ vào cùng bus

---

## 1. Chạy thử

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Mặc định ứng dụng chạy ở **chế độ mock**: có sẵn một "backend giả lập" ngay trong trình duyệt
(localStorage + IndexedDB + BroadcastChannel), nên **không cần server** vẫn dùng được đầy đủ 9 use case.

| Tài khoản demo | Mật khẩu | Vai trò |
|---|---|---|
| `admin@nebula.vn` | `123456` | **Admin** — chủ server "Lớp Kiến trúc Phần mềm", được tạo kênh |
| `user@nebula.vn`  | `123456` | **User** — thành viên thường |

> **Thử realtime:** mở 2 tab cùng trình duyệt, đăng nhập 2 tài khoản khác nhau (mỗi tab giữ phiên riêng),
> vào cùng kênh `#thảo-luận` để chat, hoặc cùng vào kênh thoại `Phòng học nhóm` để gọi thoại WebRTC.

Các lệnh khác:

```bash
npm run build        # kiểm tra kiểu + build production
npm test             # 18 unit test (Event Bus, quy tắc domain, bộ tóm tắt AI)
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

Quan hệ **Admin kế thừa User** (mũi tên nét đứt trong sơ đồ) được hiện thực bằng vai trò thành viên của server:
người tạo server là `admin`, có mọi quyền của `member` cộng thêm quyền tạo kênh. Quyền được kiểm tra ở **cả** client
(`permissions.canCreateChannel`) **và** server (mock repository trả lỗi 403).

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
├── infrastructure/  MockMessageRepository | HttpMessageRepository | WebRTC | Web Audio
├── events.ts        Hợp đồng sự kiện mà module công bố
├── module.ts        Khởi tạo service, chọn adapter (mock / http)
└── index.ts         PUBLIC API — thứ duy nhất module khác được import
```

Quy tắc phụ thuộc (được `npm run check:arch` kiểm tra tự động):

- `domain` không import tầng nào khác, không dùng React / Zustand / HTTP / realtime.
- `application` không import `presentation` hay `infrastructure` — chỉ làm việc qua **port** (interface).
- `presentation` không import `infrastructure`.
- Đổi từ backend giả sang backend thật chỉ cần đổi `VITE_API_MODE=http`; tầng trên không đổi một dòng.

### 3.2 Modular Monolith

```
src/
├── app/            Composition Root: bootstrap.ts (lắp ráp module), router, layout ghép giao diện
├── modules/
│   ├── auth/       UC01
│   ├── server/     UC02, UC03
│   ├── chat/       UC04, UC05, UC06
│   ├── voice/      UC07, UC08
│   └── ai/         UC09
├── shared/         Shared kernel: EventBus, RealtimeHub, HTTP client, UI kit, kiểu UserProfile
└── mock-backend/   "Server" giả lập (CSDL localStorage, file IndexedDB, realtime BroadcastChannel)
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
 (Socket.IO hoặc BroadcastChannel)
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

Đặt `VITE_API_MODE=http` trong `.env` (xem `.env.example`). Vite dev server proxy `/api` và `/socket.io` sang `http://localhost:4000`.

**REST API** (header `Authorization: Bearer <token>`):

| Method | Đường dẫn | Body → Kết quả |
|---|---|---|
| POST | `/api/auth/register` | `{email, password, displayName, avatarUrl}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/api/auth/me` | → `user` |
| POST | `/api/auth/logout` | → 204 |
| GET | `/api/servers` · `/api/servers/public` | → `Server[]` |
| POST | `/api/servers` | `{name, iconUrl, description, isPublic}` → `Server` (người tạo = admin) |
| POST | `/api/servers/join` · `/api/servers/:id/join` | `{inviteCode}` → `Server` |
| GET | `/api/servers/:id/channels` · `/members` · `/voice-states` | → `Channel[]` · `Member[]` · `VoiceParticipant[]` |
| POST | `/api/servers/:id/channels` | `{name, type, topic}` → `Channel` (**403 nếu không phải admin**) |
| GET | `/api/channels/:id/messages?before=&limit=` | → `{messages, hasMore}` |
| GET | `/api/channels/:id/messages/search?q=` | → `Message[]` |
| POST | `/api/channels/:id/messages` | `{content, attachmentIds, nonce}` → `Message` |
| POST | `/api/uploads` (multipart, field `file`) | → `Attachment` |
| POST | `/api/voice/:channelId/join` · `/leave` | `{clientId, muted, deafened}` |
| PATCH | `/api/voice/:channelId/state` | `{clientId, muted, deafened}` |
| POST | `/api/ai/summarize` | `{channelId, limit}` → `Summary` (backend gọi LLM, giữ API key ở server) |

**Socket.IO**: kết nối với `auth: { token }`.
Client gửi `subscribe(topic)`, `unsubscribe(topic)`, `publish({topic, type, payload})`;
server đẩy `event({topic, type, payload})` với `type` là tên sự kiện trong bảng ở mục 3.3.

---

## 5. Ghi chú & giới hạn

- **Chế độ mock** lưu dữ liệu trong trình duyệt. Để làm lại từ đầu: DevTools → Application → Clear site data.
- **Voice** dùng mạng lưới WebRTC P2P (mesh), phù hợp phòng nhỏ (≤ 6–8 người). Phòng lớn nên dùng SFU (mediasoup, LiveKit).
- **AI ở chế độ mock** là bộ tóm tắt trích xuất chạy cục bộ (`localSummarizer.ts`), mô phỏng tác nhân "AI Service".
  Khi có backend, endpoint `/api/ai/summarize` nên gọi mô hình ngôn ngữ lớn ở phía server.
- Nguồn hình ảnh & giấy phép: xem [CREDITS.md](CREDITS.md).
