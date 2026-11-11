namespace Nebula.Shared.Infrastructure;

/// <summary>
/// Đọc file .env (mật khẩu, khóa bí mật) vào biến môi trường.
/// - Chạy bằng Docker: docker compose đã truyền sẵn biến vào container, file .env không có trong container nên bỏ qua.
/// - Chạy bằng dotnet run: tìm file .env từ thư mục hiện tại đi ngược lên rồi đọc.
/// </summary>
public static class DotEnv
{
    public static void Load()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, ".env")))
            dir = dir.Parent;
        if (dir == null) return;

        foreach (var line in File.ReadAllLines(Path.Combine(dir.FullName, ".env")))
        {
            var text = line.Trim();
            if (text == "" || text.StartsWith('#') || !text.Contains('=')) continue;

            var key = text[..text.IndexOf('=')].Trim();
            var value = text[(text.IndexOf('=') + 1)..].Trim();
            // Biến đã có sẵn (do Docker truyền vào) thì giữ nguyên.
            if (Environment.GetEnvironmentVariable(key) == null)
                Environment.SetEnvironmentVariable(key, value);
        }
    }

    /// <summary>Lấy biến môi trường, không có thì trả giá trị mặc định.</summary>
    public static string Get(string key, string defaultValue = "")
        => Environment.GetEnvironmentVariable(key) is { Length: > 0 } value ? value : defaultValue;
}
