using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WanderWiseApi.Models;

namespace WanderWiseApi.Services;

public class JwtService
{
    private readonly string _secret;

    public JwtService(IConfiguration configuration)
    {
        _secret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT_SECRET is not configured. Check your .env file.");
    }

    // "Password stamp": a short fingerprint of the current password hash,
    // put inside every login token. When the password is reset the hash
    // changes, so every token made before that no longer matches and is
    // rejected (Program.cs) — this logs the account out on all devices
    // without needing a new database column.
    public const string PasswordStampClaim = "pwd";

    public static string PasswordStamp(string passwordHash)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash ?? ""));
        return Convert.ToHexString(bytes, 0, 8);
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("studentNumber", user.StudentNumber),
            new Claim(PasswordStampClaim, PasswordStamp(user.PasswordHash)),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "WanderWiseApi",
            audience: "WanderWiseApp",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
