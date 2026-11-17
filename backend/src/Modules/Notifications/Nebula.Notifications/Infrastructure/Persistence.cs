using Microsoft.EntityFrameworkCore;

namespace Nebula.Notifications.Infrastructure;

// TODO: bảng noti_preferences, noti_conversation_settings, noti_server_settings, noti_notifications (tên như ERD)
//       xong thì chạy dotnet ef migrations add InitialCreate
public sealed class NotificationsDbContext(DbContextOptions<NotificationsDbContext> options) : DbContext(options)
{
}

// TODO: GetPreferenceAsync, GetPreferencesAsync, AddPreferenceAsync, GetSettingAsync
//       GetSettingsAsync, AddSettingAsync, RemoveSetting, GetServerSettingAsync
//       GetServerSettingsAsync, ListServerSettingsAsync, AddServerSettingAsync
//       RemoveServerSetting, DeleteServerSettingsAsync, AddNotificationsAsync
//       ListNotificationsAsync, CountUnreadAsync, GetNotificationAsync, MarkAllReadAsync
internal sealed class EfNotificationRepository
{
}
