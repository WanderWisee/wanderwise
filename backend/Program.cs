using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Threading.RateLimiting;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WanderWiseApi.Data;
using WanderWiseApi.Controllers;
using WanderWiseApi.Services;
using WanderWiseApi.Models;

// Load DB_*, JWT_SECRET, etc. from backend/.env (same convention as the
// old Node.js backend). On Railway there is no .env file: the same names
// are set in the service's Variables tab instead.
if (File.Exists(".env")) Env.Load();

// Keep the JWT "sub" claim as "sub" instead of ASP.NET Core's default
// remapping to a long .NET claim type URI — simpler to read in controllers.
JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

var builder = WebApplication.CreateBuilder(args);

var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "127.0.0.1";
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "3306";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "root";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "wanderwise";
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET is missing — check backend/.env");

var connectionString = $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPassword};";

builder.Services.AddDbContext<WanderWiseDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<EmailService>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Lets the Overpass/Nominatim calls in PlacesController actually work.
builder.Services.AddHttpClient();

// Allows the React dev server (localhost:3000) and Expo web to call this API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
        // 3000 = web (npm start); 8081 / 19006 = mobile app opened in a
        // browser with Expo ("w" in npx expo start).
        policy.WithOrigins("http://localhost:3000", "http://localhost:8081", "http://localhost:19006")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();

// ---- Rate limiting: stops one person or script from flooding the API ----
// The real visitor IP is the first one in X-Forwarded-For (Railway, and
// Vercel for the website, sit in front of the API). The numbers are
// generous on purpose: a whole class on the same school Wi-Fi shares one
// IP, and a demo must never get blocked.
static string ClientIp(HttpContext ctx)
{
    var forwarded = ctx.Request.Headers["X-Forwarded-For"].ToString();
    if (!string.IsNullOrWhiteSpace(forwarded)) return forwarded.Split(',')[0].Trim();
    return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"error\":\"Too many requests. Please wait a minute and try again.\"}", cancellationToken);
    };

    // Every request: 300 a minute per logged-in user, 600 a minute per IP
    // for requests without a login (shared school Wi-Fi).
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var userId = context.User.FindFirst("sub")?.Value;
        var key = userId != null ? $"user:{userId}" : $"ip:{ClientIp(context)}";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = userId != null ? 300 : 600,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });

    // Log in, sign up and password reset: 60 a minute per IP. Each account
    // also locks after too many wrong passwords/codes (AttemptGuard).
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter($"auth:{ClientIp(context)}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});
builder.Services.AddHostedService<WanderWiseApi.Controllers.TripReminderService>();

var app = builder.Build();


// Built-in ADMIN account, from backend/.env (only the dev team knows it):
//   ADMIN_EMAIL=admin@12345
//   ADMIN_PASSWORD=yourpassword
// Created on startup if missing; if it exists, it's kept an active admin
// and its password follows .env. No sign-up needed for the admin.
var seedAdminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL")?.Trim();
var seedAdminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");
if (!string.IsNullOrWhiteSpace(seedAdminEmail) && !string.IsNullOrWhiteSpace(seedAdminPassword))
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WanderWiseDbContext>();
        var admin = db.Users.FirstOrDefault(u => u.Email == seedAdminEmail);
        if (admin is null)
        {
            db.Users.Add(new User
            {
                StudentNumber = "ADMIN",
                Email = seedAdminEmail,
                FirstName = "WanderWise",
                LastName = "Admin",
                DateOfBirth = new DateOnly(2000, 1, 1),
                CellphoneNumber = "",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedAdminPassword),
                Role = PortalAccess.RoleAdmin,
                AccountStatus = PortalAccess.StatusActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            admin.Role = PortalAccess.RoleAdmin;
            admin.AccountStatus = PortalAccess.StatusActive;
            if (!BCrypt.Net.BCrypt.Verify(seedAdminPassword, admin.PasswordHash))
            {
                admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedAdminPassword);
                admin.UpdatedAt = DateTime.UtcNow;
            }
        }
        db.SaveChanges();
        Console.WriteLine($"Admin account ready: {seedAdminEmail}");
    }
    catch (Exception ex)
    {
        // e.g. 3_roles_classes_admin.sql not run yet — the API still starts.
        Console.WriteLine($"Admin account not created: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

// Server errors are written to the activity log (Admin → Activity log),
// so the admin can see what broke, when, and for whom.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        try
        {
            using var scope = context.RequestServices.CreateScope();
            var logDb = scope.ServiceProvider.GetRequiredService<WanderWiseDbContext>();
            int? userId = int.TryParse(context.User.FindFirst("sub")?.Value, out var uid) ? uid : null;
            await ActivityLogger.LogAsync(logDb, userId, ActivityLogger.ServerError,
                $"{context.Request.Method} {context.Request.Path}: {ex.GetType().Name}: {ex.Message}", context);
        }
        catch
        {
            // never hide the original error
        }
        throw;
    }
});

app.UseAuthentication();

// Deactivated accounts (Admin → Users) are logged out on their next
// request, even if their login token hasn't expired yet.
app.Use(async (context, next) =>
{
    if (int.TryParse(context.User.FindFirst("sub")?.Value, out var userId))
    {
        var db = context.RequestServices.GetRequiredService<WanderWiseDbContext>();
        if (!await AccountGuard.IsActiveAsync(db, userId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "account_inactive" });
            return;
        }
    }
    await next();
});

app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.Run();