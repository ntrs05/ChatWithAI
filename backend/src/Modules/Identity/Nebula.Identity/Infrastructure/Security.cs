using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Nebula.Identity.Application;
using Nebula.Identity.Domain;

namespace Nebula.Identity.Infrastructure;

internal sealed class JwtTokenService(IConfiguration cfg) : ITokenService
{
    public string CreateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
        var claims = new[]
        {
            new Claim("sub", user.Id.ToString()),
            new Claim("name", user.DisplayName),
            new Claim("role", user.SystemRole.ToString())
        };
        var token = new JwtSecurityToken(
            issuer: cfg["Jwt:Issuer"], audience: cfg["Jwt:Audience"], claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(cfg["Jwt:ExpireMinutes"] ?? "60")),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

internal sealed class GoogleTokenValidator(IConfiguration cfg) : IGoogleTokenValidator
{
    public async Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken ct)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [cfg["Google:ClientId"]!] });
            return payload.EmailVerified ? new GoogleIdentity(payload.Subject, payload.Email, payload.Name, payload.Picture) : null;
        }
        catch (InvalidJwtException) { return null; }
    }
}

internal sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int Iterations = 100_000, SaltSize = 16, KeySize = 32;

    public string Hash(string password)
    {
        var salt = System.Security.Cryptography.RandomNumberGenerator.GetBytes(SaltSize);
        var key = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, System.Security.Cryptography.HashAlgorithmName.SHA256, KeySize);
        return $"v1.{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string hash)
    {
        var parts = hash.Split('.');
        if (parts.Length != 4 || parts[0] != "v1" || !int.TryParse(parts[1], out var iterations)) return false;
        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = System.Security.Cryptography.Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, System.Security.Cryptography.HashAlgorithmName.SHA256, expected.Length);
        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

internal sealed class ConfigAdminPolicy(IConfiguration cfg) : IAdminPolicy
{
    private readonly string[] _admins = (cfg["AdminEmails"] ?? "")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public bool IsAdminEmail(string email) => _admins.Contains(email, StringComparer.OrdinalIgnoreCase);
}
