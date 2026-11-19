# Nebula: backend ứng dụng chat kiểu Discord (.NET 10, MySQL, SignalR, Docker)

Kiến trúc: **Modular Monolith**, mỗi module chia **Layered** (Domain / Application / Infrastructure / Api),
các module nói chuyện với nhau bằng **Pub-Sub** (event).

## Mô hình phân quyền (giống Discord)

```
ADMIN HỆ THỐNG (email trong ADMIN_EMAILS): khóa/mở tài khoản, đặt hạn mức dung lượng,
 │   bật/tắt quyền tạo server, xóa server vi phạm, xem nhật ký hoạt động.
 │   KHÔNG đọc được tin nhắn và không phải thành viên của server.
 │
 └── Mỗi SERVER do người dùng tự tạo ── Chủ server (Owner) · Quản trị viên (Moderator) · Thành viên (Member)
```

| Quyền | Admin hệ thống | Chủ server | Quản trị viên | Thành viên |
|---|:-:|:-:|:-:|:-:|
| Khóa tài khoản, cài đặt hệ thống, hạn mức, xem nhật ký | ✅ | | | |
| Xóa server vi phạm | ✅ | | | |
| Thêm/xóa/cấm thành viên, duyệt yêu cầu vào server | | ✅ | ✅ (chỉ thành viên thường) | |
| Phong/hạ quản trị viên, chuyển quyền chủ server, sửa thông tin server, xóa server | | ✅ | | |
| Tạo/sửa/xóa kênh, category | | ✅ | | |
| Xóa tin người khác, ghim tin | | ✅ | ✅ | |
| Đọc/gửi tin trong kênh | | ✅ | ✅ | ✅ |

Mọi server và chat 1-1 đều riêng tư: admin hệ thống **không đọc được tin**. Chủ server phải chuyển quyền trước khi rời server.

## Cấu trúc

```
Nebula/
├── .env / .env.example     # mật khẩu, khóa bí mật (.env KHÔNG commit)
├── docker-compose.yml      # MySQL + API
├── src/
│   ├── Host/Nebula.Api                  # điểm chạy duy nhất: đọc .env, lắp ráp module
│   ├── BuildingBlocks/                 # Kernel (Entity, Result) · Contracts (event + interface) · Infrastructure (event bus, .env, MySQL)
│   └── Modules/
│       ├── Identity       # người dùng, Google login, admin hệ thống khóa tài khoản
│       ├── Organization   # server, chủ server/quản trị viên, mời / xin vào server, cài đặt hệ thống
│       ├── Messaging      # category, kênh, chat 1-1, tin nhắn, ghim, tìm kiếm, realtime
│       ├── Notifications  # hộp thư thông báo, cài đặt thông báo
│       ├── Media          # file, hạn mức dung lượng
│       ├── Friends        # kết bạn: lời mời, danh sách bạn (nói chuyện với module khác qua event)
│       ├── Audit          # nhật ký hoạt động (chỉ nghe event)
│       └── Ai             # tóm tắt tin nhắn bằng Google Gemini (không có DB, hỏi Messaging qua IMessagingApi)
```

## Database (24 bảng, MySQL `nebula`)

```
IDENTITY        identity_users (UserCode = ID công khai 4 chữ số 0000–9999; UNIQUE theo cặp (DisplayName, UserCode) — như Discord "Tên#0042") 1──1 identity_user_settings

ORGANIZATION    org_servers 1──N org_server_members     (Role: Owner / Moderator / Member)
                           1──N org_server_bans
                           1──N org_join_requests     (Invite / Request · Pending / Accepted / Rejected / Cancelled)
                org_settings                          (cài đặt hệ thống, khóa–giá trị)

MESSAGING       msg_categories 1──N msg_conversations (Direct = chat 1-1 / Channel = kênh server)
                msg_conversations 1──N msg_conversation_members (đã đọc tới đâu, archive, xóa phía mình)
                                  1──N msg_messages ──1──N msg_message_mentions / msg_message_reactions / msg_message_attachments
                                  1──N msg_pinned_messages (ai ghim, lúc nào)
                                  1──N msg_channel_members (danh sách người vào được KÊNH RIÊNG TƯ)

NOTIFICATIONS   noti_preferences · noti_conversation_settings (All / MentionsOnly / Nothing + tạm tắt tiếng) · noti_server_settings (như trên nhưng cho CẢ server) · noti_notifications
FRIENDS         friends_friendships (mỗi cặp đúng 1 dòng: khóa "idNhỏ:idLớn" UNIQUE; Pending / Accepted)
MEDIA           media_files · media_quotas (hạn mức riêng từng người)
AUDIT           audit_logs (Detail kiểu JSON)
```

- **Khóa ngoại + CASCADE** cho mọi quan hệ **trong cùng module** (xóa server → xóa thành viên; xóa kênh → xóa tin, ghim, reaction...).
- **Giữa các module** (`UserId`, `ServerId`, `FileId`) chỉ lưu Guid, không FK, để giữ ranh giới module.
- Mỗi module có DbContext và migration riêng; bảng phân biệt bằng tiền tố `identity_`, `org_`, `msg_`, `noti_`, `media_`, `audit_`.

## Chạy

**Cần cài:** Docker Desktop (Windows cần WSL: `wsl --install --no-distribution`). Muốn chạy test / tạo migration thì cài thêm .NET 10 SDK.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Điền mật khẩu, JWT_KEY và ADMIN_EMAILS trong .env trước khi chạy.
docker compose up -d --build
curl http://localhost:5000/health
```

Chạy các lệnh backend trong thư mục `backend` của repository. Database được khởi tạo ở lần chạy đầu; migration tự chạy khi API ở môi trường `Development` (mặc định trong Compose). Với `Production`, cần áp dụng migration trước khi phục vụ yêu cầu.

Đổi mật khẩu trong `.env` không tự đổi mật khẩu tài khoản MySQL đã tồn tại. Với dữ liệu cần giữ, đổi mật khẩu tài khoản trong MySQL rồi cập nhật `.env` và tạo lại container API. Chỉ dùng `docker compose down -v` để khởi tạo lại môi trường có thể xóa bỏ; lệnh này xóa cả volume database và file tải lên. Sao lưu trước khi thao tác.

| Lệnh | Tác dụng |
|---|---|
| `docker compose logs -f api` | Xem log API |
| `docker compose stop` / `start` | Tắt / bật (giữ dữ liệu) |
| `docker compose up -d --build` | Chạy lại sau khi sửa code |
| `docker compose down -v` | Xóa sạch dữ liệu |

Xem DB bằng DBeaver: `localhost:3307`, user `nebula`, mật khẩu `MYSQL_PASSWORD`.

## Nối với frontend

Frontend nằm ở `../frontend` (React + Vite). Chạy backend như trên (cổng 5000), rồi:

```powershell
cd ..\frontend
npm install
npm run dev        # http://localhost:5173 — Vite chuyển tiếp /api và /hubs sang backend, không cần cấu hình CORS
```

Nút **Tiếp tục với Google** cần `VITE_GOOGLE_CLIENT_ID` trong `frontend/.env` (cùng giá trị `GOOGLE_CLIENT_ID` của backend), và phải thêm `http://localhost:5173` vào *Authorized JavaScript origins* trên Google Cloud.

## API

| Server | Endpoint |
|---|---|
| Đăng nhập | `POST /api/auth/register` · `POST /api/auth/login` (email + mật khẩu, băm PBKDF2) · `POST /api/auth/google` (ID token của Google) |
| Hồ sơ của mình | `GET/PUT /api/users/me` (kèm `userCode` = **ID công khai 4 chữ số 0000–9999**, cấp tự động khi đăng ký / đăng nhập Google — tài khoản cũ thiếu ID được cấp bù khi đăng nhập hoặc mở app; `hasPassword`), `PUT /api/users/me/password` (`{currentPassword, newPassword}`; tài khoản Google chưa có mật khẩu thì bỏ trống `currentPassword` để đặt lần đầu), `PUT /api/users/me/status`, `PUT /api/users/me/settings` |
| Người khác | `GET /api/users/{id}`, `GET /api/users/search?q=` |
| **Server** | `POST /api/servers` (`joinPolicy`: `InviteOnly` / `RequestToJoin` / `Open`), `GET /api/servers` (server của tôi, kèm `inviteCode`), `GET /api/servers/joinable` (trang Khám phá), `GET/PUT/DELETE /api/servers/{id}`, `POST /api/servers/{id}/leave` |
| Vào server | `POST /api/servers/join-by-code` (`{code}`) · `POST /api/servers/{id}/join` (server `Open`) · `GET /api/servers/{id}/members` (kèm tên, avatar, trạng thái, role) |
| Thành viên | `POST /api/servers/{id}/members`, `DELETE /api/servers/{id}/members/{userId}`, `PUT .../members/{userId}/role` (Moderator/Member), `PUT /api/servers/{id}/owner` (chuyển quyền chủ server) |
| Cấm | `GET/POST /api/servers/{id}/bans`, `DELETE /api/servers/{id}/bans/{userId}` |
| Bạn bè | `GET /api/friends` · `GET /api/friends/requests` (`incoming` / `outgoing`) · `POST /api/friends/requests` (`{userId}`; người kia đã mời mình trước thì tự thành bạn) · `POST /api/friends/requests/{id}/accept` · `DELETE /api/friends/requests/{id}` (từ chối / hủy lời mời) · `DELETE /api/friends/{userId}` (hủy kết bạn). **Kết bạn phải biết cả TÊN lẫn ID:** `POST /api/friends/requests/by-tag` (`{displayName, userCode}`; sai tên hoặc sai ID đều trả CÙNG một lỗi nên không dò được người dùng). `GET /api/users/search` chỉ dành cho admin hệ thống |
| Mời / xin vào | `GET /api/join-requests/invitations` (lời mời vào server gửi cho mình, kèm tên server + người mời), **mọi thành viên** đều `POST /api/servers/{id}/invites` được (người được mời tự đồng ý), `POST /api/servers/{id}/join-requests`, `GET /api/servers/{id}/join-requests`, `GET /api/join-requests/mine`, `POST /api/join-requests/{id}/respond` (`accept`), `POST /api/join-requests/{id}/cancel` |
| Kênh | `GET /api/servers/{id}/channels`, `POST /api/servers/{id}/categories`, `DELETE /api/categories/{id}`, `POST /api/servers/{id}/channels` (`isPrivate`, `memberIds`), `PUT/DELETE /api/channels/{id}`. **Kênh riêng tư** (chủ server / quản trị viên quản lý): `GET/POST /api/channels/{id}/members`, `DELETE /api/channels/{id}/members/{userId}`; người không có tên trong danh sách không thấy kênh và không đọc được tin (chủ server luôn vào được) |
| Chat 1-1 | **chỉ giữa bạn bè**: `POST/GET /api/direct` (mỗi dòng kèm `other` = tên + avatar người kia, `isFriend`; hủy kết bạn thì vẫn đọc được lịch sử nhưng không nhắn thêm được), `PUT /api/direct/{id}/archive`, `DELETE /api/direct/{id}` |
| Tin nhắn | `GET /api/conversations/{id}/history?beforeId=&take=` (tin xếp cũ → mới + `hasMore`, mỗi tin kèm `author`), `GET/POST /api/conversations/{id}/messages`, `GET /api/conversations/{id}/pins`, `PUT /api/conversations/{id}/read`, `GET/PUT/DELETE /api/messages/{id}`, `PUT/DELETE /api/messages/{id}/pin`, `POST /api/messages/{id}/reactions` |
| Tìm kiếm | `GET /api/search?q=&senderId=&conversationId=&from=&to=` |
| Kênh thoại | `GET /api/servers/{id}/voice-states` · `POST /api/channels/{id}/voice/join` · `POST .../voice/leave` · `PUT .../voice/state` (tín hiệu WebRTC đi qua hub: `VoiceSignal`) · `POST .../voice/token` (`{clientId}`) → `{url, token}` vé vào máy chủ SFU LiveKit, trả 404 `Voice.SfuDisabled` nếu chưa bật |
| Bot `@nebula` | Không có endpoint riêng: gõ `@nebula tóm tắt ...` đầu tin trong kênh server → tin gửi bình thường, module Ai nghe `MessageSent`, tóm tắt nền rồi đăng câu trả lời công khai dưới tên **Nebula** (danh tính cố định `BotIdentity`, không có trong bảng người dùng) |
| AI | `POST /api/ai/summarize` (`{channelId, mode: "auto"|"count"|"since", limit?, sinceMinutes?, prompt?}`) |
| Thông báo | `GET /api/notifications?skip=&take=` (mỗi mục kèm `actor` = tên + ảnh người gây ra), `NotificationReceived` đẩy realtime khi có mục mới, `GET .../unread-count`, `PUT .../{id}/read`, `PUT .../read-all`, `GET/PUT .../preferences`, `GET/PUT/DELETE .../conversations/{id}`; **theo server** (chuột phải vào server): `GET .../servers`, `PUT/DELETE .../servers/{serverId}` (`{level: All|MentionsOnly|Nothing, mutedUntil}`) |
| Ảnh đại diện | `POST /api/avatars` (multipart `file`; PNG/JPEG/WebP/GIF ≤ 20 MB, kiểm tra cả nội dung thật) → `{url}`; `GET /api/avatars/{id}` **công khai** (chỉ phục vụ file trong thư mục `avatars/`, file chat riêng tư không lộ) |
| File | `POST /api/files` (multipart `file`), `GET /api/files`, `GET /api/files/quota`, `GET/DELETE /api/files/{id}` |
| **Admin hệ thống** | `GET /api/admin/users`, `POST /api/admin/users/{id}/lock` · `/unlock`, `GET/PUT /api/admin/users/{id}/quota`, `GET /api/admin/servers`, `GET /api/admin/settings`, `PUT /api/admin/settings/{key}`, `GET /api/admin/audit-logs` |
| Realtime | SignalR `/hubs/chat?access_token=...` · nhận: `MessageReceived` (kèm tin đầy đủ), `MessageChanged` (kèm tin đã cập nhật: sửa / xóa / ghim / cảm xúc), `ProfileChanged` (ai đó đổi tên / ảnh), `StatusChanged` (online / offline), `Typing`, `StatusChanged`, `NotificationReceived`, `AddedToServer`, `RemovedFromServer`, `ServerDeleted`, `ChannelCreated`, `MemberJoined`, `MemberLeft`, `FriendRequestReceived`, `FriendRequestSent`, `FriendAdded`, `FriendRemoved`, `VoiceJoined`, `VoiceLeft`, `VoiceUpdated`, `VoiceSignal` · gọi: `Typing(conversationId)`, `VoiceSignal({channelId, from, to, data})` |

Quy ước JSON: enum là chữ (`"Open"`, `"Text"`), thời gian luôn UTC có đuôi `Z`, lỗi theo ProblemDetails (`title` = mã lỗi, `detail` = thông báo hiển thị).

## Bot `@nebula` trong khung chat

1. Người dùng gửi tin bắt đầu bằng `@nebula` (VD `@nebula tóm tắt 2 giờ qua`). Messaging lưu và phát `MessageSent` như mọi tin.
2. `BotMentionHandler` (module Ai) nghe `MessageSent`, thấy lệnh thì bỏ vào `BotQueue` rồi trả về ngay (không làm chậm event bus).
3. `BotWorker` (BackgroundService) lấy việc, gọi `SummaryService` với quyền của **người gọi** (không đọc được kênh thì bot cũng không tóm tắt), rồi gọi `IMessagingApi.PostAsBotAsync`.
4. Messaging lưu tin của bot (trả lời vào tin lệnh) và phát `MessageSent` → mọi người trong kênh thấy ngay. Tin của bot và câu lệnh không bị đưa vào nội dung tóm tắt.

Bot chỉ hoạt động trong kênh server (chat 1-1 bị bỏ qua). Cần `GEMINI_API_KEY`; thiếu khóa thì bot đăng lời báo lỗi.

## Cuộc gọi nhóm (SFU LiveKit, tùy chọn)

- Mặc định: mesh WebRTC (mỗi cặp một kết nối) — ổn đến khoảng 6 người.
- Phòng đông: điền `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (≥ 32 ký tự) trong `.env` rồi `docker compose --profile sfu up -d`.
  Trình duyệt gọi `POST /api/channels/{id}/voice/token`, nhận vé JWT (HS256) và nối thẳng vào LiveKit; mỗi người chỉ gửi một luồng lên server.
- Chưa bật hoặc nối lỗi thì frontend tự dùng lại mesh. Khi chạy thật phải đặt `LIVEKIT_URL` dạng `wss://` (HTTPS), mở cổng UDP 50000–50100.

## Kiểm thử

    dotnet test tests/Nebula.Tests

Xem `tests/README.md`. Project kiểm thử nằm ngoài `src/` nên Dockerfile không build nó. Hiện project này chỉ có hai bài kiểm thử Kernel; kết quả đạt không thay thế kiểm thử tích hợp API, MySQL, Google, Gemini hoặc cuộc gọi.

## Sửa cấu trúc bảng

```powershell
dotnet tool restore
dotnet ef migrations add TenThayDoi -c OrganizationDbContext -p src/Modules/Organization/Nebula.Organization -s src/Host/Nebula.Api -o Infrastructure/Migrations
```

Thay tên module/DbContext tương ứng (`Identity`, `Organization`, `Messaging`, `Notifications`, `Media`, `Audit`).
