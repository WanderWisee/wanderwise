using System.Linq;
using System.Net.Http;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace WanderWise.Controllers
{
    [ApiController]
    [Route("api/places")]
    public class PlacesController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private static readonly Dictionary<string, (DateTime CachedAt, object Data)> _cache = new();
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

        public PlacesController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public async Task<IActionResult> GetPlaces([FromQuery] string destination)
        {
            if (string.IsNullOrWhiteSpace(destination))
            {
                return BadRequest(new { message = "destination is required" });
            }

            var cacheKey = destination.Trim().ToLowerInvariant();

            // Serve from cache if we have a recent successful result
            if (_cache.TryGetValue(cacheKey, out var cached) &&
                DateTime.UtcNow - cached.CachedAt < CacheDuration)
            {
                return Ok(cached.Data);
            }

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WanderWiseApp/1.0 (capstone project; geilonnromulo2@gmail.com)");

            double? lat = null;
            double? lon = null;
            // Bounding box of the searched place itself (south, north, west, east),
            // used instead of a fixed-radius circle so results stay inside the
            // actual place searched instead of leaking into a neighboring town.
            double? bboxSouth = null, bboxNorth = null, bboxWest = null, bboxEast = null;
            string? geocodeError = null;
            int? geocodeStatus = null;
            string? geocodeBody = null;

            // Step 1: Geocode the destination via Nominatim, with 1 retry
            for (int attempt = 1; attempt <= 2 && lat == null; attempt++)
            {
                try
                {
                    // countrycodes=ph forces the match to stay inside the Philippines
                    // (otherwise a name like "Lucena" can match Lucena, Spain instead of Lucena City, PH)
                    var nominatimUrl =
                        $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(destination + ", Philippines")}&format=json&limit=1&countrycodes=ph";

                    var response = await client.GetAsync(nominatimUrl);
                    var body = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        geocodeStatus = (int)response.StatusCode;
                        geocodeBody = body;
                        geocodeError = "Nominatim returned a non-success status.";
                        if (attempt == 1) { await Task.Delay(800); continue; }
                        break;
                    }

                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
                    {
                        geocodeError = "No matching location found for that destination.";
                        break;
                    }

                    var first = doc.RootElement[0];
                    lat = double.Parse(first.GetProperty("lat").GetString()!, System.Globalization.CultureInfo.InvariantCulture);
                    lon = double.Parse(first.GetProperty("lon").GetString()!, System.Globalization.CultureInfo.InvariantCulture);

                    // Nominatim's boundingbox = [south, north, west, east] as strings
                    if (first.TryGetProperty("boundingbox", out var bboxProp) && bboxProp.GetArrayLength() == 4)
                    {
                        var bboxArr = bboxProp.EnumerateArray().Select(e => e.GetString()).ToArray();
                        bboxSouth = double.Parse(bboxArr[0]!, System.Globalization.CultureInfo.InvariantCulture);
                        bboxNorth = double.Parse(bboxArr[1]!, System.Globalization.CultureInfo.InvariantCulture);
                        bboxWest = double.Parse(bboxArr[2]!, System.Globalization.CultureInfo.InvariantCulture);
                        bboxEast = double.Parse(bboxArr[3]!, System.Globalization.CultureInfo.InvariantCulture);
                    }
                }
                catch (Exception ex)
                {
                    geocodeError = ex.Message;
                    if (attempt == 1) { await Task.Delay(800); continue; }
                }
            }

            if (lat == null || lon == null)
            {
                // Geocoding failed after retry — degrade gracefully instead of breaking the UI
                var emptyResult = new
                {
                    destination,
                    lat = (double?)null,
                    lon = (double?)null,
                    places = new List<object>(),
                    warning = "Could not look up this destination right now. Try again in a bit.",
                    upstreamStatus = geocodeStatus,
                    upstreamBody = geocodeBody,
                    upstreamError = geocodeError
                };
                return Ok(emptyResult);
            }

            // Step 2: Query Overpass for nearby tourist places, with 1 retry
            var places = new List<object>();
            string? overpassError = null;
            int? overpassStatus = null;
            string? overpassBody = null;

            string areaFilter;
            if (bboxSouth != null && bboxNorth != null && bboxWest != null && bboxEast != null)
            {
                // Confine results to the actual searched place's bounding box
                // (south,west,north,east) instead of a circle that can spill
                // into a neighboring town.
                areaFilter = string.Format(
                    System.Globalization.CultureInfo.InvariantCulture,
                    "({0},{1},{2},{3})",
                    bboxSouth, bboxWest, bboxNorth, bboxEast);
            }
            else
            {
                // Fallback: no bounding box available, use a tighter 6km radius
                areaFilter = string.Format(
                    System.Globalization.CultureInfo.InvariantCulture,
                    "(around:6000,{0},{1})", lat.Value, lon.Value);
            }

            var overpassQuery = $@"
                [out:json][timeout:15];
                (
                  node[""tourism""]{areaFilter};
                  way[""tourism""]{areaFilter};
                );
                out center 40;";

            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    var content = new FormUrlEncodedContent(new[]
                    {
                        new KeyValuePair<string, string>("data", overpassQuery)
                    });

                    var response = await client.PostAsync("https://overpass-api.de/api/interpreter", content);
                    var body = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        overpassStatus = (int)response.StatusCode;
                        overpassBody = body;
                        overpassError = "Overpass returned a non-success status.";
                        if (attempt == 1) { await Task.Delay(800); continue; }
                        break;
                    }

                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("elements", out var elements))
                    {
                        foreach (var el in elements.EnumerateArray())
                        {
                            string? name = null;
                            if (el.TryGetProperty("tags", out var tags) && tags.TryGetProperty("name", out var nameProp))
                            {
                                name = nameProp.GetString();
                            }
                            if (string.IsNullOrWhiteSpace(name)) continue;

                            double? pLat = null;
                            double? pLon = null;

                            if (el.TryGetProperty("lat", out var latProp) && el.TryGetProperty("lon", out var lonProp))
                            {
                                pLat = latProp.GetDouble();
                                pLon = lonProp.GetDouble();
                            }
                            else if (el.TryGetProperty("center", out var centerProp))
                            {
                                pLat = centerProp.GetProperty("lat").GetDouble();
                                pLon = centerProp.GetProperty("lon").GetDouble();
                            }

                            if (pLat == null || pLon == null) continue;

                            string? type = null;
                            if (el.TryGetProperty("tags", out var tags2) && tags2.TryGetProperty("tourism", out var typeProp))
                            {
                                type = typeProp.GetString();
                            }

                            places.Add(new
                            {
                                name,
                                type = type ?? "attraction",
                                lat = pLat.Value,
                                lon = pLon.Value
                            });

                            if (places.Count >= 20) break;
                        }
                    }

                    overpassError = null;
                    break;
                }
                catch (Exception ex)
                {
                    overpassError = ex.Message;
                    if (attempt == 1) { await Task.Delay(800); continue; }
                }
            }

            var result = new
            {
                destination,
                lat,
                lon,
                places,
                warning = places.Count == 0
                    ? "No nearby places found, or the places service is temporarily unavailable."
                    : null,
                upstreamStatus = overpassStatus,
                upstreamBody = overpassBody,
                upstreamError = overpassError
            };

            // Cache successful (non-empty) results so repeated lookups are instant and don't hit the rate limit
            if (places.Count > 0)
            {
                _cache[cacheKey] = (DateTime.UtcNow, result);
            }

            return Ok(result);
        }
    }
}