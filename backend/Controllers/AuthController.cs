using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;
using WanderWiseApi.DTOs;
using WanderWiseApi.Models;
using WanderWiseApi.Services;

namespace WanderWiseApi.Controllers;

[ApiController]
public class AuthController : ControllerBase
{
    private static readonly Regex SchoolEmailRegex = new(
        @"^[^@\s]+@student\.mseuf\.edu\.ph$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Faculty/staff email for TEACHER sign-up (not the student domain).
    // Change this one line if your school uses a different domain.
    private static readonly Regex TeacherEmailRegex = new(
        @"^[^@\s]+@mseuf\.edu\.ph$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly WanderWiseDbContext _db;
    private readonly JwtService _jwt;
    private readonly EmailService _email;

    public AuthController(WanderWiseDbContext db, JwtService jwt, EmailService email)
    {
        _db = db;
        _jwt = jwt;
        _email = email;
    }

    // ---------------- Registration ----------------

    [HttpPost("/api/register/send-otp")]
    public async Task<IActionResult> SendRegisterOtp([FromBody] RegisterSendOtpRequest request)
    {
        var schoolEmail = request.SchoolEmail?.Trim() ?? "";
        var recoveryEmail = request.RecoveryEmail?.Trim() ?? "";

        if (!SchoolEmailRegex.IsMatch(schoolEmail))
            return BadRequest(new { error = "Please use your official @student.mseuf.edu.ph email." });

        if (string.IsNullOrWhiteSpace(recoveryEmail))
            return BadRequest(new { error = "A personal/recovery email is required." });

        var alreadyRegistered = await _db.Users.AnyAsync(u => u.Email == schoolEmail);
        if (alreadyRegistered)
            return Conflict(new { error = "An account with that school email already exists." });

        var code = GenerateCode();
        _db.OtpCodes.Add(new OtpCode
        {
            Email = schoolEmail,
            Purpose = "register",
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        await _email.SendOtpEmailAsync(recoveryEmail, code, "register");

        return Ok(new { message = "Verification code sent to your personal email." });
    }

    [HttpPost("/api/register")]
    public async Task<IActionResult> Register([FromBody] RegisterCompleteRequest request)
    {
        var schoolEmail = request.SchoolEmail?.Trim() ?? "";

        if (!SchoolEmailRegex.IsMatch(schoolEmail))
            return BadRequest(new { error = "Please use your official @student.mseuf.edu.ph email." });

        if (string.IsNullOrWhiteSpace(request.RecoveryEmail))
            return BadRequest(new { error = "A recovery email is required." });

        if (request.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters." });

        var alreadyRegistered = await _db.Users.AnyAsync(u => u.Email == schoolEmail);
        if (alreadyRegistered)
            return Conflict(new { error = "An account with that school email already exists." });

        var otpValid = await VerifyOtpAsync(schoolEmail, "register", request.OtpCode);
        if (!otpValid)
            return BadRequest(new { error = "Invalid or expired verification code." });

        if (!TryParseDob(request.Dob, out var dob))
            return BadRequest(new { error = "Invalid date of birth." });

        var studentNumber = schoolEmail.Split('@')[0].ToUpperInvariant();

        var user = new User
        {
            StudentNumber = studentNumber,
            Email = schoolEmail,
            RecoveryEmail = request.RecoveryEmail.Trim(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            DateOfBirth = dob,
            CellphoneNumber = request.Cellphone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.RegisterStudent, user.Email, HttpContext);

        var token = _jwt.GenerateToken(user);
        return Ok(new AuthResponse
        {
            Token = token,
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role,
        });
    }

    // ---------------- Teacher registration ----------------
    // Same OTP flow as students, but with the faculty email + employee ID.
    // The account is active right away (no admin approval) and logged in.

    [HttpPost("/api/register/teacher/send-otp")]
    public async Task<IActionResult> SendTeacherRegisterOtp([FromBody] TeacherSendOtpRequest request)
    {
        var schoolEmail = request.SchoolEmail?.Trim() ?? "";
        var recoveryEmail = request.RecoveryEmail?.Trim() ?? "";
        var employeeId = request.EmployeeId?.Trim().ToUpperInvariant() ?? "";

        if (!TeacherEmailRegex.IsMatch(schoolEmail))
            return BadRequest(new { error = "Please use your official @mseuf.edu.ph faculty email." });
        if (string.IsNullOrWhiteSpace(recoveryEmail))
            return BadRequest(new { error = "A personal/recovery email is required." });
        if (string.IsNullOrWhiteSpace(employeeId) || employeeId.Length > 20)
            return BadRequest(new { error = "Please enter your employee ID (up to 20 characters)." });

        if (await _db.Users.AnyAsync(u => u.Email == schoolEmail))
            return Conflict(new { error = "An account with that email already exists." });
        if (await _db.Users.AnyAsync(u => u.StudentNumber == employeeId))
            return Conflict(new { error = "That employee ID is already registered." });

        var code = GenerateCode();
        _db.OtpCodes.Add(new OtpCode
        {
            Email = schoolEmail,
            Purpose = "register_teacher",
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        await _email.SendOtpEmailAsync(recoveryEmail, code, "register");

        return Ok(new { message = "Verification code sent to your personal email." });
    }

    [HttpPost("/api/register/teacher")]
    public async Task<IActionResult> RegisterTeacher([FromBody] TeacherRegisterRequest request)
    {
        var schoolEmail = request.SchoolEmail?.Trim() ?? "";
        var employeeId = request.EmployeeId?.Trim().ToUpperInvariant() ?? "";

        if (!TeacherEmailRegex.IsMatch(schoolEmail))
            return BadRequest(new { error = "Please use your official @mseuf.edu.ph faculty email." });
        if (string.IsNullOrWhiteSpace(request.RecoveryEmail))
            return BadRequest(new { error = "A recovery email is required." });
        if (string.IsNullOrWhiteSpace(employeeId) || employeeId.Length > 20)
            return BadRequest(new { error = "Please enter your employee ID (up to 20 characters)." });
        if (request.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters." });

        if (await _db.Users.AnyAsync(u => u.Email == schoolEmail))
            return Conflict(new { error = "An account with that email already exists." });
        if (await _db.Users.AnyAsync(u => u.StudentNumber == employeeId))
            return Conflict(new { error = "That employee ID is already registered." });

        if (!await VerifyOtpAsync(schoolEmail, "register_teacher", request.OtpCode))
            return BadRequest(new { error = "Invalid or expired verification code." });

        if (!TryParseDob(request.Dob, out var dob))
            return BadRequest(new { error = "Invalid date of birth." });

        var user = new User
        {
            StudentNumber = employeeId,
            Email = schoolEmail,
            RecoveryEmail = request.RecoveryEmail.Trim(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            DateOfBirth = dob,
            CellphoneNumber = request.Cellphone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = PortalAccess.RoleTeacher,
            AccountStatus = PortalAccess.StatusActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.RegisterTeacher, $"{user.Email} ({employeeId})", HttpContext);

        // Logged in right away, like the student sign-up.
        var token = _jwt.GenerateToken(user);
        return Ok(new AuthResponse
        {
            Token = token,
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role,
        });
    }

    // ---------------- Login ----------------

    [HttpPost("/api/login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // The "username" can be the school email or the ID number
        // (student number for students, employee ID for teachers).
        var login = request.Email?.Trim() ?? "";
        var user = login.Length == 0
            ? null
            : await _db.Users.FirstOrDefaultAsync(u => u.Email == login || u.StudentNumber == login);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await ActivityLogger.LogAsync(_db, user?.Id, ActivityLogger.LoginFailed, login, HttpContext);
            return Unauthorized(new { error = "Invalid username or password." });
        }

        if (user.AccountStatus == PortalAccess.StatusPending)
        {
            await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.LoginBlocked, "pending approval", HttpContext);
            return StatusCode(403, new { error = "Your teacher account is still waiting for admin approval.", code = "pending" });
        }
        if (user.AccountStatus != PortalAccess.StatusActive)
        {
            await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.LoginBlocked, "deactivated", HttpContext);
            return StatusCode(403, new { error = "This account has been deactivated. Please contact the admin.", code = "deactivated" });
        }

        // Where the login comes from:
        //   "web"  → the one web log in page (/login): every account type
        //            logs in there and the web app opens the right pages
        //            for the account's role.
        //   anything else (the mobile app sends nothing) → students only,
        //            because teachers and admins are web only.
        var portal = (request.Portal ?? "").Trim().ToLowerInvariant();
        if (portal != "web" && portal != PortalAccess.RoleTeacher && portal != PortalAccess.RoleAdmin) portal = PortalAccess.RoleStudent;
        if (portal != "web" && user.Role != portal)
        {
            await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.LoginBlocked, $"{user.Role} account on the {portal} login", HttpContext);
            var code = user.Role == PortalAccess.RoleTeacher ? "use_teacher_login"
                : user.Role == PortalAccess.RoleAdmin ? "use_admin_login"
                : "use_student_login";
            return StatusCode(403, new { error = "Please use the log in page for your account type.", code });
        }

        await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.LoginSuccess, user.Role, HttpContext);

        var token = _jwt.GenerateToken(user);
        return Ok(new AuthResponse
        {
            Token = token,
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role,
        });
    }

    // ---------------- Current user ----------------

    [Authorize]
    [HttpGet("/api/me")]
    public async Task<IActionResult> Me()
    {
        var userId = int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        return Ok(new MeResponse
        {
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            RecoveryEmail = user.RecoveryEmail,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            Location = user.Location,
            Role = user.Role,
            StudentNumber = user.StudentNumber,
        });
    }

    // Saves the profile picture as a base64 data URL — simplest option
    // for a capstone project without needing separate file storage.
    [Authorize]
    [HttpPut("/api/me/avatar")]
    public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.AvatarUrl = request.AvatarBase64;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { avatarUrl = user.AvatarUrl });
    }

    // Saves the bio/location shown on the public profile (search feature).
    [Authorize]
    [HttpPut("/api/me/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.Bio = request.Bio;
        user.Location = request.Location;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { bio = user.Bio, location = user.Location });
    }

    // ---------------- Forgot password ----------------

    [HttpPost("/api/forgot-password/send-otp")]
    public async Task<IActionResult> SendResetOtp([FromBody] ForgotPasswordSendOtpRequest request)
    {
        var schoolEmail = request.SchoolEmail?.Trim() ?? "";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == schoolEmail);
        if (user is null)
            return NotFound(new { error = "No account found with that school email." });

        if (string.IsNullOrWhiteSpace(user.RecoveryEmail))
            return BadRequest(new { error = "This account has no recovery email on file." });

        var code = GenerateCode();
        _db.OtpCodes.Add(new OtpCode
        {
            Email = schoolEmail,
            Purpose = "reset",
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        await _email.SendOtpEmailAsync(user.RecoveryEmail, code, "reset");

        return Ok(new { message = "A verification code was sent to your recovery email." });
    }

    [HttpPost("/api/forgot-password/reset")]
    public async Task<IActionResult> ResetPassword([FromBody] ForgotPasswordResetRequest request)
    {
        var schoolEmail = request.SchoolEmail?.Trim() ?? "";

        if (request.NewPassword.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters." });

        var otpValid = await VerifyOtpAsync(schoolEmail, "reset", request.OtpCode);
        if (!otpValid)
            return BadRequest(new { error = "Invalid or expired verification code." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == schoolEmail);
        if (user is null) return NotFound();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await ActivityLogger.LogAsync(_db, user.Id, ActivityLogger.PasswordReset, user.Email, HttpContext);

        // Security alert on every device the account is logged in on, so
        // the owner finds out if someone else reset their password. Always
        // sent — it has no on/off switch in Settings.
        await NotificationHelper.CreateAsync(
            _db, user.Id, NotificationHelper.PasswordChanged,
            "Your WanderWise password was changed. If this wasn't you, reset it right away.",
            null,
            new { });

        return Ok(new { message = "Password updated successfully." });
    }

    // ---------------- Helpers ----------------

    private static string GenerateCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    private async Task<bool> VerifyOtpAsync(string email, string purpose, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;

        var candidates = await _db.OtpCodes
            .Where(o => o.Email == email && o.Purpose == purpose && o.ConsumedAt == null && o.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var match = candidates.FirstOrDefault(o => BCrypt.Net.BCrypt.Verify(code, o.CodeHash));
        if (match is null) return false;

        match.ConsumedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private static bool TryParseDob(string raw, out DateOnly dob)
    {
        var formats = new[] { "MM/dd/yyyy", "yyyy-MM-dd", "M/d/yyyy" };
        foreach (var format in formats)
        {
            if (DateOnly.TryParseExact(raw, format, out dob))
                return true;
        }
        return DateOnly.TryParse(raw, out dob);
    }
}