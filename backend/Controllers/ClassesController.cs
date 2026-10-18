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

    // Teachers can no longer add students themselves: a student joins only
    // with the class code, so no student's data is shown to a teacher
    // without the student agreeing (Data Privacy Act).
    [HttpPost("/api/teacher/classes/{classId:int}/students")]
    public async Task<IActionResult> AddStudent(int classId, [FromBody] AddStudentRequest request)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        return BadRequest(new { error = "join_with_code" });
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

        // Let the student know they're no longer in the class.
        var teacher = await _db.Users.FindAsync(CurrentUserId);
        var teacherName = NotificationHelper.FullName(teacher);
        await NotificationHelper.CreateAsync(
            _db, studentId, NotificationHelper.ClassRemoved,
            $"{teacherName} removed you from the class {ClassLabel(cls)}.",
            "/classes",
            new { actorName = teacherName, className = ClassLabel(cls) },
            $"class_removed:{cls.Id}:{studentId}:{DateTime.UtcNow:yyyyMMddHHmmss}");

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
                avatarUrl = student.AvatarUrl,
                bio = student.Bio,
                joinedAt = member.JoinedAt,
            },
            trips = trips.Select(t => new
            {
                id = t.Id,
                // The trip's name as the student set it ("Trip to …" by default).
                title = Trip.DisplayName(t.TripName, t.Destination),
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
                    tripTitle = trip == null ? null : Trip.DisplayName(trip.TripName, trip.Destination),
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

    // ================= TEACHER: class summary =================

    // How the whole class is doing at a glance: who has a trip, who checked
    // in on each tour day, who has written a journal. The same rows feed the
    // CSV exports (roster and attendance) on the teacher's Summary tab.
    [HttpGet("/api/teacher/classes/{classId:int}/summary")]
    public async Task<IActionResult> GetSummary(int classId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();

        var students = await _db.ClassMembers
            .Where(m => m.ClassId == classId)
            .Join(_db.Users, m => m.StudentId, u => u.Id, (m, u) => u)
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .ToListAsync();
        var ids = students.Select(u => u.Id).ToList();

        // Which trips each student is on (as the owner or as crew).
        var owned = await _db.Trips.Where(t => ids.Contains(t.UserId))
            .Select(t => new { t.Id, t.UserId }).ToListAsync();
        var crew = await _db.TripMembers.Where(m => ids.Contains(m.UserId))
            .Select(m => new { Id = m.TripId, m.UserId }).ToListAsync();
        var onTrip = owned.Concat(crew).Distinct().ToList();
        var tripIds = onTrip.Select(x => x.Id).Distinct().ToList();

        var trips = await _db.Trips.Where(t => tripIds.Contains(t.Id))
            .Select(t => new { t.Id, t.TripName, t.Destination, t.ClassId }).ToListAsync();

        var journals = await _db.JournalEntries.Where(j => ids.Contains(j.UserId))
            .GroupBy(j => j.UserId)
            .Select(g => new { userId = g.Key, count = g.Count(), last = g.Max(j => j.CreatedAt) })
            .ToListAsync();

        // No photos here — the summary only needs who/when/how far.
        var attendance = await _db.TripAttendance
            .Where(a => tripIds.Contains(a.TripId) && ids.Contains(a.UserId))
            .Select(a => new { a.TripId, a.DayDate, a.UserId, a.Present, a.CheckedInAt, a.DistanceMeters })
            .ToListAsync();

        var daySettings = await _db.TripDaySettings.Where(d => tripIds.Contains(d.TripId))
            .Select(d => new { d.TripId, d.DayDate, d.MeetingPlaceName })
            .ToListAsync();

        // A tour day = a day with a meeting point set, or with any check-in.
        var days = daySettings.Select(d => (d.TripId, d.DayDate))
            .Concat(attendance.Select(a => (a.TripId, a.DayDate)))
            .Distinct()
            .OrderByDescending(d => d.DayDate).ThenBy(d => d.TripId)
            .ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8)); // Philippine time

        // One row per tour day per class student who is on that trip.
        var rows = days.SelectMany(d =>
        {
            var trip = trips.FirstOrDefault(t => t.Id == d.TripId);
            return onTrip.Where(o => o.Id == d.TripId).Select(o => o.UserId).Distinct()
                .Select(uid =>
                {
                    var s = students.First(u => u.Id == uid);
                    var a = attendance.FirstOrDefault(x => x.TripId == d.TripId && x.DayDate == d.DayDate && x.UserId == uid);
                    var present = a != null && a.Present;
                    return new
                    {
                        tripId = d.TripId,
                        tripTitle = trip == null ? null : Trip.DisplayName(trip.TripName, trip.Destination),
                        date = d.DayDate.ToString("yyyy-MM-dd"),
                        upcoming = d.DayDate > today,
                        userId = uid,
                        firstName = s.FirstName,
                        lastName = s.LastName,
                        studentNumber = s.StudentNumber,
                        present,
                        checkedInAt = present ? a!.CheckedInAt : null,
                        distanceMeters = present ? a!.DistanceMeters : null,
                        markedManually = present && a!.CheckedInAt == null,
                    };
                });
        }).ToList();

        var tourDays = days.Select(d =>
        {
            var trip = trips.FirstOrDefault(t => t.Id == d.TripId);
            var date = d.DayDate.ToString("yyyy-MM-dd");
            var dayRows = rows.Where(r => r.tripId == d.TripId && r.date == date).ToList();
            return new
            {
                tripId = d.TripId,
                tripTitle = trip == null ? null : Trip.DisplayName(trip.TripName, trip.Destination),
                destination = trip?.Destination,
                isClassTrip = trip?.ClassId != null,
                date,
                upcoming = d.DayDate > today,
                meetingPlace = daySettings.FirstOrDefault(x => x.TripId == d.TripId && x.DayDate == d.DayDate)?.MeetingPlaceName,
                expected = dayRows.Count,
                present = dayRows.Count(r => r.present),
                absentIds = dayRows.Where(r => !r.present).Select(r => r.userId).ToList(),
            };
        }).ToList();

        var studentRows = students.Select(u =>
        {
            var j = journals.FirstOrDefault(x => x.userId == u.Id);
            var myRows = rows.Where(r => r.userId == u.Id && !r.upcoming).ToList();
            return new
            {
                userId = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                studentNumber = u.StudentNumber,
                email = u.Email,
                avatarUrl = u.AvatarUrl,
                tripsCount = onTrip.Where(o => o.UserId == u.Id).Select(o => o.Id).Distinct().Count(),
                tourDaysSoFar = myRows.Count,
                presentDays = myRows.Count(r => r.present),
                missedDays = myRows.Count(r => !r.present),
                lastCheckInAt = myRows.Where(r => r.present).Max(r => r.checkedInAt),
                journalsCount = j?.count ?? 0,
                lastJournalAt = j?.last,
            };
        }).ToList();

        return Ok(new
        {
            classId,
            className = ClassLabel(cls),
            students = studentRows,
            tourDays,
            attendance = rows,
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

        var result = await AddStudentToClassAsync(cls, me);
        if (result is OkObjectResult)
        {
            // Let the teacher know who joined.
            var studentName = NotificationHelper.FullName(me);
            await NotificationHelper.CreateAsync(
                _db, cls.TeacherId, NotificationHelper.StudentJoined,
                $"{studentName} joined your class {ClassLabel(cls)}.",
                $"/teacher/class/{cls.Id}",
                new { actorName = studentName, className = ClassLabel(cls) },
                $"student_joined:{cls.Id}:{me.Id}");
        }
        return result;
    }
}