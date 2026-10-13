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
// Teachers: classes, roster, each student's trips/attendance/journals,
// class announcements, itinerary assignments + grading. Teachers don't
// make itineraries — they review the students' own trips (read-only).
// Students: join with a code, read announcements, hand in a trip for an
// assignment, see their grade.
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

    private static DateTime? ParseUtc(string? raw) =>
        !string.IsNullOrWhiteSpace(raw) &&
        DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.AdjustToUniversal |
                                     System.Globalization.DateTimeStyles.AssumeUniversal, out var d)
            ? d
            : null;

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
                assignmentCount = _db.ClassAssignments.Count(a => a.ClassId == c.Id),
                toGradeCount = _db.AssignmentSubmissions.Count(s => s.GradedAt == null &&
                    _db.ClassAssignments.Any(a => a.Id == s.AssignmentId && a.ClassId == c.Id)),
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

    // Deletes the class (roster, announcements, assignments, grades).
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
            var assignmentIds = await _db.ClassAssignments.Where(a => a.ClassId == classId).Select(a => a.Id).ToListAsync();
            var subs = await _db.AssignmentSubmissions.Where(s => assignmentIds.Contains(s.AssignmentId))
                .Select(s => new { s.StudentId, s.Score }).ToListAsync();

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
                    submittedCount = subs.Count(s => s.StudentId == r.u.Id),
                    assignmentsCount = assignmentIds.Count,
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
    // location), journal posts and grades in this class.
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

        var assignments = await _db.ClassAssignments.Where(a => a.ClassId == classId)
            .OrderBy(a => a.DueAt == null).ThenBy(a => a.DueAt).ToListAsync();
        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var submissions = await _db.AssignmentSubmissions
            .Where(s => s.StudentId == studentId && assignmentIds.Contains(s.AssignmentId))
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
            grades = assignments.Select(a =>
            {
                var s = submissions.FirstOrDefault(x => x.AssignmentId == a.Id);
                return new
                {
                    assignmentId = a.Id,
                    title = a.Title,
                    points = a.Points,
                    dueAt = a.DueAt,
                    submissionId = s?.Id,
                    tripId = s?.TripId,
                    submittedAt = s?.SubmittedAt,
                    late = s != null && a.DueAt != null && s.SubmittedAt > a.DueAt,
                    score = s?.Score,
                    feedback = s?.Feedback,
                };
            }),
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

    // ================= Assignments =================

    // Teacher: with how many handed in / graded.
    // Student: with their own submission and grade.
    [HttpGet("/api/classes/{classId:int}/assignments")]
    public async Task<IActionResult> GetAssignments(int classId)
    {
        var (cls, role) = await LoadClassAsync(classId);
        if (cls is null) return NotFound();

        var assignments = await _db.ClassAssignments
            .Where(a => a.ClassId == classId)
            .OrderBy(a => a.DueAt == null).ThenBy(a => a.DueAt).ThenByDescending(a => a.CreatedAt)
            .ToListAsync();
        var ids = assignments.Select(a => a.Id).ToList();
        var subs = role == "teacher"
            ? await _db.AssignmentSubmissions.Where(s => ids.Contains(s.AssignmentId)).ToListAsync()
            : await _db.AssignmentSubmissions.Where(s => ids.Contains(s.AssignmentId) && s.StudentId == CurrentUserId).ToListAsync();
        var tripIds = subs.Select(s => s.TripId).Distinct().ToList();
        var trips = await _db.Trips.Where(t => tripIds.Contains(t.Id))
            .Select(t => new { t.Id, t.Title, t.Destination }).ToListAsync();
        var studentCount = await _db.ClassMembers.CountAsync(m => m.ClassId == classId);

        return Ok(assignments.Select(a =>
        {
            var mine = role == "student" ? subs.FirstOrDefault(s => s.AssignmentId == a.Id) : null;
            var trip = mine != null ? trips.FirstOrDefault(t => t.Id == mine.TripId) : null;
            return new
            {
                id = a.Id,
                title = a.Title,
                instructions = a.Instructions,
                destination = a.Destination,
                budgetLimit = a.BudgetLimit,
                dueAt = a.DueAt,
                points = a.Points,
                createdAt = a.CreatedAt,
                submittedCount = role == "teacher" ? subs.Count(s => s.AssignmentId == a.Id) : (int?)null,
                gradedCount = role == "teacher" ? subs.Count(s => s.AssignmentId == a.Id && s.GradedAt != null) : (int?)null,
                studentCount = role == "teacher" ? studentCount : (int?)null,
                mySubmission = mine == null ? null : new
                {
                    id = mine.Id,
                    tripId = mine.TripId,
                    tripTitle = trip?.Title,
                    tripDestination = trip?.Destination,
                    note = mine.Note,
                    submittedAt = mine.SubmittedAt,
                    late = a.DueAt != null && mine.SubmittedAt > a.DueAt,
                    score = mine.Score,
                    feedback = mine.Feedback,
                    gradedAt = mine.GradedAt,
                },
            };
        }));
    }

    private static string? ValidateAssignment(SaveAssignmentRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Title)) return "title_required";
        if (r.Points < 1 || r.Points > 1000) return "bad_points";
        if (r.BudgetLimit is < 0) return "bad_budget";
        return null;
    }

    [HttpPost("/api/classes/{classId:int}/assignments")]
    public async Task<IActionResult> CreateAssignment(int classId, [FromBody] SaveAssignmentRequest request)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        var err = ValidateAssignment(request);
        if (err != null) return BadRequest(new { error = err });

        var a = new ClassAssignment
        {
            ClassId = classId,
            Title = request.Title.Trim(),
            Instructions = request.Instructions?.Trim(),
            Destination = string.IsNullOrWhiteSpace(request.Destination) ? null : request.Destination.Trim(),
            BudgetLimit = request.BudgetLimit,
            DueAt = ParseUtc(request.DueAt),
            Points = request.Points,
            CreatedAt = DateTime.UtcNow,
        };
        _db.ClassAssignments.Add(a);
        await _db.SaveChangesAsync();

        var teacher = await _db.Users.FindAsync(CurrentUserId);
        var teacherName = NotificationHelper.FullName(teacher);
        var studentIds = await _db.ClassMembers.Where(m => m.ClassId == classId).Select(m => m.StudentId).ToListAsync();
        foreach (var sid in studentIds)
        {
            await NotificationHelper.CreateAsync(
                _db, sid, NotificationHelper.AssignmentPosted,
                $"New assignment in {ClassLabel(cls)}: {a.Title}",
                $"/classes/{classId}?tab=assignments",
                new { actorName = teacherName, className = ClassLabel(cls), title = a.Title },
                $"assignment_posted:{a.Id}");
        }

        return Ok(new { id = a.Id });
    }

    [HttpPut("/api/classes/{classId:int}/assignments/{assignmentId:int}")]
    public async Task<IActionResult> UpdateAssignment(int classId, int assignmentId, [FromBody] SaveAssignmentRequest request)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        var a = await _db.ClassAssignments.FirstOrDefaultAsync(x => x.Id == assignmentId && x.ClassId == classId);
        if (a is null) return NotFound();
        var err = ValidateAssignment(request);
        if (err != null) return BadRequest(new { error = err });

        a.Title = request.Title.Trim();
        a.Instructions = request.Instructions?.Trim();
        a.Destination = string.IsNullOrWhiteSpace(request.Destination) ? null : request.Destination.Trim();
        a.BudgetLimit = request.BudgetLimit;
        a.DueAt = ParseUtc(request.DueAt);
        a.Points = request.Points;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("/api/classes/{classId:int}/assignments/{assignmentId:int}")]
    public async Task<IActionResult> DeleteAssignment(int classId, int assignmentId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        var a = await _db.ClassAssignments.FirstOrDefaultAsync(x => x.Id == assignmentId && x.ClassId == classId);
        if (a is null) return NotFound();
        _db.ClassAssignments.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Teacher: every student in the class with their submission (if any).
    [HttpGet("/api/classes/{classId:int}/assignments/{assignmentId:int}/submissions")]
    public async Task<IActionResult> GetSubmissions(int classId, int assignmentId)
    {
        var cls = await LoadMyClassAsTeacherAsync(classId);
        if (cls is null) return NotFound();
        var a = await _db.ClassAssignments.FirstOrDefaultAsync(x => x.Id == assignmentId && x.ClassId == classId);
        if (a is null) return NotFound();

        var students = await _db.ClassMembers
            .Where(m => m.ClassId == classId)
            .Join(_db.Users, m => m.StudentId, u => u.Id, (m, u) => u)
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .ToListAsync();
        var subs = await _db.AssignmentSubmissions.Where(s => s.AssignmentId == assignmentId).ToListAsync();
        var tripIds = subs.Select(s => s.TripId).ToList();
        var trips = await _db.Trips.Where(t => tripIds.Contains(t.Id)).ToListAsync();
        var placeCounts = await _db.TripPlaces.Where(p => tripIds.Contains(p.TripId))
            .GroupBy(p => p.TripId).Select(g => new { tripId = g.Key, count = g.Count() }).ToListAsync();
        var spent = await _db.Expenses.Where(e => tripIds.Contains(e.TripId))
            .GroupBy(e => e.TripId).Select(g => new { tripId = g.Key, total = g.Sum(e => e.Amount) }).ToListAsync();

        return Ok(new
        {
            assignment = new
            {
                id = a.Id,
                classId,
                className = ClassLabel(cls),
                title = a.Title,
                instructions = a.Instructions,
                destination = a.Destination,
                budgetLimit = a.BudgetLimit,
                dueAt = a.DueAt,
                points = a.Points,
            },
            rows = students.Select(u =>
            {
                var s = subs.FirstOrDefault(x => x.StudentId == u.Id);
                var t = s != null ? trips.FirstOrDefault(x => x.Id == s.TripId) : null;
                int? days = t?.StartDate != null && t.EndDate != null
                    ? t.EndDate.Value.DayNumber - t.StartDate.Value.DayNumber + 1
                    : null;
                return new
                {
                    student = new
                    {
                        userId = u.Id,
                        firstName = u.FirstName,
                        lastName = u.LastName,
                        studentNumber = u.StudentNumber,
                        avatarUrl = u.AvatarUrl,
                    },
                    submission = s == null ? null : new
                    {
                        id = s.Id,
                        note = s.Note,
                        submittedAt = s.SubmittedAt,
                        late = a.DueAt != null && s.SubmittedAt > a.DueAt,
                        score = s.Score,
                        feedback = s.Feedback,
                        gradedAt = s.GradedAt,
                        trip = t == null ? null : new
                        {
                            id = t.Id,
                            title = t.Title,
                            destination = t.Destination,
                            startDate = t.StartDate?.ToString("yyyy-MM-dd"),
                            endDate = t.EndDate?.ToString("yyyy-MM-dd"),
                            days,
                            placesCount = placeCounts.FirstOrDefault(p => p.tripId == t.Id)?.count ?? 0,
                            budgetTotal = t.BudgetTotal,
                            spent = spent.FirstOrDefault(x => x.tripId == t.Id)?.total ?? 0,
                        },
                    },
                };
            }),
        });
    }

    [HttpPut("/api/teacher/submissions/{submissionId:int}/grade")]
    public async Task<IActionResult> GradeSubmission(int submissionId, [FromBody] GradeSubmissionRequest request)
    {
        if (!await IAmTeacherAsync()) return Forbid();
        var s = await _db.AssignmentSubmissions.FirstOrDefaultAsync(x => x.Id == submissionId);
        if (s is null) return NotFound();
        var a = await _db.ClassAssignments.FirstOrDefaultAsync(x => x.Id == s.AssignmentId);
        var cls = a == null ? null : await LoadMyClassAsTeacherAsync(a.ClassId);
        if (a is null || cls is null) return NotFound();

        if (request.Score is < 0 || request.Score > a.Points)
            return BadRequest(new { error = "bad_score", max = a.Points });

        s.Score = request.Score;
        s.Feedback = string.IsNullOrWhiteSpace(request.Feedback) ? null : request.Feedback.Trim();
        s.GradedAt = request.Score == null ? null : DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (s.Score != null)
        {
            var teacher = await _db.Users.FindAsync(CurrentUserId);
            var teacherName = NotificationHelper.FullName(teacher);
            await NotificationHelper.CreateAsync(
                _db, s.StudentId, NotificationHelper.AssignmentGraded,
                $"{teacherName} graded your \"{a.Title}\": {s.Score:0.##}/{a.Points}",
                $"/classes/{a.ClassId}?tab=assignments",
                new { actorName = teacherName, title = a.Title, score = s.Score?.ToString("0.##"), points = a.Points },
                $"assignment_graded:{s.Id}:{s.GradedAt:yyyyMMddHHmmss}");
        }

        return NoContent();
    }

    // Student hands in (or replaces, until it's graded) one of their own trips.
    [HttpPost("/api/classes/{classId:int}/assignments/{assignmentId:int}/submit")]
    public async Task<IActionResult> Submit(int classId, int assignmentId, [FromBody] SubmitAssignmentRequest request)
    {
        var (cls, role) = await LoadClassAsync(classId);
        if (cls is null || role != "student") return NotFound();
        var a = await _db.ClassAssignments.FirstOrDefaultAsync(x => x.Id == assignmentId && x.ClassId == classId);
        if (a is null) return NotFound();

        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == request.TripId && t.UserId == CurrentUserId);
        if (trip is null) return BadRequest(new { error = "not_your_trip" });

        var s = await _db.AssignmentSubmissions.FirstOrDefaultAsync(x => x.AssignmentId == assignmentId && x.StudentId == CurrentUserId);
        if (s?.GradedAt != null) return Conflict(new { error = "already_graded" });

        if (s == null)
        {
            s = new AssignmentSubmission { AssignmentId = assignmentId, StudentId = CurrentUserId };
            _db.AssignmentSubmissions.Add(s);
        }
        s.TripId = trip.Id;
        s.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        s.SubmittedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var me = await _db.Users.FindAsync(CurrentUserId);
        var myName = NotificationHelper.FullName(me);
        await NotificationHelper.CreateAsync(
            _db, cls.TeacherId, NotificationHelper.AssignmentSubmitted,
            $"{myName} handed in \"{a.Title}\" ({ClassLabel(cls)}).",
            $"/teacher/class/{classId}/assignment/{a.Id}",
            new { actorName = myName, title = a.Title, className = ClassLabel(cls) },
            $"assignment_submitted:{s.Id}:{s.SubmittedAt:yyyyMMddHHmmss}");

        return Ok(new { id = s.Id });
    }

    [HttpDelete("/api/classes/{classId:int}/assignments/{assignmentId:int}/submit")]
    public async Task<IActionResult> Unsubmit(int classId, int assignmentId)
    {
        var (cls, role) = await LoadClassAsync(classId);
        if (cls is null || role != "student") return NotFound();
        var s = await _db.AssignmentSubmissions.FirstOrDefaultAsync(x => x.AssignmentId == assignmentId && x.StudentId == CurrentUserId);
        if (s is null) return NotFound();
        if (s.GradedAt != null) return Conflict(new { error = "already_graded" });
        _db.AssignmentSubmissions.Remove(s);
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
        var assignments = await _db.ClassAssignments.Where(a => classIds.Contains(a.ClassId))
            .Select(a => new { a.Id, a.ClassId }).ToListAsync();
        var aIds = assignments.Select(a => a.Id).ToList();
        var mySubs = await _db.AssignmentSubmissions.Where(s => s.StudentId == CurrentUserId && aIds.Contains(s.AssignmentId))
            .Select(s => s.AssignmentId).ToListAsync();

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
                todoCount = assignments.Count(a => a.ClassId == c.Id && !mySubs.Contains(a.Id)),
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
