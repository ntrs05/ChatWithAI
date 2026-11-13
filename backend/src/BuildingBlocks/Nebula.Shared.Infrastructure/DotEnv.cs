namespace Nebula.Shared.Infrastructure;

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
            // docker đã truyền sẵn thì giữ
            if (Environment.GetEnvironmentVariable(key) == null)
                Environment.SetEnvironmentVariable(key, value);
        }
    }

    public static string Get(string key, string defaultValue = "")
        => Environment.GetEnvironmentVariable(key) is { Length: > 0 } value ? value : defaultValue;
}
