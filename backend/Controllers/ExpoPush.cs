using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WanderWiseApi.Data;

namespace WanderWiseApi.Controllers;

// Push notifications for the mobile app (Android APK), sent through the
// Expo Push service. The app saves its push token with
// POST /api/me/push-token after logging in (see PushTokensController).
// Expo hands the message to Firebase (FCM), which shows it on the phone
// even when WanderWise is closed. No API key is needed here: the Firebase
// key is stored in EAS (eas credentials).
public static class ExpoPush
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(8) };
    private const string SendUrl = "https://exp.host/--/api/v2/push/send";

    public static async Task SendAsync(WanderWiseDbContext db, int userId, string type, string message, string? link)
    {
        try
        {
            var tokens = await db.PushTokens
                .Where(p => p.UserId == userId)
                .Select(p => p.Token)
                .ToListAsync();
            if (tokens.Count == 0) return;

            var messages = tokens.Select(token => new Dictionary<string, object?>
            {
                ["to"] = token,
                ["title"] = "WanderWise",
                ["body"] = message,
                ["sound"] = "default",
                ["priority"] = "high",
                ["channelId"] = "default",
                // The app reads these to open the right screen when tapped.
                ["data"] = new { link, type },
            }).ToList();

            using var request = new HttpRequestMessage(HttpMethod.Post, SendUrl)
            {
                Content = new StringContent(JsonSerializer.Serialize(messages), Encoding.UTF8, "application/json"),
            };
            request.Headers.Add("Accept", "application/json");

            using var response = await Http.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"[ExpoPush] Push failed ({(int)response.StatusCode}): {body}");
                return;
            }

            // Expo answers with one ticket per token, in the same order.
            // "DeviceNotRegistered" means the app was uninstalled: forget it.
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("data", out var tickets) || tickets.ValueKind != JsonValueKind.Array) return;
            var dead = new List<string>();
            var i = 0;
            foreach (var ticket in tickets.EnumerateArray())
            {
                if (i < tokens.Count &&
                    ticket.TryGetProperty("status", out var status) && status.GetString() == "error" &&
                    ticket.TryGetProperty("details", out var details) &&
                    details.TryGetProperty("error", out var error) && error.GetString() == "DeviceNotRegistered")
                {
                    dead.Add(tokens[i]);
                }
                i++;
            }
            if (dead.Count > 0)
            {
                db.PushTokens.RemoveRange(db.PushTokens.Where(p => dead.Contains(p.Token)));
                await db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            // Never let a push problem break saving the notification
            // (for example, before database/6_push_tokens.sql was run).
            Console.WriteLine($"[ExpoPush] Push error: {ex.Message}");
        }
    }
}
