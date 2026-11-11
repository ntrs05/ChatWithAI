# Nebula — Frontend (KHUNG)

Khung đã có cấu hình Vite + TypeScript + Tailwind, phần dùng chung `src/shared/` (HTTP, event bus, SignalR, UI),
router đủ đường dẫn và **9 module còn trống**, mỗi module đủ 4 tầng. Trang nào chưa làm thì hiện tạm một ô "Chưa làm giao diện".
Mỗi người nhận một module, tìm `TODO` trong thư mục của mình rồi viết tiếp. Tên file và tên export đã thống nhất rồi nên giữ nguyên nhé.

## Cấu trúc

```
src/
├─ main.tsx, index.css
├─ app/                    composition root: bootstrap.ts (gọi init của 9 module), App.tsx (router), layouts/, pages/
├─ shared/                 thư viện nền (ĐÃ VIẾT): http/, event-bus/, realtime/, ui/, lib/, config.ts
└─ modules/<module>/
   ├─ index.ts             PUBLIC API — module khác chỉ import từ đây
   ├─ module.ts            initXxxModule(deps): lắp repository → service
   ├─ events.ts            khai báo sự kiện của module trên event bus
   ├─ domain/              kiểu dữ liệu + luật nghiệp vụ thuần (không React, không HTTP)
   ├─ application/         service, store (Zustand), ports.ts (interface cổng)
   ├─ infrastructure/      gọi REST / SignalR / LiveKit, cài ports
   └─ presentation/        component React
```

## Phân công module

| Module | Use case | Người phụ trách | Component đã có vỏ |
|---|---|---|---|
| `auth` | UC01, UC02, UC03 | TV-Auth | AuthLayout, GoogleSignIn, IdentityHover, IdentityBadge, LoginPage, PasswordInput, RegisterPage, SettingsPage, UserPanel |
| `server` | UC05, UC15, UC16, UC18 | TV-Server | ChannelAccessModal, ChannelSidebar, CreateChannelModal, CreateServerModal, DiscoverPage, HomeView, InvitationsPanel, InviteModal, LeaveServerModal, MemberList, ServerContextMenu, ServerMenuLayer, ServerRail |
| `chat` | UC07, UC08, UC09, UC10, UC17 | TV-Chat | AttachmentView, ChatView, Composer, MessageContent, MessageItem, MessageList, PinnedButton, SearchBox, TypingIndicator |
| `direct` | UC07 (1-1), UC11 | TV-Direct | DirectList, DirectPage, MessageButton |
| `friends` | UC04 | TV-Friends | FriendPicker, FriendsView |
| `notifications` | UC06 | TV-Notifications | NotificationsView |
| `voice` | UC12 | TV-Voice | VoiceRoomView, VoiceSettingsPanel, VoiceChannelParticipants, VoiceControls, VoiceStatusPanel, VoiceAudioSink |
| `ai` | UC13, UC14 | TV-Ai | SummarizeButton, SummaryPanel |
| `admin` | UC19, UC20, UC21, UC22 | TV-Admin | AdminPage, AuditTab, ServersTab, UsersTab |

Thay `TV-...` bằng tên thành viên thật.

## Quy tắc (kiểm tra tự động: `npm run check:arch`)

1. Module A chỉ import module B qua `@/modules/B` (public API), không import sâu.
2. `shared/` không phụ thuộc `modules/` hay `app/`; `modules/` không phụ thuộc `app/`.
3. `domain/` không import React/Zustand/HTTP; `application/` không import `presentation/`/`infrastructure/`;
   `presentation/` không import `infrastructure/`.
4. Mỗi module làm trên nhánh `feature/fe-<module>`, mở Pull Request vào `develop`.

## Chạy

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173 — xem khung các trang
npm run build        # kiểm tra kiểu + build
npm test
npm run check:arch
```
