using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Nebula.Ai.Api;
using Nebula.Ai.Application;
using Nebula.Ai.Infrastructure;
using Nebula.Shared.Contracts;
using Nebula.Shared.Infrastructure;

namespace Nebula.Ai;

public static class AiModule
{
    public static IServiceCollection AddAiModule(this IServiceCollection services, IConfiguration cfg)
    {
        services.AddHttpClient<ISummarizer, GeminiSummarizer>(c => c.Timeout = TimeSpan.FromSeconds(60));   // gọi Google Gemini
        services.AddScoped<SummaryService>();

        // bot @nebula: nghe MessageSent, bỏ vào hàng đợi, BotWorker xử lý ở nền
        services.AddSingleton<BotQueue>();
        services.AddEventHandler<MessageSent, BotMentionHandler>();
        services.AddHostedService<BotWorker>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new AiEndpoints();
}
