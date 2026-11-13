using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Nebula.Friends;
using Nebula.Identity;
using Nebula.Organization;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

// .env
DotEnv.Load();
var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// docker: mysql:3306, dotnet run: localhost + MYSQL_HOST_PORT
cfg["ConnectionStrings:Default"] =
    $"Server={DotEnv.Get("DB_HOST", "localhost")};Port={DotEnv.Get("DB_PORT", DotEnv.Get("MYSQL_HOST_PORT", "3306"))};" +
    $"Database={DotEnv.Get("MYSQL_DATABASE")};User={DotEnv.Get("MYSQL_USER")};Password={DotEnv.Get("MYSQL_PASSWORD")};";
cfg["Jwt:Key"] = DotEnv.Get("JWT_KEY");
cfg["Google:ClientId"] = DotEnv.Get("GOOGLE_CLIENT_ID");
cfg["AdminEmails"] = DotEnv.Get("ADMIN_EMAILS");
cfg["Gemini:ApiKey"] = DotEnv.Get("GEMINI_API_KEY");
cfg["Gemini:Model"] = DotEnv.Get("GEMINI_MODEL");
cfg["Livekit:Url"] = DotEnv.Get("LIVEKIT_URL");   // địa chỉ livekit phía trình duyệt
cfg["Livekit:ApiKey"] = DotEnv.Get("LIVEKIT_API_KEY");
cfg["Livekit:ApiSecret"] = DotEnv.Get("LIVEKIT_API_SECRET");
cfg["Storage:Path"] = DotEnv.Get("STORAGE_PATH", "uploads");

builder.Services.AddEventBus();
// enum dạng chữ thay vì số
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.Converters.Add(new UtcDateTimeConverter());
});
builder.Services.AddSignalR().AddJsonProtocol(o =>
{
    o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.PayloadSerializerOptions.Converters.Add(new UtcDateTimeConverter());
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();   // JSON sai → 400
builder.Services.AddOpenApi();

// modules
builder.Services
    .AddIdentityModule(cfg)
    .AddOrganizationModule(cfg)
    .AddFriendsModule(cfg);

// jwt
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
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
        // websocket không gửi được header nên lấy token từ query
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
        // token còn hạn nhưng bị khóa vẫn chặn
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
    o.AddPolicy("Admin", p => p.RequireRole("Admin"));
});
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(cfg.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// routes
IdentityModule.Endpoints().Map(app);
OrganizationModule.Endpoints().Map(app);
FriendsModule.Endpoints().Map(app);
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();

    // migrate khi khởi động
    await app.Services.MigrateIdentityAsync();
    await app.Services.MigrateOrganizationAsync();
    await app.Services.MigrateFriendsAsync();
}

app.Run();
