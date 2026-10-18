using System.Net.Http;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace WanderWiseApi.Controllers
{
    // A small server-side proxy for looking up a real photo for a
    // destination by name. The Profile page used to call Wikipedia
    // directly from the browser — that works most of the time, but a
    // direct browser fetch to a free public API like this can get
    // intermittently rate-limited/blocked (same class of issue we hit
    // with Nominatim geocoding), especially when several destinations'
    // photos are all requested at once on a fresh page load. Going
    // through our own backend avoids that, and lets us cache + retry
    // like PlacesController/GeocodeController do.
    //
    // This uses the MediaWiki Action API (prop=pageimages, pithumbsize)
    // instead of the REST "page/summary" endpoint. The summary endpoint's
    // thumbnail URL points at Wikimedia's static thumbnail server
    // (thumb.wikimedia.org), which only serves a fixed, pre-approved list
    // of widths for direct/hotlinked requests — asking for an arbitrary
    // width like 800px on that server returns an error page instead of an
    // image ("Use thumbnail sizes listed on ..."). The Action API instead
    // generates the thumbnail itself and hands back an already-valid URL
    // at (up to) the requested size, so no manual URL-resizing hack is
    // needed or safe to do.
    [ApiController]
    [Route("api/destination-image")]
    public class DestinationImageController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private static readonly Dictionary<string, (DateTime CachedAt, object Data)> _cache = new();
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

        public DestinationImageController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public async Task<IActionResult> GetImage([FromQuery] string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "name is required" });
            }

            var cacheKey = name.Trim().ToLowerInvariant();

            if (_cache.TryGetValue(cacheKey, out var cached) &&
                DateTime.UtcNow - cached.CachedAt < CacheDuration)
            {
                return Ok(cached.Data);
            }

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WanderWiseApp/1.0 (capstone project; geilonnromulo2@gmail.com)");

            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    var url = "https://en.wikipedia.org/w/api.php" +
                        "?action=query&format=json&redirects=1" +
                        "&prop=pageimages&pithumbsize=800" +
                        $"&titles={Uri.EscapeDataString(name)}";
                    var response = await client.GetAsync(url);

                    if (!response.IsSuccessStatusCode)
                    {
                        if (attempt == 1) { await Task.Delay(600); continue; }
                        var failed = new { found = false, url = (string?)null };
                        _cache[cacheKey] = (DateTime.UtcNow, failed);
                        return Ok(failed);
                    }

                    var body = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(body);

                    string? foundUrl = null;
                    if (doc.RootElement.TryGetProperty("query", out var query) &&
                        query.TryGetProperty("pages", out var pages))
                    {
                        // "pages" is an object keyed by page id, e.g. {"12345": {...}} —
                        // there's exactly one entry for a single-title lookup.
                        foreach (var page in pages.EnumerateObject())
                        {
                            if (page.Value.TryGetProperty("thumbnail", out var thumb) &&
                                thumb.TryGetProperty("source", out var thumbSrc))
                            {
                                foundUrl = thumbSrc.GetString();
                            }
                            break;
                        }
                    }

                    // Some articles (e.g. "Boracay") have no lead image set, so the
                    // lookup above finds nothing. Fall back to the best-matching
                    // photo on Wikimedia Commons for that name.
                    if (foundUrl == null)
                    {
                        foundUrl = await CommonsPhotoAsync(client, name.Trim());
                    }

                    var result = new { found = foundUrl != null, url = foundUrl };
                    _cache[cacheKey] = (DateTime.UtcNow, result);
                    return Ok(result);
                }
                catch (Exception)
                {
                    if (attempt == 1) { await Task.Delay(600); continue; }
                    var failed = new { found = false, url = (string?)null };
                    return Ok(failed);
                }
            }

            var exhausted = new { found = false, url = (string?)null };
            return Ok(exhausted);
        }

        // Searches Wikimedia Commons for a photo (jpg/png) of the place and
        // returns a ready-made thumbnail URL, or null if none is found.
        private static async Task<string?> CommonsPhotoAsync(HttpClient client, string name)
        {
            try
            {
                var url = "https://commons.wikimedia.org/w/api.php" +
                    "?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8" +
                    "&prop=imageinfo&iiprop=url|mime&iiurlwidth=800" +
                    $"&gsrsearch={Uri.EscapeDataString(name + " filetype:bitmap")}";
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return null;

                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                if (!doc.RootElement.TryGetProperty("query", out var query) ||
                    !query.TryGetProperty("pages", out var pages)) return null;

                string? best = null;
                var bestIndex = int.MaxValue;
                foreach (var page in pages.EnumerateObject())
                {
                    var index = page.Value.TryGetProperty("index", out var ix) ? ix.GetInt32() : int.MaxValue;
                    if (index >= bestIndex) continue;
                    if (!page.Value.TryGetProperty("imageinfo", out var infos) || infos.GetArrayLength() == 0) continue;
                    var info = infos[0];
                    var mime = info.TryGetProperty("mime", out var m) ? m.GetString() : null;
                    if (mime != "image/jpeg" && mime != "image/png") continue;
                    var thumb = info.TryGetProperty("thumburl", out var t) ? t.GetString() : null;
                    if (string.IsNullOrEmpty(thumb)) continue;
                    best = thumb;
                    bestIndex = index;
                }
                return best;
            }
            catch
            {
                return null;
            }
        }
    }
}