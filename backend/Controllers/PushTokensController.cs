using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

public class PushTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string? Platform { get; set; }
}

// The mobile app saves its Expo push token here after logging in, and
// removes it when logging out, so pushes only reach the logged-in account.
[ApiController]
[Route("api/me/push-token")]
[Authorize]
public class PushTokensController : ControllerBase
{
    private static readonly Regex ExpoTokenRegex = new(
        @"^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_\-]{10,200}\]$", RegexOptions.Compiled);

    private readonly WanderWiseDbContext _db;

    public PushTokensController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] PushTokenRequest request)
    {
        var token = request.Token?.Trim() ?? "";
        if (!ExpoTokenRegex.IsMatch(token))
            return BadRequest(new { error = "Invalid push token." });

        var platform = (request.Platform ?? "").Trim().ToLowerInvariant();
        if (platform != "android" && platform != "ios") platform = "android";

        var now = DateTime.UtcNow;
        var existing = await _db.PushTokens.FirstOrDefaultAsync(p => p.Token == token);
        if (existing is null)
        {
            _db.PushTokens.Add(new PushToken
            {
                UserId = CurrentUserId,
                Token = token,
                Platform = platform,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            // Same phone, maybe a different account now.
            existing.UserId = CurrentUserId;
            existing.Platform = platform;
            existing.UpdatedAt = now;
        }
        await _db.SaveChangesAsync();
        return Ok(new { saved = true });
    }

    [HttpDelete]
    public async Task<IActionResult> Remove([FromBody] PushTokenRequest request)
    {
        var token = request.Token?.Trim() ?? "";
        var rows = await _db.PushTokens.Where(p => p.Token == token && p.UserId == CurrentUserId).ToListAsync();
        if (rows.Count > 0)
        {
            _db.PushTokens.RemoveRange(rows);
            await _db.SaveChangesAsync();
        }
        return Ok(new { removed = rows.Count });
    }
}
