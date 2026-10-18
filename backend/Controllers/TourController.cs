using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

// ===== Tour Day (during the trip) =====
// One page per trip day with: attendance, check-in (photo + geofence),
// announcements and activities.
//
// Who can do what:
//  - Everyone on the trip (owner + crew) can open the page and check in.
//  - "Managers" = the owner and crew with edit access (can_edit) — they
//    set the meeting point, mark attendance by hand, post announcements
//    and add/remove activities.
[ApiController]
[Authorize]
public class TourController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    // Largest check-in photo we accept (as a data URL). The page shrinks
    // photos before sending, so real ones are far smaller than this.
    private const int MaxPhotoLength = 3_000_000;

    public TourController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // "owner", "editor", "viewer", or null if not on the trip.
    private async Task<(Trip? trip, string? role)> LoadTripAsync(int tripId)
    {
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip is null) return (null, null);
        if (trip.UserId == CurrentUserId) return (trip, "owner");

        var member = await _db.TripMembers.FirstOrDefaultAsync(m => m.TripId == tripId && m.UserId == CurrentUserId);
        if (member is not null) return (trip, member.CanEdit ? "editor" : "viewer");

        // A teacher of a student on this trip: read-only, but may see
        // everyone's check-in photos and locations.
        if (await PortalAccess.CanTeacherViewTripAsync(_db, CurrentUserId, tripId)) return (trip, "teacher");
        return (null, null);
    }

    private static bool IsManager(string? role) => role == "owner" || role == "editor";

    // Today in the Philippines (UTC+8, no daylight saving). Attendance and
    // check-in only work on the day itself: past days are view-only, so
    // nobody can mark yesterday's attendance after the fact.
    private static DateOnly PhToday() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8));

    private static string AttendanceStatus(DateOnly day)
    {
        var today = PhToday();
        return day == today ? "open" : day < today ? "closed" : "upcoming";
    }

    private static DateOnly? ParseDate(string? raw) =>
        !string.IsNullOrWhiteSpace(raw) && DateOnly.TryParse(raw, out var d) ? d : null;

    private static TimeOnly? ParseTime(string? raw) =>
        !string.IsNullOrWhiteSpace(raw) && TimeOnly.TryParse(raw, out var t) ? t : null;

    // Straight-line distance in meters between two points (haversine).
    private static double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000;
        double ToRad(double deg) => deg * Math.PI / 180;
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    // Everything the Tour Day page needs for one day.
    // GET /api/trips/{tripId}/tour?date=yyyy-MM-dd
    [HttpGet("/api/trips/{tripId:int}/tour")]
    public async Task<IActionResult> GetTourDay(int tripId, [FromQuery] string date)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        var day = ParseDate(date);
        if (day is null) return BadRequest("date is required (yyyy-MM-dd).");

        var manager = IsManager(role);

        var setting = await _db.TripDaySettings
            .FirstOrDefaultAsync(s => s.TripId == tripId && s.DayDate == day.Value);

        // Everyone on the trip: owner first, then crew.
        var owner = await _db.Users.FindAsync(trip.UserId);
        var crew = await _db.TripMembers
            .Where(m => m.TripId == tripId)
            .Join(_db.Users, m => m.UserId, u => u.Id, (m, u) => u)
            .ToListAsync();
        var people = new List<User>();
        // On a class field trip the owner is the teacher — the attendance
        // list is just the students.
        if (owner != null && trip.ClassId == null) people.Add(owner);
        people.AddRange(crew.Where(u => u.Id != trip.UserId));

        var attendance = await _db.TripAttendance
            .Where(a => a.TripId == tripId && a.DayDate == day.Value)
            .ToListAsync();

        // A teacher only sees check-in photos/locations of students in
        // their own classes, not of other people on the trip.
        var myStudentIds = role == "teacher"
            ? await _db.ClassMembers
                .Where(m => _db.Classes.Any(c => c.Id == m.ClassId && c.TeacherId == CurrentUserId))
                .Select(m => m.StudentId)
                .ToListAsync()
            : new List<int>();

        var roster = people.Select(u =>
        {
            var a = attendance.FirstOrDefault(x => x.UserId == u.Id);
            // Photos/locations are shown to managers, and to each student
            // for their own check-in only.
            var canSeeProof = manager || (role == "teacher" && myStudentIds.Contains(u.Id)) || u.Id == CurrentUserId;
            return new
            {
                userId = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                avatarUrl = u.AvatarUrl,
                isOwner = u.Id == trip.UserId,
                isMe = u.Id == CurrentUserId,
                present = a?.Present ?? false,
                checkedInAt = a?.CheckedInAt,
                distanceMeters = canSeeProof ? a?.DistanceMeters : null,
                latitude = canSeeProof && a?.Latitude != null ? (double?)a.Latitude : null,
                longitude = canSeeProof && a?.Longitude != null ? (double?)a.Longitude : null,
                photo = canSeeProof ? a?.Photo : null,
                markedManually = a != null && a.Present && a.CheckedInAt == null,
            };
        }).ToList();

        var activities = await _db.TripActivities
            .Where(x => x.TripId == tripId && x.DayDate == day.Value)
            .OrderBy(x => x.ActivityTime == null)
            .ThenBy(x => x.ActivityTime)
            .ThenBy(x => x.Id)
            .ToListAsync();

        var announcementRows = await _db.TripAnnouncements
            .Where(x => x.TripId == tripId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync();
        var authorIds = announcementRows.Select(x => x.UserId).Distinct().ToList();
        var authors = await _db.Users.Where(u => authorIds.Contains(u.Id)).ToListAsync();
        var announcements = announcementRows.Select(x =>
        {
            var u = authors.FirstOrDefault(a => a.Id == x.UserId);
            return new
            {
                id = x.Id,
                message = x.Message,
                createdAt = x.CreatedAt,
                authorName = NotificationHelper.FullName(u),
                authorAvatar = u?.AvatarUrl,
            };
        }).ToList();

        return Ok(new
        {
            tripId,
            date = day.Value.ToString("yyyy-MM-dd"),
            myRole = role,
            canManage = manager,
            // Teachers only watch; the teacher who owns a field trip runs it
            // but doesn't check in themselves.
            canCheckIn = role != "teacher" && !(trip.ClassId != null && role == "owner"),
            // "open" (today), "closed" (past day, view only) or "upcoming".
            attendanceStatus = AttendanceStatus(day.Value),
            attendanceOpen = AttendanceStatus(day.Value) == "open",
            meetingPoint = setting == null ? null : new
            {
                name = setting.MeetingPlaceName,
                latitude = setting.Latitude.HasValue ? (double?)setting.Latitude.Value : null,
                longitude = setting.Longitude.HasValue ? (double?)setting.Longitude.Value : null,
                radiusMeters = setting.RadiusMeters,
            },
            roster,
            activities = activities.Select(x => new
            {
                id = x.Id,
                title = x.Title,
                time = x.ActivityTime?.ToString("HH:mm"),
                placeName = x.PlaceName,
                notes = x.Notes,
            }),
            announcements,
        });
    }

    // Managers: set (or change) the day's meeting point and geofence size.
    [HttpPut("/api/trips/{tripId:int}/tour/day")]
    public async Task<IActionResult> SaveDaySetting(int tripId, [FromBody] SaveDaySettingRequest request)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        if (!IsManager(role)) return Forbid();
        var day = ParseDate(request.Date);
        if (day is null) return BadRequest("date is required (yyyy-MM-dd).");
        if (request.Latitude is null || request.Longitude is null)
            return BadRequest("Pick a meeting place that has a location.");

        var radius = Math.Clamp(request.RadiusMeters, 20, 5000);

        var setting = await _db.TripDaySettings
            .FirstOrDefaultAsync(s => s.TripId == tripId && s.DayDate == day.Value);
        if (setting is null)
        {
            setting = new TripDaySetting { TripId = tripId, DayDate = day.Value };
            _db.TripDaySettings.Add(setting);
        }
        setting.MeetingPlaceName = request.MeetingPlaceName;
        setting.Latitude = (decimal)request.Latitude.Value;
        setting.Longitude = (decimal)request.Longitude.Value;
        setting.RadiusMeters = radius;
        setting.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Managers: tick/untick someone's attendance by hand (e.g. their
    // phone died). Unticking keeps their check-in photo as a record.
    [HttpPut("/api/trips/{tripId:int}/tour/attendance")]
    public async Task<IActionResult> MarkAttendance(int tripId, [FromBody] MarkAttendanceRequest request)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        if (!IsManager(role)) return Forbid();
        var day = ParseDate(request.Date);
        if (day is null) return BadRequest("date is required (yyyy-MM-dd).");
        if (AttendanceStatus(day.Value) != "open") return BadRequest(new { error = "attendance_closed" });

        var onTrip = request.UserId == trip.UserId ||
                     await _db.TripMembers.AnyAsync(m => m.TripId == tripId && m.UserId == request.UserId);
        if (!onTrip) return NotFound("That person isn't on this trip.");

        var row = await _db.TripAttendance
            .FirstOrDefaultAsync(a => a.TripId == tripId && a.DayDate == day.Value && a.UserId == request.UserId);
        if (row is null)
        {
            row = new TripAttendance { TripId = tripId, DayDate = day.Value, UserId = request.UserId };
            _db.TripAttendance.Add(row);
        }
        row.Present = request.Present;
        row.MarkedBy = CurrentUserId;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Anyone on the trip: check in for a day with a photo. Only counts
    // when they're inside the day's geofence — the server re-checks the
    // distance, it doesn't just trust the page.
    [HttpPost("/api/trips/{tripId:int}/tour/checkin")]
    public async Task<IActionResult> CheckIn(int tripId, [FromBody] CheckInRequest request)
    {
        var (trip, myRole) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        // Teachers only watch; the teacher who owns a class field trip runs it.
        if (myRole == "teacher" || (trip.ClassId != null && myRole == "owner")) return Forbid();
        var day = ParseDate(request.Date);
        if (day is null) return BadRequest(new { error = "bad_date" });
        if (AttendanceStatus(day.Value) != "open") return BadRequest(new { error = "attendance_closed" });

        if (string.IsNullOrWhiteSpace(request.Photo) || !request.Photo.StartsWith("data:image/"))
            return BadRequest(new { error = "photo_required" });
        if (request.Photo.Length > MaxPhotoLength)
            return BadRequest(new { error = "photo_too_large" });

        var setting = await _db.TripDaySettings
            .FirstOrDefaultAsync(s => s.TripId == tripId && s.DayDate == day.Value);
        if (setting?.Latitude is null || setting.Longitude is null)
            return BadRequest(new { error = "no_meeting_point" });

        var distance = DistanceMeters(
            request.Latitude, request.Longitude,
            (double)setting.Latitude.Value, (double)setting.Longitude.Value);
        if (distance > setting.RadiusMeters)
            return BadRequest(new { error = "outside_geofence", distanceMeters = (int)Math.Round(distance), radiusMeters = setting.RadiusMeters });

        var row = await _db.TripAttendance
            .FirstOrDefaultAsync(a => a.TripId == tripId && a.DayDate == day.Value && a.UserId == CurrentUserId);
        if (row is null)
        {
            row = new TripAttendance { TripId = tripId, DayDate = day.Value, UserId = CurrentUserId };
            _db.TripAttendance.Add(row);
        }
        row.Present = true;
        row.Photo = request.Photo;
        row.Latitude = (decimal)request.Latitude;
        row.Longitude = (decimal)request.Longitude;
        row.DistanceMeters = (int)Math.Round(distance);
        row.CheckedInAt = DateTime.UtcNow;
        row.MarkedBy = CurrentUserId;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { distanceMeters = row.DistanceMeters, checkedInAt = row.CheckedInAt });
    }

    // Managers: post an announcement — everyone else on the trip gets a
    // notification (bell badge + push).
    [HttpPost("/api/trips/{tripId:int}/tour/announcements")]
    public async Task<IActionResult> CreateAnnouncement(int tripId, [FromBody] CreateAnnouncementRequest request)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        if (!IsManager(role)) return Forbid();

        var message = (request.Message ?? "").Trim();
        if (message.Length == 0) return BadRequest("Message is required.");
        if (message.Length > 1000) message = message[..1000];

        var announcement = new TripAnnouncement
        {
            TripId = tripId,
            UserId = CurrentUserId,
            Message = message,
            CreatedAt = DateTime.UtcNow,
        };
        _db.TripAnnouncements.Add(announcement);
        await _db.SaveChangesAsync();

        var author = await _db.Users.FindAsync(CurrentUserId);
        var authorName = NotificationHelper.FullName(author);
        var tripName = trip.Destination ?? trip.Title ?? "";
        var preview = message.Length > 120 ? message[..120] + "…" : message;

        foreach (var userId in await NotificationHelper.TripPeopleAsync(_db, trip))
        {
            if (userId == CurrentUserId) continue;
            await NotificationHelper.CreateAsync(
                _db, userId, NotificationHelper.Announcement,
                $"{authorName} ({tripName}): {preview}",
                $"/trip-plan/tour?tripId={tripId}",
                new { actorName = authorName, tripDestination = tripName, message = preview },
                $"announcement:{announcement.Id}");
        }

        return Ok(new { id = announcement.Id });
    }

    [HttpDelete("/api/trips/{tripId:int}/tour/announcements/{announcementId:int}")]
    public async Task<IActionResult> DeleteAnnouncement(int tripId, int announcementId)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        if (!IsManager(role)) return Forbid();

        var row = await _db.TripAnnouncements.FirstOrDefaultAsync(a => a.Id == announcementId && a.TripId == tripId);
        if (row is null) return NotFound();
        _db.TripAnnouncements.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("/api/trips/{tripId:int}/tour/activities")]
    public async Task<IActionResult> CreateActivity(int tripId, [FromBody] CreateActivityRequest request)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        if (!IsManager(role)) return Forbid();
        var day = ParseDate(request.Date);
        if (day is null) return BadRequest("date is required (yyyy-MM-dd).");

        var title = (request.Title ?? "").Trim();
        if (title.Length == 0) return BadRequest("Title is required.");

        var activity = new TripActivity
        {
            TripId = tripId,
            DayDate = day.Value,
            Title = title.Length > 150 ? title[..150] : title,
            ActivityTime = ParseTime(request.Time),
            PlaceName = string.IsNullOrWhiteSpace(request.PlaceName) ? null : request.PlaceName.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedBy = CurrentUserId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.TripActivities.Add(activity);
        await _db.SaveChangesAsync();

        return Ok(new { id = activity.Id });
    }

    [HttpDelete("/api/trips/{tripId:int}/tour/activities/{activityId:int}")]
    public async Task<IActionResult> DeleteActivity(int tripId, int activityId)
    {
        var (trip, role) = await LoadTripAsync(tripId);
        if (trip is null) return NotFound();
        if (!IsManager(role)) return Forbid();

        var row = await _db.TripActivities.FirstOrDefaultAsync(a => a.Id == activityId && a.TripId == tripId);
        if (row is null) return NotFound();
        _db.TripActivities.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
