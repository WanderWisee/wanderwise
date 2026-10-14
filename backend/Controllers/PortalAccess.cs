using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

// Shared checks for the teacher portal and the admin panel.
public static class PortalAccess
{
    public const string RoleStudent = "student";
    public const string RoleTeacher = "teacher";
    public const string RoleAdmin = "admin";

    public const string StatusActive = "active";
    public const string StatusPending = "pending";
    public const string StatusDeactivated = "deactivated";

    // The role is always read from the database (not from the login
    // token), so a role change by the admin applies right away.
    public static async Task<User?> GetActiveUserAsync(WanderWiseDbContext db, int userId)
    {
        var user = await db.Users.FindAsync(userId);
        return user != null && user.AccountStatus == StatusActive ? user : null;
    }

    public static async Task<bool> HasRoleAsync(WanderWiseDbContext db, int userId, string role)
    {
        var user = await GetActiveUserAsync(db, userId);
        return user != null && user.Role == role;
    }

    // Is this student in one of this teacher's classes?
    public static Task<bool> IsTeacherOfStudentAsync(WanderWiseDbContext db, int teacherId, int studentId) =>
        db.ClassMembers.AnyAsync(m => m.StudentId == studentId &&
            db.Classes.Any(c => c.Id == m.ClassId && c.TeacherId == teacherId));

    // A teacher may OPEN (read-only) a trip when the trip's owner or any of
    // its crew is a student in one of the teacher's classes — so they can
    // check itineraries, budgets and attendance. Never lets them edit.
    public static async Task<bool> CanTeacherViewTripAsync(WanderWiseDbContext db, int userId, int tripId)
    {
        if (!await HasRoleAsync(db, userId, RoleTeacher)) return false;

        var trip = await db.Trips.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip is null) return false;

        if (trip.ClassId != null &&
            await db.Classes.AnyAsync(c => c.Id == trip.ClassId && c.TeacherId == userId))
            return true;

        var peopleOnTrip = await db.TripMembers
            .Where(m => m.TripId == tripId)
            .Select(m => m.UserId)
            .ToListAsync();
        peopleOnTrip.Add(trip.UserId);

        return await db.ClassMembers.AnyAsync(m => peopleOnTrip.Contains(m.StudentId) &&
            db.Classes.Any(c => c.Id == m.ClassId && c.TeacherId == userId));
    }
}

// Writes one line to activity_logs. Never throws — logging must not
// break the request it's describing.
public static class ActivityLogger
{
    // Actions (kept short so the admin can filter by them)
    public const string LoginSuccess = "login";
    public const string LoginFailed = "login_failed";
    public const string LoginBlocked = "login_blocked";
    public const string RegisterStudent = "register_student";
    public const string RegisterTeacher = "register_teacher";
    public const string PasswordReset = "password_reset";
    public const string UserRoleChanged = "user_role_changed";
    public const string UserStatusChanged = "user_status_changed";
    public const string JournalHidden = "journal_hidden";
    public const string JournalUnhidden = "journal_unhidden";
    public const string ContentChanged = "content_changed";
    public const string ClassCreated = "class_created";
    public const string ClassDeleted = "class_deleted";
    public const string FieldTripCreated = "field_trip_created";
    public const string ServerError = "server_error";

    public static async Task LogAsync(WanderWiseDbContext db, int? userId, string action, string? details, HttpContext? http)
    {
        if (details != null && details.Length > 500) details = details[..500];
        var log = new ActivityLog
        {
            UserId = userId,
            Action = action,
            Details = details,
            IpAddress = http?.Connection.RemoteIpAddress?.ToString(),
            CreatedAt = DateTime.UtcNow,
        };
        try
        {
            db.ActivityLogs.Add(log);
            await db.SaveChangesAsync();
        }
        catch
        {
            // Don't leave the failed row queued — the request's own next
            // save would fail with it (e.g. if activity_logs isn't created yet).
            db.Entry(log).State = EntityState.Detached;
        }
    }
}

// Blocks deactivated accounts on EVERY request (not just at login), so an
// admin's "Deactivate" takes effect even if the person is already logged
// in. Statuses are cached for a minute to avoid a DB hit per request.
public static class AccountGuard
{
    private static readonly ConcurrentDictionary<int, (string status, DateTime checkedAt)> Cache = new();
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(1);

    public static void Forget(int userId) => Cache.TryRemove(userId, out _);

    public static async Task<bool> IsActiveAsync(WanderWiseDbContext db, int userId)
    {
        if (Cache.TryGetValue(userId, out var hit) && DateTime.UtcNow - hit.checkedAt < CacheFor)
            return hit.status == PortalAccess.StatusActive;

        var status = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.AccountStatus)
            .FirstOrDefaultAsync() ?? PortalAccess.StatusDeactivated;

        Cache[userId] = (status, DateTime.UtcNow);
        return status == PortalAccess.StatusActive;
    }
}
