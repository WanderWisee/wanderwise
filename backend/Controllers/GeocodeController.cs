using System.Linq;
using System.Net.Http;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace WanderWiseApi.Controllers
{
    // A small server-side proxy for Nominatim geocoding. This exists
    // because calling Nominatim straight from the browser (fetch) can get
    // rate-limited/blocked and shows up as a confusing "CORS policy"
    // error — going through our own backend avoids that entirely, and
    // lets us cache + retry like we already do in PlacesController.
    [ApiController]
    [Route("api/geocode")]
    public class GeocodeController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private static readonly Dictionary<string, (DateTime CachedAt, object Data)> _cache = new();
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

        public GeocodeController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public async Task<IActionResult> Geocode([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { message = "query is required" });
            }

            var cacheKey = query.Trim().ToLowerInvariant();

            if (_cache.TryGetValue(cacheKey, out var cached) &&
                DateTime.UtcNow - cached.CachedAt < CacheDuration)
            {
                return Ok(cached.Data);
            }

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WanderWiseApp/1.0 (capstone project; geilonnromulo2@gmail.com)");

            string? lastError = null;
            int? lastStatus = null;
            string? lastBody = null;

            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    var url = $"https://nominatim.openstreetmap.org/search?format=json&q={Uri.EscapeDataString(query)}&limit=1&countrycodes=ph";
                    var response = await client.GetAsync(url);
                    var body = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        lastStatus = (int)response.StatusCode;
                        lastBody = body;
                        if (attempt == 1) { await Task.Delay(600); continue; }
                        return Ok(new { found = false, error = "non_success_status", status = lastStatus, body = lastBody });
                    }

                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
                    {
                        var notFound = new { found = false, error = "no_results", rawBody = body };
                        _cache[cacheKey] = (DateTime.UtcNow, notFound);
                        return Ok(notFound);
                    }

                    var first = doc.RootElement[0];
                    var lat = double.Parse(first.GetProperty("lat").GetString()!, System.Globalization.CultureInfo.InvariantCulture);
                    var lon = double.Parse(first.GetProperty("lon").GetString()!, System.Globalization.CultureInfo.InvariantCulture);

                    var result = new { found = true, lat, lon };
                    _cache[cacheKey] = (DateTime.UtcNow, result);
                    return Ok(result);
                }
                catch (Exception ex)
                {
                    lastError = ex.GetType().Name + ": " + ex.Message;
                    if (attempt == 1) { await Task.Delay(600); continue; }
                    return Ok(new { found = false, error = "exception", message = lastError });
                }
            }

            return Ok(new { found = false, error = "exhausted_retries", lastError, lastStatus, lastBody });
        }
    }
}