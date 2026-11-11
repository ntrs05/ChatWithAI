using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Nebula.Shared.Infrastructure;

/// <summary>Mọi thời điểm trong hệ thống là UTC. MySQL trả DateTime kiểu "Unspecified" nên JSON mặc định thiếu chữ "Z",
/// trình duyệt sẽ hiểu nhầm là giờ địa phương (lệch 7 tiếng ở Việt Nam). Converter này luôn ghi "2026-10-21T17:54:17.2377140Z".</summary>
public sealed class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => DateTime.Parse(reader.GetString()!, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        writer.WriteStringValue(utc.ToString("O", CultureInfo.InvariantCulture));
    }
}
