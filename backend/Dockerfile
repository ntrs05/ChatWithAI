# ---------- Giai đoạn 1: build bằng image SDK (nặng, có trình biên dịch) ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy file .csproj trước rồi restore: Docker cache lại bước này, chỉ tải lại package khi đổi csproj.
COPY global.json ./
COPY src/BuildingBlocks/Nebula.Shared.Kernel/Nebula.Shared.Kernel.csproj                   src/BuildingBlocks/Nebula.Shared.Kernel/
COPY src/BuildingBlocks/Nebula.Shared.Contracts/Nebula.Shared.Contracts.csproj             src/BuildingBlocks/Nebula.Shared.Contracts/
COPY src/BuildingBlocks/Nebula.Shared.Infrastructure/Nebula.Shared.Infrastructure.csproj   src/BuildingBlocks/Nebula.Shared.Infrastructure/
COPY src/Modules/Identity/Nebula.Identity/Nebula.Identity.csproj                           src/Modules/Identity/Nebula.Identity/
COPY src/Modules/Organization/Nebula.Organization/Nebula.Organization.csproj                      src/Modules/Organization/Nebula.Organization/
COPY src/Modules/Friends/Nebula.Friends/Nebula.Friends.csproj                              src/Modules/Friends/Nebula.Friends/
COPY src/Host/Nebula.Api/Nebula.Api.csproj                                                 src/Host/Nebula.Api/
RUN dotnet restore src/Host/Nebula.Api/Nebula.Api.csproj

COPY src/ src/
RUN dotnet publish src/Host/Nebula.Api/Nebula.Api.csproj -c Release -o /app/publish --no-restore

# ---------- Giai đoạn 2: chạy bằng image runtime (nhẹ, không có source code) ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
# Chạy bằng user thường (APP_UID có sẵn trong image), không chạy bằng root.
RUN mkdir -p /app/uploads && chown $APP_UID /app/uploads
USER $APP_UID
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Nebula.Api.dll"]
