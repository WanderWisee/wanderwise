using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WanderWiseApi.Data;

namespace WanderWiseApi.Controllers;

// Runs inside the backend every minute and creates trip reminders for
// everyone with a trip happening today, starting tomorrow, or that ended
// yesterday — so the push
// arrives on time even if nobody has WanderWise open.
// Registered in Program.cs with:
//   builder.Services.AddHostedService<TripReminderService>();
public class TripReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public TripReminderService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<WanderWiseDbContext>();

                var now = DateTime.UtcNow.AddHours(8); // Philippine time
                var today = DateOnly.FromDateTime(now);
                var tomorrow = today.AddDays(1);
                var yesterday = today.AddDays(-1); // for "trip is over, write your story"

                var activeTrips = await db.Trips
                    .Where(t => t.StartDate != null && t.StartDate <= tomorrow
                                && (t.EndDate == null || t.EndDate >= yesterday))
                    .Select(t => new { t.Id, t.UserId })
                    .ToListAsync(stoppingToken);

                if (activeTrips.Count > 0)
                {
                    var tripIds = activeTrips.Select(t => t.Id).ToList();
                    var crewIds = await db.TripMembers
                        .Where(m => tripIds.Contains(m.TripId))
                        .Select(m => m.UserId)
                        .ToListAsync(stoppingToken);

                    var userIds = activeTrips.Select(t => t.UserId).Concat(crewIds).Distinct();
                    foreach (var userId in userIds)
                    {
                        await NotificationHelper.GenerateTripRemindersAsync(db, userId);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Reminders] {ex.Message}");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }
}