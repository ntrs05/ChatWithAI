# Nebula — Backend (KHUNG)

Khung đã dựng sẵn solution, thư viện dùng chung, Host và **8 module còn trống**. Mỗi người nhận một module,
tìm `TODO` trong thư mục của mình rồi viết tiếp. Tên file, tên lớp, namespace đã thống nhất rồi nên giữ nguyên nhé.

## Cấu trúc

```
backend/
├─ Nebula.sln
├─ src/
│  ├─ BuildingBlocks/            thư viện nền (ĐÃ VIẾT, dùng chung — sửa phải báo leader)
│  │  ├─ Nebula.Shared.Kernel           Result, Error, Entity, IUnitOfWork
│  │  ├─ Nebula.Shared.Contracts        hợp đồng giữa các module: IIdentityApi, IOrganizationApi, IMessagingApi,
│  │  │                                 IMediaApi, IFriendsApi, IRealtimeGateway + sự kiện tích hợp
│  │  └─ Nebula.Shared.Infrastructure   event bus trong tiến trình, AddModuleDbContext, HttpExtensions, DotEnv
│  ├─ Host/Nebula.Api            Program.cs: đọc .env, JWT, CORS, SignalR, gọi Add<Module>Module + Endpoints()
│  └─ Modules/<Module>/Nebula.<Module>/
│     ├─ <Module>Module.cs       cửa duy nhất với Host (đăng ký DI + route)
│     ├─ Api/                    route HTTP, hub, request DTO
│     ├─ Application/            use case, interface cổng (repository...), DTO
│     ├─ Domain/                 entity + luật nghiệp vụ (thuần C#)
│     └─ Infrastructure/         DbContext, repository EF Core, Migrations/
└─ tests/Nebula.Tests            xUnit, không cần MySQL
```

## Phân công module

| Module | Thư mục | Use case | Người phụ trách | Ghi chú |
|---|---|---|---|---|
| Ai | `src/Modules/Ai/Nebula.Ai` | UC13, UC14 | TV-Ai | 4 file vỏ |
| Audit | `src/Modules/Audit/Nebula.Audit` | UC22 | TV-Audit | 4 file vỏ |
| Friends | `src/Modules/Friends/Nebula.Friends` | UC04 | TV-Friends | 7 file vỏ |
| Identity | `src/Modules/Identity/Nebula.Identity` | UC01, UC02, UC03, UC19 | TV-Identity | 12 file vỏ |
| Media | `src/Modules/Media/Nebula.Media` | UC09, UC20 (hạn mức) | TV-Media | 4 file vỏ |
| Messaging | `src/Modules/Messaging/Nebula.Messaging` | UC07, UC08, UC10, UC11, UC12, UC16 (kênh), UC17 | TV-Messaging | 17 file vỏ |
| Notifications | `src/Modules/Notifications/Nebula.Notifications` | UC06 | TV-Notifications | 6 file vỏ |
| Organization | `src/Modules/Organization/Nebula.Organization` | UC05, UC15, UC16, UC18, UC20, UC21 | TV-Organization | 11 file vỏ |

Thay `TV-...` bằng tên thành viên thật.

## Quy tắc

1. Module **chỉ** tham chiếu BuildingBlocks, không tham chiếu module khác. Cần dữ liệu module khác thì gọi interface trong
   `Nebula.Shared.Contracts` (ví dụ `IIdentityApi`) hoặc nghe sự kiện qua event bus.
2. Bảng MySQL đặt tiền tố theo module: `identity_`, `org_`, `msg_`, `media_`, `friends_`, `noti_`, `audit_`.
   Mỗi module có DbContext và migration riêng (`__ef_history_<module>`).
3. Lỗi nghiệp vụ trả `Result` / `Error`, không ném exception; route đổi sang HTTP bằng `.ToHttp()`.
4. Mỗi module làm trên nhánh riêng `feature/<module>`, mở Pull Request vào `develop`, cần 1 người duyệt.

## Chạy

```bash
cp .env.example .env            # điền mật khẩu DB, JWT_KEY...
docker compose up -d mysql
dotnet build
dotnet run --project src/Host/Nebula.Api     # http://localhost:5080/health
dotnet test tests/Nebula.Tests
```
