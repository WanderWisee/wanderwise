using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WanderWiseApi.Data;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

public class UpdateSettingsRequest
{
    public bool? NotifTripReminders { get; set; }
    public bool? NotifTripInvites { get; set; }
    public bool? NotifComments { get; set; }
    public bool? NotifTripUpdates { get; set; }
    public string? DateFormat { get; set; }
    public string? TimeFormat { get; set; }
    public string? DistanceFormat { get; set; }
}

// Settings page → Notifications and Formatting. Saved per account, so
// they follow the student to any browser or device.
[ApiController]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public SettingsController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    private static object ToDto(UserSettings s) => new
    {
        notifTripReminders = s.NotifTripReminders,
        notifTripInvites = s.NotifTripInvites,
        notifComments = s.NotifComments,
        notifTripUpdates = s.NotifTripUpdates,
        dateFormat = s.DateFormat,
        timeFormat = s.TimeFormat,
        distanceFormat = s.DistanceFormat,
    };

    [HttpGet("/api/me/settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _db.UserSettings.FindAsync(CurrentUserId)
            ?? new UserSettings { UserId = CurrentUserId };
        return Ok(ToDto(settings));
    }

    // Only the fields that were sent get changed — the Settings page sends
    // one field at a time as soon as the student changes it.
    [HttpPut("/api/me/settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
    {
        var settings = await _db.UserSettings.FindAsync(CurrentUserId);
        if (settings is null)
        {
            settings = new UserSettings { UserId = CurrentUserId };
            _db.UserSettings.Add(settings);
        }

        if (request.NotifTripReminders.HasValue) settings.NotifTripReminders = request.NotifTripReminders.Value;
        if (request.NotifTripInvites.HasValue) settings.NotifTripInvites = request.NotifTripInvites.Value;
        if (request.NotifComments.HasValue) settings.NotifComments = request.NotifComments.Value;
        if (request.NotifTripUpdates.HasValue) settings.NotifTripUpdates = request.NotifTripUpdates.Value;
        if (request.DateFormat is "mdy" or "dmy") settings.DateFormat = request.DateFormat;
        if (request.TimeFormat is "12h" or "24h") settings.TimeFormat = request.TimeFormat;
        if (request.DistanceFormat is "km" or "mi") settings.DistanceFormat = request.DistanceFormat;
        settings.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(settings));
    }
}