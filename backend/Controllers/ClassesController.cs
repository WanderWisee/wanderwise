using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;

namespace WanderWiseApi.Controllers;

// ===== Teacher portal (like Canvas, per subject/section) =====
// Teachers are "viewing only": classes, roster, each student's trips
// (itinerary + budget, read-only), attendance/check-ins and journals, plus
// class announcements. Teachers don't make itineraries.
// Students: join with a code and read the announcements.
[ApiController]
[Authorize]
public class ClassesController : ControllerBase
{
    private readonly WanderWiseDbContext _db;

    public ClassesController(WanderWiseDbContext db)
    {
        _db = db;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // ---------------- helpers ----------------

    private Task<bool> IAmTeacherAsync() => PortalAccess.HasRoleAsync(_db, CurrentUserId, PortalAccess.RoleTeacher);

    // "teacher" (owns the class), "student" (member) or null.
    private async Task<(SchoolClass? cls, string? role)> LoadClassAsync(int classId)
    {
        var cls = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
        if (cls is null) return (null, null);
        if (cls.TeacherId == CurrentUserId && await IAmTeacherAsync()) return (cls, "teacher");
        if (await _db.ClassMembers.AnyAsync(m => m.ClassId == classId && m.StudentId == CurrentUserId))
            return (cls, "student");
        return (null, null);
    }

    private async Task<SchoolClass?> LoadMyClassAsTeacherAsync(int classId)
    {
        var (cls, role) = await LoadClassAsync(classId);
        return role == "teacher" ? cls : null;
    }

    // 6 characters, no look-alikes (0/O, 1/I/L).
    private async Task<string> NewJoinCodeAsync()
    {
        const string chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        while (true)
        {
            var code = new string(Enumerable.Range(0, 6)
                .Select(_ => chars[RandomNumberGenerator.GetInt32(chars.Length)]).ToArray());
            if (!await _db.Classes.AnyAsync(c => c.JoinCode == code)) return code;
        }
    }

    private static string ClassLabel(SchoolClass c) =>
        string.IsNullOrWhiteSpace(c.Section) ? c.Name : $"{c.Name} · {c.Section}";

    private static DateOnly? ParseDate(string? raw) =>
        !string.IsNullOrWhiteSpace(raw) && DateOnly.TryParse(raw, out var d) ? d : null;

    private async Task<IActionResult> AddStudentToClassAsync(SchoolClass cls, User student)
    {
        if (await _db.ClassMembers.AnyAsync(m => m.ClassId == cls.Id && m.StudentId == student.Id))
            return Conflict(new { error = "already_member" });

        _db.ClassMembers.Add(new ClassMember { ClassId = cls.Id, StudentId = student.Id, JoinedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        return Ok(new { classId = cls.Id });
    }

    // ================= TEACHER: classes =================

    [HttpGet("/api/teacher/classes")]
    public async Task<IActionResult> GetTeacherClasses()
    {
        if (!await IAmTeacherAsync()) return Forbid();

        var classes = await _db.Classes
            .Where(c => c.TeacherId == CurrentUserId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                section = c.Section,
                term = c.Term,
                joinCode = c.JoinCode,
                createdAt = c.CreatedAt,
                studentCount = _db.ClassMembers.Count(m => m.ClassId == c.Id),
            })
            .ToListAsync();

        return Ok(classes);
    }

    [HttpPost("/api/teacher/classes")]
    public async Task<IActionResult> CreateClass([FromBody] SaveClassRequest request)
    {
        if (!await IAmTeacherAsync()) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "name_required" });

        var cls = new SchoolClass
        {
            TeacherId = CurrentUserId,
            Name = request.Name.Trim(),
            Section = request.Section?.Trim(),
            Term = request.Term?.Trim(),
            JoinCode = await NewJoinCodeAsync(),
            CreatedAt = DateTime.UtcNow,
        };
        _db.Classes.Add(cls);
        await _db.SaveChangesAsync();
        await ActivityLogger.LogAsync(_db, CurrentUserId, ActivityLogger.ClassCreated, ClassLabel(cls), HttpContext);

        return Ok(new { id = cls.Id, joinCode = cls.JoinCode });
    }

    [HttpPut("/api/teacher/classes/{classId:int}")]
    public async Task<IActionResult> UpdateClass(int classId, [FromBody] SaveClassRequest request)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "name_required" });

        cls.Name = request.Name.Trim();
        cls.Section = request.Section?.Trim();
        cls.Term = request.Term?.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("/api/teacher/classes/{classId:int}/new-code")]
    public async Task<IActionResult> NewCode(int classId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        cls.JoinCode = await NewJoinCodeAsync();
        await _db.SaveChangesAsync();
        return Ok(new { joinCode = cls.JoinCode });
    }

    // Deletes the class (roster and announcements).
    // Field trips stay as the teacher's own trips.
    [HttpDelete("/api/teacher/classes/{classId:int}")]
    public async Task<IActionResult> DeleteClass(int classId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();

        _db.Classes.Remove(cls);
        await _db.SaveChangesAsync();
        await ActivityLogger.LogAsync(_db, CurrentUserId, ActivityLogger.ClassDeleted, ClassLabel(cls), HttpContext);
        return NoContent();
    }

    // ================= Class page (teacher OR student) =================

    [HttpGet("/api/classes/{classId:int}")]
    public async Task<IActionResult> GetClass(int classId)
    {
        var (cls, role) = await LoadClassAsync(classId);
        if (cls is null) return NotFound();

        var teacher = await _db.Users.FindAsync(cls.TeacherId);

        object? students = null;
        if (role == "teacher")
        {
            var rows = await _db.ClassMembers
                .Where(m => m.ClassId == classId)
                .Join(_db.Users, m => m.StudentId, u => u.Id, (m, u) => new { m, u })
                .ToListAsync();
            var ids = rows.Select(r => r.u.Id).ToList();

            var memberTrips = await _db.TripMembers.Where(m => ids.Contains(m.UserId))
                .Select(m => new { m.UserId, m.TripId }).ToListAsync();
            var ownTrips = await _db.Trips.Where(t => ids.Contains(t.UserId))
                .Select(t => new { t.UserId, t.Id }).ToListAsync();
            var journals = await _db.JournalEntries.Where(j => ids.Contains(j.UserId))
                .GroupBy(j => j.UserId).Select(g => new { userId = g.Key, count = g.Count() }).ToListAsync();
            var checkIns = await _db.TripAttendance.Where(a => ids.Contains(a.UserId) && a.Present)
                .GroupBy(a => a.UserId).Select(g => new { userId = g.Key, count = g.Count() }).ToListAsync();

            students = rows
                .OrderBy(r => r.u.LastName).ThenBy(r => r.u.FirstName)
                .Select(r => new
                {
                    userId = r.u.Id,
                    firstName = r.u.FirstName,
                    lastName = r.u.LastName,
                    studentNumber = r.u.StudentNumber,
                    email = r.u.Email,
                    avatarUrl = r.u.AvatarUrl,
                    joinedAt = r.m.JoinedAt,
                    tripsCount = ownTrips.Count(t => t.UserId == r.u.Id) +
                                 memberTrips.Count(t => t.UserId == r.u.Id),
                    journalsCount = journals.FirstOrDefault(j => j.userId == r.u.Id)?.count ?? 0,
                    checkInsCount = checkIns.FirstOrDefault(c => c.userId == r.u.Id)?.count ?? 0,
                })
                .ToList();
        }

        return Ok(new
        {
            id = cls.Id,
            name = cls.Name,
            section = cls.Section,
            term = cls.Term,
            joinCode = role == "teacher" ? cls.JoinCode : null,
            myRole = role,
            teacher = new
            {
                id = teacher?.Id,
                firstName = teacher?.FirstName,
                lastName = teacher?.LastName,
                avatarUrl = teacher?.AvatarUrl,
                email = teacher?.Email,
            },
            studentCount = await _db.ClassMembers.CountAsync(m => m.ClassId == classId),
            students,
        });
    }

    // ================= TEACHER: roster =================

    [HttpPost("/api/teacher/classes/{classId:int}/students")]
    public async Task<IActionResult> AddStudent(int classId, [FromBody] AddStudentRequest request)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();

        var key = request.StudentNumber?.Trim() ?? "";
        if (key.Length == 0) return BadRequest(new { error = "student_number_required" });

        var student = await _db.Users.FirstOrDefaultAsync(u =>
            (u.StudentNumber == key.ToUpper() || u.Email == key) &&
            u.Role == PortalAccess.RoleStudent && u.AccountStatus == PortalAccess.StatusActive);
        if (student is null) return NotFound(new { error = "student_not_found" });

        var result = await AddStudentToClassAsync(cls, student);
        if (result is OkObjectResult)
        {
            var teacher = await _db.Users.FindAsync(CurrentUserId);
            var teacherName = NotificationHelper.FullName(teacher);
            await NotificationHelper.CreateAsync(
                _db, student.Id, NotificationHelper.ClassAdded,
                $"{teacherName} added you to the class {ClassLabel(cls)}.",
                $"/classes/{cls.Id}",
                new { actorName = teacherName, className = ClassLabel(cls) },
                $"class_added:{cls.Id}:{student.Id}");
            return Ok(new
            {
                userId = student.Id,
                firstName = student.FirstName,
                lastName = student.LastName,
            });
        }
        return result;
    }

    [HttpDelete("/api/teacher/classes/{classId:int}/students/{studentId:int}")]
    public async Task<IActionResult> RemoveStudent(int classId, int studentId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();

        var member = await _db.ClassMembers.FirstOrDefaultAsync(m => m.ClassId == classId && m.StudentId == studentId);
        if (member is null) return NotFound();
        _db.ClassMembers.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // One student's work: trips, attendance (with check-in photos and
    // location) and journal posts.
    [HttpGet("/api/teacher/classes/{classId:int}/students/{studentId:int}")]
    public async Task<IActionResult> GetStudent(int classId, int studentId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();

        var member = await _db.ClassMembers.FirstOrDefaultAsync(m => m.ClassId == classId && m.StudentId == studentId);
        if (member is null) return NotFound();
        var student = await _db.Users.FindAsync(studentId);
        if (student is null) return NotFound();

        var memberTripIds = await _db.TripMembers.Where(m => m.UserId == studentId).Select(m => m.TripId).ToListAsync();
        var trips = await _db.Trips
            .Where(t => t.UserId == studentId || memberTripIds.Contains(t.Id))
            .OrderByDescending(t => t.StartDate)
            .ThenByDescending(t => t.UpdatedAt)
            .ToListAsync();
        var tripIds = trips.Select(t => t.Id).ToList();
        var placeCounts = await _db.TripPlaces.Where(p => tripIds.Contains(p.TripId))
            .GroupBy(p => p.TripId).Select(g => new { tripId = g.Key, count = g.Count() }).ToListAsync();
        var spent = await _db.Expenses.Where(e => tripIds.Contains(e.TripId))
            .GroupBy(e => e.TripId).Select(g => new { tripId = g.Key, total = g.Sum(e => e.Amount) }).ToListAsync();

        var attendanceRows = await _db.TripAttendance
            .Where(a => a.UserId == studentId)
            .OrderByDescending(a => a.DayDate)
            .Take(100)
            .ToListAsync();

        var journals = await _db.JournalEntries
            .Where(j => j.UserId == studentId)
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new
            {
                id = j.Id,
                title = j.Title,
                createdAt = j.CreatedAt,
                placesCount = j.Places.Count,
                isHidden = j.IsHidden,
            })
            .ToListAsync();

        return Ok(new
        {
            classId,
            className = ClassLabel(cls),
            student = new
            {
                userId = student.Id,
                firstName = student.FirstName,
                lastName = student.LastName,
                studentNumber = student.StudentNumber,
                email = student.Email,
                cellphone = student.CellphoneNumber,
                avatarUrl = student.AvatarUrl,
                bio = student.Bio,
                joinedAt = member.JoinedAt,
            },
            trips = trips.Select(t => new
            {
                id = t.Id,
                title = t.Title,
                destination = t.Destination,
                startDate = t.StartDate?.ToString("yyyy-MM-dd"),
                endDate = t.EndDate?.ToString("yyyy-MM-dd"),
                role = t.UserId == studentId ? "owner" : "crew",
                isClassTrip = t.ClassId != null,
                placesCount = placeCounts.FirstOrDefault(p => p.tripId == t.Id)?.count ?? 0,
                budgetTotal = t.BudgetTotal,
                spent = spent.FirstOrDefault(s => s.tripId == t.Id)?.total ?? 0,
            }),
            attendance = attendanceRows.Select(a =>
            {
                var trip = trips.FirstOrDefault(t => t.Id == a.TripId);
                return new
                {
                    tripId = a.TripId,
                    tripTitle = trip?.Title,
                    tripDestination = trip?.Destination,
                    date = a.DayDate.ToString("yyyy-MM-dd"),
                    present = a.Present,
                    checkedInAt = a.CheckedInAt,
                    distanceMeters = a.DistanceMeters,
                    latitude = a.Latitude.HasValue ? (double?)a.Latitude.Value : null,
                    longitude = a.Longitude.HasValue ? (double?)a.Longitude.Value : null,
                    photo = a.Photo,
                    markedManually = a.Present && a.CheckedInAt == null,
                };
            }),
            journals,
        });
    }

    // ================= Announcements =================

    [HttpGet("/api/classes/{classId:int}/announcements")]
    public async Task<IActionResult> GetAnnouncements(int classId)
    {
        var (cls, _) = await LoadClassAsync(classId);
        if (cls is null) return NotFound();

        var rows = await _db.ClassAnnouncements
            .Where(a => a.ClassId == classId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(100)
            .ToListAsync();
        var authorIds = rows.Select(r => r.AuthorId).Distinct().ToList();
        var authors = await _db.Users.Where(u => authorIds.Contains(u.Id)).ToListAsync();

        return Ok(rows.Select(r =>
        {
            var u = authors.FirstOrDefault(a => a.Id == r.AuthorId);
            return new
            {
                id = r.Id,
                message = r.Message,
                createdAt = r.CreatedAt,
                authorName = NotificationHelper.FullName(u),
                authorAvatar = u?.AvatarUrl,
            };
        }));
    }

    [HttpPost("/api/classes/{classId:int}/announcements")]
    public async Task<IActionResult> PostAnnouncement(int classId, [FromBody] ClassAnnouncementRequest request)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        var message = request.Message?.Trim() ?? "";
        if (message.Length == 0) return BadRequest(new { error = "message_required" });
        if (message.Length > 2000) message = message[..2000];

        var row = new ClassAnnouncement { ClassId = classId, AuthorId = CurrentUserId, Message = message, CreatedAt = DateTime.UtcNow };
        _db.ClassAnnouncements.Add(row);
        await _db.SaveChangesAsync();

        var teacher = await _db.Users.FindAsync(CurrentUserId);
        var teacherName = NotificationHelper.FullName(teacher);
        var studentIds = await _db.ClassMembers.Where(m => m.ClassId == classId).Select(m => m.StudentId).ToListAsync();
        var preview = message.Length > 120 ? message[..120] + "…" : message;
        foreach (var sid in studentIds)
        {
            await NotificationHelper.CreateAsync(
                _db, sid, NotificationHelper.ClassAnnouncement,
                $"{teacherName} ({ClassLabel(cls)}): {preview}",
                $"/classes/{classId}",
                new { actorName = teacherName, className = ClassLabel(cls), message = preview },
                $"class_announcement:{row.Id}");
        }

        return Ok(new { id = row.Id });
    }

    [HttpDelete("/api/classes/{classId:int}/announcements/{announcementId:int}")]
    public async Task<IActionResult> DeleteAnnouncement(int classId, int announcementId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        var row = await _db.ClassAnnouncements.FirstOrDefaultAsync(a => a.Id == announcementId && a.ClassId == classId);
        if (row is null) return NotFound();
        _db.ClassAnnouncements.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ================= STUDENT =================

    [HttpGet("/api/classes/mine")]
    public async Task<IActionResult> GetMyClasses()
    {
        var classIds = await _db.ClassMembers.Where(m => m.StudentId == CurrentUserId).Select(m => m.ClassId).ToListAsync();
        var classes = await _db.Classes.Where(c => classIds.Contains(c.Id)).OrderBy(c => c.Name).ToListAsync();
        var teacherIds = classes.Select(c => c.TeacherId).Distinct().ToList();
        var teachers = await _db.Users.Where(u => teacherIds.Contains(u.Id)).ToListAsync();

        return Ok(classes.Select(c =>
        {
            var t = teachers.FirstOrDefault(u => u.Id == c.TeacherId);
            return new
            {
                id = c.Id,
                name = c.Name,
                section = c.Section,
                term = c.Term,
                teacherName = NotificationHelper.FullName(t),
                teacherAvatar = t?.AvatarUrl,
            };
        }));
    }

    [HttpPost("/api/classes/join")]
    public async Task<IActionResult> JoinClass([FromBody] JoinClassRequest request)
    {
        var me = await PortalAccess.GetActiveUserAsync(_db, CurrentUserId);
        if (me is null || me.Role != PortalAccess.RoleStudent)
            return BadRequest(new { error = "students_only" });

        var code = request.Code?.Trim().ToUpperInvariant() ?? "";
        var cls = await _db.Classes.FirstOrDefaultAsync(c => c.JoinCode == code);
        if (cls is null) return NotFound(new { error = "bad_code" });

        return await AddStudentToClassAsync(cls, me);
    }
}
