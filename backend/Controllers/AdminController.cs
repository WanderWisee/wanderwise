using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

// ===== Admin panel (web only, mostly viewing) =====
// Overview of the whole system, the list of users (the admin can only
// deactivate / reactivate an account), journal posts (the admin can hide
// one), classes (view only) and the activity log.
[ApiController]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public AdminController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    private Task<bool> IAmAdminAsync() => PortalAccess.HasRoleAsync(_db, CurrentUserId, PortalAccess.RoleAdmin);

    // The only account change the admin can make.
    private static readonly string[] Statuses = { PortalAccess.StatusActive, PortalAccess.StatusDeactivated };

    private Task LogAsync(string action, string details) =>
        ActivityLogger.LogAsync(_db, CurrentUserId, action, details, HttpContext);

    // ---------------- Overview ----------------

    [HttpGet("/api/admin/overview")]
    public async Task<IActionResult> Overview()
    {
        if (!await IAmAdminAsync()) return Forbid();

        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var dayAgo = DateTime.UtcNow.AddDays(-1);

        var usersByRole = await _db.Users
            .GroupBy(u => u.Role)
            .Select(g => new { role = g.Key, count = g.Count() })
            .ToListAsync();

        var topDestinations = await _db.Trips
            .Where(t => t.Destination != null && t.Destination != "")
            .GroupBy(t => t.Destination!)
            .Select(g => new { name = g.Key, trips = g.Count() })
            .OrderByDescending(x => x.trips)
            .Take(5)
            .ToListAsync();

        var recentUsers = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(6)
            .Select(u => new
            {
                id = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                email = u.Email,
                role = u.Role,
                status = u.AccountStatus,
                createdAt = u.CreatedAt,
            })
            .ToListAsync();

        return Ok(new
        {
            users = await _db.Users.CountAsync(),
            students = usersByRole.FirstOrDefault(x => x.role == PortalAccess.RoleStudent)?.count ?? 0,
            teachers = usersByRole.FirstOrDefault(x => x.role == PortalAccess.RoleTeacher)?.count ?? 0,
            admins = usersByRole.FirstOrDefault(x => x.role == PortalAccess.RoleAdmin)?.count ?? 0,
            deactivated = await _db.Users.CountAsync(u => u.AccountStatus == PortalAccess.StatusDeactivated),
            newUsersThisWeek = await _db.Users.CountAsync(u => u.CreatedAt >= weekAgo),
            trips = await _db.Trips.CountAsync(),
            journals = await _db.JournalEntries.CountAsync(),
            hiddenJournals = await _db.JournalEntries.CountAsync(j => j.IsHidden),
            classes = await _db.Classes.CountAsync(),
            destinations = await _db.Destinations.CountAsync(),
            loginsToday = await _db.ActivityLogs.CountAsync(l => l.Action == ActivityLogger.LoginSuccess && l.CreatedAt >= dayAgo),
            failedLoginsToday = await _db.ActivityLogs.CountAsync(l => l.Action == ActivityLogger.LoginFailed && l.CreatedAt >= dayAgo),
            errorsThisWeek = await _db.ActivityLogs.CountAsync(l => l.Action == ActivityLogger.ServerError && l.CreatedAt >= weekAgo),
            topDestinations,
            recentUsers,
        });
    }

    // ---------------- Users ----------------

    [HttpGet("/api/admin/users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? q, [FromQuery] string? role, [FromQuery] string? status)
    {
        if (!await IAmAdminAsync()) return Forbid();

        var query = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(role)) query = query.Where(u => u.Role == role);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(u => u.AccountStatus == status);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(u =>
                (u.FirstName != null && u.FirstName.Contains(term)) ||
                (u.LastName != null && u.LastName.Contains(term)) ||
                (u.Email != null && u.Email.Contains(term)) ||
                u.StudentNumber.Contains(term));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(300)
            .Select(u => new
            {
                id = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                email = u.Email,
                studentNumber = u.StudentNumber,
                avatarUrl = u.AvatarUrl,
                role = u.Role,
                status = u.AccountStatus,
                createdAt = u.CreatedAt,
                tripsCount = _db.Trips.Count(t => t.UserId == u.Id),
                journalsCount = _db.JournalEntries.Count(j => j.UserId == u.Id),
                isMe = u.Id == CurrentUserId,
            })
            .ToListAsync();

        return Ok(users);
    }

    // Deactivate or reactivate an account.
    [HttpPut("/api/admin/users/{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] SetStatusRequest request)
    {
        if (!await IAmAdminAsync()) return Forbid();
        if (!Statuses.Contains(request.Status)) return BadRequest(new { error = "bad_status" });
        if (id == CurrentUserId) return BadRequest(new { error = "not_yourself" });

        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        // Admins can't lock each other out.
        if (user.Role == PortalAccess.RoleAdmin) return BadRequest(new { error = "not_admins" });

        var old = user.AccountStatus;
        user.AccountStatus = request.Status;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        AccountGuard.Forget(user.Id);
        await LogAsync(ActivityLogger.UserStatusChanged, $"{user.Email}: {old} → {user.AccountStatus}");
        return NoContent();
    }

    // ---------------- Classes (view only) ----------------

    [HttpGet("/api/admin/classes")]
    public async Task<IActionResult> GetClasses()
    {
        if (!await IAmAdminAsync()) return Forbid();

        var classes = await _db.Classes
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                section = c.Section,
                term = c.Term,
                createdAt = c.CreatedAt,
                teacherId = c.TeacherId,
                students = _db.ClassMembers.Count(m => m.ClassId == c.Id),
            })
            .ToListAsync();

        var teacherIds = classes.Select(c => c.teacherId).Distinct().ToList();
        var teachers = await _db.Users.Where(u => teacherIds.Contains(u.Id)).ToListAsync();

        return Ok(classes.Select(c => new
        {
            c.id, c.name, c.section, c.term, c.createdAt, c.students,
            teacherName = NotificationHelper.FullName(teachers.FirstOrDefault(t => t.Id == c.teacherId)),
        }));
    }

    // ---------------- Journal moderation ----------------

    [HttpGet("/api/admin/journals")]
    public async Task<IActionResult> GetJournals([FromQuery] string? q, [FromQuery] bool? hidden)
    {
        if (!await IAmAdminAsync()) return Forbid();

        var query = _db.JournalEntries.AsQueryable();
        if (hidden != null) query = query.Where(j => j.IsHidden == hidden);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(j =>
                (j.Title != null && j.Title.Contains(term)) ||
                (j.User!.FirstName != null && j.User.FirstName.Contains(term)) ||
                (j.User.LastName != null && j.User.LastName.Contains(term)));
        }

        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Take(200)
            .Select(j => new
            {
                id = j.Id,
                title = j.Title,
                createdAt = j.CreatedAt,
                isHidden = j.IsHidden,
                hiddenReason = j.HiddenReason,
                hiddenAt = j.HiddenAt,
                placesCount = j.Places.Count,
                commentsCount = _db.JournalComments.Count(c => c.JournalEntryId == j.Id),
                author = new
                {
                    id = j.UserId,
                    firstName = j.User!.FirstName,
                    lastName = j.User.LastName,
                    email = j.User.Email,
                },
            })
            .ToListAsync();

        return Ok(items);
    }

    // Full post (admin can read hidden ones too).
    [HttpGet("/api/admin/journals/{id:int}")]
    public async Task<IActionResult> GetJournal(int id)
    {
        if (!await IAmAdminAsync()) return Forbid();
        var entry = await _db.JournalEntries
            .Include(j => j.Places).ThenInclude(p => p.Pros)
            .Include(j => j.Places).ThenInclude(p => p.Cons)
            .Include(j => j.Places).ThenInclude(p => p.Hotels)
            .FirstOrDefaultAsync(j => j.Id == id);
        return entry is null ? NotFound() : Ok(entry);
    }

    [HttpPut("/api/admin/journals/{id:int}/visibility")]
    public async Task<IActionResult> SetJournalVisibility(int id, [FromBody] SetJournalVisibilityRequest request)
    {
        if (!await IAmAdminAsync()) return Forbid();
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id);
        if (entry is null) return NotFound();

        entry.IsHidden = request.Hidden;
        entry.HiddenReason = request.Hidden ? request.Reason?.Trim() : null;
        entry.HiddenAt = request.Hidden ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync();

        await LogAsync(request.Hidden ? ActivityLogger.JournalHidden : ActivityLogger.JournalUnhidden,
            $"#{entry.Id} \"{entry.Title}\"{(request.Hidden && !string.IsNullOrWhiteSpace(entry.HiddenReason) ? " — " + entry.HiddenReason : "")}");

        if (request.Hidden)
        {
            await NotificationHelper.CreateAsync(
                _db, entry.UserId, NotificationHelper.JournalHidden,
                $"Your journal post \"{entry.Title}\" was hidden by an admin" +
                (string.IsNullOrWhiteSpace(entry.HiddenReason) ? "." : $": {entry.HiddenReason}"),
                null,
                new { title = entry.Title, reason = entry.HiddenReason },
                $"journal_hidden:{entry.Id}:{entry.HiddenAt:yyyyMMddHHmmss}");
        }
        return NoContent();
    }

    // ---------------- Activity log ----------------

    [HttpGet("/api/admin/logs")]
    public async Task<IActionResult> GetLogs([FromQuery] string? action, [FromQuery] string? q, [FromQuery] int limit = 200)
    {
        if (!await IAmAdminAsync()) return Forbid();
        limit = Math.Clamp(limit, 1, 500);

        var query = _db.ActivityLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(l => l.Action == action);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(l => l.Details != null && l.Details.Contains(term));
        }

        var rows = await query.OrderByDescending(l => l.Id).Take(limit).ToListAsync();
        var userIds = rows.Where(r => r.UserId != null).Select(r => r.UserId!.Value).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email, u.Role }).ToListAsync();

        return Ok(rows.Select(r =>
        {
            var u = users.FirstOrDefault(x => x.Id == r.UserId);
            return new
            {
                id = r.Id,
                action = r.Action,
                details = r.Details,
                ipAddress = r.IpAddress,
                createdAt = r.CreatedAt,
                user = u == null ? null : new
                {
                    id = u.Id,
                    name = string.Join(" ", new[] { u.FirstName, u.LastName }.Where(s => !string.IsNullOrWhiteSpace(s))),
                    email = u.Email,
                    role = u.Role,
                },
            };
        }));
    }
}