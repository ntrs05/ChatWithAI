using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

// ===== 1. Đọc bí mật từ file .env (mật khẩu DB, khóa JWT...) =====
DotEnv.Load();
var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// Chạy trong Docker: DB_HOST=mysql, DB_PORT=3306. Chạy bằng dotnet run: localhost và cổng MYSQL_HOST_PORT.
cfg["ConnectionStrings:Default"] =
    $"Server={DotEnv.Get("DB_HOST", "localhost")};Port={DotEnv.Get("DB_PORT", DotEnv.Get("MYSQL_HOST_PORT", "3306"))};" +
    $"Database={DotEnv.Get("MYSQL_DATABASE")};User={DotEnv.Get("MYSQL_USER")};Password={DotEnv.Get("MYSQL_PASSWORD")};";
cfg["Jwt:Key"] = DotEnv.Get("JWT_KEY");
cfg["Google:ClientId"] = DotEnv.Get("GOOGLE_CLIENT_ID");
cfg["AdminEmails"] = DotEnv.Get("ADMIN_EMAILS");
cfg["Gemini:ApiKey"] = DotEnv.Get("GEMINI_API_KEY");
cfg["Gemini:Model"] = DotEnv.Get("GEMINI_MODEL");
cfg["Livekit:Url"] = DotEnv.Get("LIVEKIT_URL");               // địa chỉ ws:// hoặc wss:// mà TRÌNH DUYỆT dùng để nối
cfg["Livekit:ApiKey"] = DotEnv.Get("LIVEKIT_API_KEY");
cfg["Livekit:ApiSecret"] = DotEnv.Get("LIVEKIT_API_SECRET");
cfg["Storage:Path"] = DotEnv.Get("STORAGE_PATH", "uploads");

// ===== 2. Hạ tầng dùng chung =====
builder.Services.AddEventBus();     // hàng đợi Pub-Sub trong tiến trình
// Enum gửi/nhận dạng chữ ("Open", "Text", "Online"...) thay vì số 0/1/2: client dễ đọc, không vỡ khi thêm giá trị vào enum.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.Converters.Add(new UtcDateTimeConverter());   // thời gian luôn có đuôi Z (UTC)
});
builder.Services.AddSignalR().AddJsonProtocol(o =>   // realtime
{
    o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.PayloadSerializerOptions.Converters.Add(new UtcDateTimeConverter());
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();   // JSON sai định dạng → 400 thay vì 500
builder.Services.AddOpenApi();

// ===== 3. Đăng ký từng module: Host KHÔNG biết bên trong module có gì =====

// ===== 4. Đăng nhập bằng JWT, mặc định mọi API đều phải đăng nhập =====
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;   // giữ nguyên tên claim "sub", "role"
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = cfg["Jwt:Issuer"],
        ValidateAudience = true, ValidAudience = cfg["Jwt:Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!)),
        NameClaimType = "sub", RoleClaimType = "role"
    };
    o.Events = new JwtBearerEvents
    {
        // SignalR (WebSocket) không gửi được header Authorization, nên gửi token qua ?access_token=
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
        // Token còn hạn nhưng tài khoản đã bị admin hệ thống khóa thì vẫn chặn.
        OnTokenValidated = async ctx =>
        {
            var id = Guid.Parse(ctx.Principal!.FindFirst("sub")!.Value);
            var identity = ctx.HttpContext.RequestServices.GetRequiredService<IIdentityApi>();
            if (!await identity.IsActiveAsync(id, ctx.HttpContext.RequestAborted))
                ctx.Fail("Tài khoản bị cấm hoặc không tồn tại.");
        }
    };
});
builder.Services.AddAuthorization(o =>
{
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
    o.AddPolicy("Admin", p => p.RequireRole("Admin"));   // chỉ admin hệ thống
});
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(cfg.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// ===== 5. Mỗi module tự khai báo route của mình =====
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();   // tài liệu API: /openapi/v1.json

    // Tự tạo / cập nhật bảng cho từng module khi khởi động.
}

app.Run();
