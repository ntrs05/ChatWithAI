using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nebula.Ai.Api;
using Nebula.Shared.Infrastructure;

namespace Nebula.Ai;

// TV-Ai làm module này (UC13, UC14). Host chỉ gọi hai hàm dưới.
public static class AiModule
{
    public static IServiceCollection AddAiModule(this IServiceCollection services, IConfiguration cfg)
    {
        // TODO: đăng ký service của module. Viết xong lớp nào thì mở comment dòng tương ứng:
        //   services.AddHttpClient<ISummarizer, GeminiSummarizer>(c => c.Timeout = TimeSpan.FromSeconds(60));   // gọi Google Gemini
        //   services.AddScoped<SummaryService>();
        //   services.AddSingleton<BotQueue>();
        //   services.AddEventHandler<MessageSent, BotMentionHandler>();
        //   services.AddHostedService<BotWorker>();
        return services;
    }

    public static IModuleEndpoints Endpoints() => new AiEndpoints();
}
