using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace WanderWiseApi.Controllers;

// Sends a real push notification through OneSignal to every device the
// user is logged in on — the laptop's browser and the Android app — even
// when WanderWise is closed. Each device is linked to the user with
// OneSignal "login" using the WanderWise user id (see the web's
// oneSignal.js and the mobile app).
//
// Needs these in backend/.env (from OneSignal → Settings → Keys & IDs):
//   ONESIGNAL_APP_ID=...
//   ONESIGNAL_API_KEY=...
//   WEB_BASE_URL=http://localhost:3000   (where the website runs)
// If they're missing, nothing is sent and the app works as before.
public static class OneSignalPush
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(8) };

    public static async Task SendAsync(int userId, string message, string? link)
    {
        var appId = Environment.GetEnvironmentVariable("ONESIGNAL_APP_ID");
        var apiKey = Environment.GetEnvironmentVariable("ONESIGNAL_API_KEY");
        if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(apiKey)) return;

        var webBase = (Environment.GetEnvironmentVariable("WEB_BASE_URL") ?? "http://localhost:3000").TrimEnd('/');

        var body = new Dictionary<string, object?>
        {
            ["app_id"] = appId,
            ["target_channel"] = "push",
            ["include_aliases"] = new { external_id = new[] { userId.ToString() } },
            ["headings"] = new { en = "WanderWise!" },
            ["contents"] = new { en = message },
            // The mobile app reads "link" to open the right screen.
            ["data"] = new { link },
        };
        // Clicking the pop-up on the laptop opens the right page.
        if (!string.IsNullOrWhiteSpace(link)) body["web_url"] = webBase + link;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.onesignal.com/notifications?c=push")
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Key", apiKey);

            using var response = await Http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[OneSignal] Push failed ({(int)response.StatusCode}): {error}");
            }
        }
        catch (Exception ex)
        {
            // Never let a push problem break saving the notification.
            Console.WriteLine($"[OneSignal] Push error: {ex.Message}");
        }
    }
}