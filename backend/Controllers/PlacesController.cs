using System.Collections.Concurrent;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace WanderWise.Controllers
{
    // Suggested places for the Trip Plan Builder, from OpenStreetMap:
    //   1. find where the destination is (Nominatim, with Photon as backup)
    //   2. look for places inside it (Overpass, with backup servers).
    //
    // These are free public servers with strict limits (Nominatim: 1 request
    // per second; Overpass: a couple of queries at a time per IP). Opening a
    // trip asks for "Where to go" AND every section ("Food", ...) at once, so
    // without the limits below most of those requests got rejected and the
    // page showed "Couldn't load suggested places" even for big cities.
    [ApiController]
    [Route("api/places")]
    public class PlacesController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PlacesController> _logger;

        // Finished results, per destination + category.
        private static readonly ConcurrentDictionary<string, (DateTime CachedAt, object Data)> _cache = new();
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

        // Where a destination is. Shared by every category, so "Where to go"
        // and "Food" for the same trip look the destination up only once.
        private sealed record GeoPoint(double Lat, double Lon, double? South, double? North, double? West, double? East);
        private static readonly ConcurrentDictionary<string, (DateTime CachedAt, GeoPoint Point)> _geoCache = new();
        private static readonly TimeSpan GeoCacheDuration = TimeSpan.FromDays(7);

        // Nominatim: one request at a time, at most one per second.
        private static readonly SemaphoreSlim _nominatimGate = new(1, 1);
        private static DateTime _lastNominatimCall = DateTime.MinValue;

        // Overpass: at most two queries at a time from this server.
        private static readonly SemaphoreSlim _overpassGate = new(2, 2);
        private static readonly string[] OverpassServers =
        {
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
        };

        // Optional ?category= for per-section suggestions in the Trip Plan
        // Builder (e.g. a section named "Lamon" asks for category=food).
        // Each entry is the OpenStreetMap tag filter(s) used in the Overpass
        // query, plus the tag key whose value is returned as the place "type".
        // No category (or an unknown one) = the original tourism search.
        private static readonly Dictionary<string, (string[] Filters, string TypeKey)> Categories = new()
        {
            ["food"] = (new[] { @"[""amenity""~""^(restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|bakery)$""]" }, "amenity"),
            ["hotel"] = (new[] { @"[""tourism""~""^(hotel|hostel|guest_house|motel|apartment|resort|chalet)$""]" }, "tourism"),
            ["shopping"] = (new[] { @"[""shop""~""^(mall|supermarket|department_store|gift|souvenir|convenience|clothes)$""]", @"[""amenity""=""marketplace""]" }, "shop"),
            ["beach"] = (new[] { @"[""natural""=""beach""]", @"[""leisure""=""beach_resort""]" }, "natural"),
            ["nature"] = (new[] { @"[""natural""~""^(peak|waterfall|cave_entrance|hot_spring|spring)$""]", @"[""leisure""~""^(park|nature_reserve|garden)$""]" }, "natural"),
            ["heritage"] = (new[] { @"[""historic""]", @"[""tourism""=""museum""]", @"[""amenity""=""place_of_worship""]" }, "historic"),
        };

        public PlacesController(IHttpClientFactory httpClientFactory, ILogger<PlacesController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetPlaces([FromQuery] string destination, [FromQuery] string? category = null)
        {
            if (string.IsNullOrWhiteSpace(destination))
            {
                return BadRequest(new { message = "destination is required" });
            }

            var categoryKey = (category ?? "").Trim().ToLowerInvariant();
            var hasCategory = Categories.TryGetValue(categoryKey, out var categoryDef);
            if (!hasCategory) categoryKey = "";

            // Category is part of the cache key so "Boracay" tourist spots and
            // "Boracay" food spots are cached separately.
            var cacheKey = destination.Trim().ToLowerInvariant() + "|" + categoryKey;

            // Serve from cache if we have a recent successful result
            if (_cache.TryGetValue(cacheKey, out var cached) &&
                DateTime.UtcNow - cached.CachedAt < CacheDuration)
            {
                return Ok(cached.Data);
            }

            // The whole lookup gets at most 30 seconds, so the page never
            // stays on "Loading suggested places..." for minutes when the
            // OpenStreetMap servers are slow or can't be reached.
            using var budget = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted);
            budget.CancelAfter(TimeSpan.FromSeconds(35));
            var ct = budget.Token;

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(25);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WanderWiseApp/1.0 (capstone project; geilonnromulo2@gmail.com)");

            // Step 1: where is the destination?
            var (geo, geocodeStatus, geocodeBody, geocodeError) = await GeocodeAsync(client, destination, ct);
            if (geo is null)
            {
                _logger.LogWarning("Places: couldn't find '{Destination}' ({Status}) {Error}", destination, geocodeStatus, geocodeError);
                // Degrade gracefully instead of breaking the UI
                return Ok(new
                {
                    destination,
                    lat = (double?)null,
                    lon = (double?)null,
                    places = new List<object>(),
                    warning = "Could not look up this destination right now. Try again in a bit.",
                    upstreamStatus = geocodeStatus,
                    upstreamBody = geocodeBody,
                    upstreamError = geocodeError
                });
            }

            // Step 2: places inside it.
            string areaFilter;
            var hasBox = geo.South != null && geo.North != null && geo.West != null && geo.East != null &&
                         geo.North - geo.South >= 0.01 && geo.East - geo.West >= 0.01;
            if (hasBox)
            {
                // Confine results to the actual searched place's bounding box
                // (south,west,north,east) instead of a circle that can spill
                // into a neighboring town.
                areaFilter = string.Format(CultureInfo.InvariantCulture,
                    "({0},{1},{2},{3})", geo.South, geo.West, geo.North, geo.East);
            }
            else
            {
                // No usable box (or just a point): use a 6km radius.
                areaFilter = string.Format(CultureInfo.InvariantCulture,
                    "(around:6000,{0},{1})", geo.Lat, geo.Lon);
            }

            // Default = tourist spots (original behaviour). With a category,
            // search that category's OSM tags inside the same area instead.
            var tagFilters = hasCategory ? categoryDef.Filters : new[] { @"[""tourism""]" };
            var typeKey = hasCategory ? categoryDef.TypeKey : "tourism";
            var selectors = string.Concat(tagFilters.Select(f =>
                $"\n                  node{f}{areaFilter};\n                  way{f}{areaFilter};"));

            var overpassQuery = $@"
                [out:json][timeout:12];
                ({selectors}
                );
                out center 40;";

            var (places, overpassStatus, overpassBody, overpassError) =
                await QueryOverpassAsync(client, overpassQuery, typeKey, hasCategory, categoryKey, ct);

            if (overpassError != null)
            {
                _logger.LogWarning("Places: Overpass failed for '{Destination}' ({Status}) {Error}", destination, overpassStatus, overpassError);
            }

            // Backup when every Overpass server is overloaded: ask Nominatim
            // for that kind of place inside the destination instead. Fewer
            // results, but far better than an empty list.
            var source = "overpass";
            if (places.Count == 0 && overpassError != null && !ct.IsCancellationRequested)
            {
                var backup = await NominatimPlacesAsync(client, geo, categoryKey, ct);
                if (backup.Count > 0)
                {
                    places = backup;
                    source = "nominatim";
                    _logger.LogInformation("Places: used Nominatim backup for '{Destination}' ({Count} places)", destination, backup.Count);
                }
            }

            var result = new
            {
                destination,
                category = hasCategory ? categoryKey : null,
                lat = (double?)geo.Lat,
                lon = (double?)geo.Lon,
                places,
                warning = places.Count == 0
                    ? "No nearby places found, or the places service is temporarily unavailable."
                    : null,
                source,
                upstreamStatus = places.Count == 0 ? overpassStatus : null,
                upstreamBody = places.Count == 0 ? overpassBody : null,
                upstreamError = places.Count == 0 ? overpassError : null
            };

            // Cache successful (non-empty) results so repeated lookups are instant and don't hit the rate limit
            if (places.Count > 0)
            {
                _cache[cacheKey] = (DateTime.UtcNow, result);
            }

            return Ok(result);
        }

        // ---------------- Step 1: geocoding ----------------

        private async Task<(GeoPoint? Point, int? Status, string? Body, string? Error)> GeocodeAsync(HttpClient client, string destination, CancellationToken ct)
        {
            var key = destination.Trim().ToLowerInvariant();
            if (_geoCache.TryGetValue(key, out var hit) && DateTime.UtcNow - hit.CachedAt < GeoCacheDuration)
            {
                return (hit.Point, null, null, null);
            }

            int? status = null;
            string? body = null;
            string? error = null;
            var notFound = false;

            try
            {
                await _nominatimGate.WaitAsync(ct);
            }
            catch (OperationCanceledException)
            {
                return (null, null, null, "Timed out waiting to look up the destination.");
            }
            try
            {
                // Another request may have looked it up while this one waited.
                if (_geoCache.TryGetValue(key, out hit) && DateTime.UtcNow - hit.CachedAt < GeoCacheDuration)
                {
                    return (hit.Point, null, null, null);
                }

                for (int attempt = 1; attempt <= 2; attempt++)
                {
                    // Nominatim's rule: no more than one request per second.
                    var since = DateTime.UtcNow - _lastNominatimCall;
                    var gap = TimeSpan.FromMilliseconds(attempt == 1 ? 1100 : 2000);
                    if (since < gap)
                    {
                        try { await Task.Delay(gap - since, ct); }
                        catch (OperationCanceledException) { error ??= "Timed out."; break; }
                    }
                    _lastNominatimCall = DateTime.UtcNow;

                    try
                    {
                        // countrycodes=ph forces the match to stay inside the Philippines
                        // (otherwise a name like "Lucena" can match Lucena, Spain instead of Lucena City, PH)
                        var url =
                            $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(destination + ", Philippines")}&format=json&limit=1&countrycodes=ph";
                        using var response = await client.GetAsync(url, ct);
                        var text = await response.Content.ReadAsStringAsync(ct);

                        if (!response.IsSuccessStatusCode)
                        {
                            status = (int)response.StatusCode;
                            body = Shorten(text);
                            error = $"Nominatim returned {(int)response.StatusCode}.";
                            continue;
                        }

                        using var doc = JsonDocument.Parse(text);
                        if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
                        {
                            error = "No matching location found for that destination.";
                            notFound = true;
                            break;
                        }

                        var first = doc.RootElement[0];
                        double? south = null, north = null, west = null, east = null;
                        // Nominatim's boundingbox = [south, north, west, east] as strings
                        if (first.TryGetProperty("boundingbox", out var box) && box.GetArrayLength() == 4)
                        {
                            var b = box.EnumerateArray().Select(e => ParseNum(e.GetString())).ToArray();
                            south = b[0]; north = b[1]; west = b[2]; east = b[3];
                        }

                        var lat = ParseNum(first.GetProperty("lat").GetString());
                        var lon = ParseNum(first.GetProperty("lon").GetString());
                        if (lat == null || lon == null)
                        {
                            error = "Nominatim sent a location without coordinates.";
                            break;
                        }

                        var point = new GeoPoint(lat.Value, lon.Value, south, north, west, east);
                        _geoCache[key] = (DateTime.UtcNow, point);
                        return (point, null, null, null);
                    }
                    catch (Exception ex)
                    {
                        error = $"Nominatim: {ex.Message}";
                        if (ct.IsCancellationRequested) break;
                    }
                }
            }
            finally
            {
                _nominatimGate.Release();
            }

            // Backup: Photon (same OpenStreetMap data, different server), for
            // when Nominatim is busy or blocking us. Not worth asking if
            // Nominatim already said the place doesn't exist.
            if (!notFound && !ct.IsCancellationRequested)
            {
                try
                {
                    var url = $"https://photon.komoot.io/api/?q={Uri.EscapeDataString(destination + ", Philippines")}&limit=5";
                    using var response = await client.GetAsync(url, ct);
                    if (response.IsSuccessStatusCode)
                    {
                        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                        if (doc.RootElement.TryGetProperty("features", out var features))
                        {
                            foreach (var feature in features.EnumerateArray())
                            {
                                var props = feature.GetProperty("properties");
                                if (!props.TryGetProperty("countrycode", out var cc) ||
                                    !string.Equals(cc.GetString(), "PH", StringComparison.OrdinalIgnoreCase))
                                {
                                    continue;
                                }

                                var coords = feature.GetProperty("geometry").GetProperty("coordinates");
                                var lon = coords[0].GetDouble();
                                var lat = coords[1].GetDouble();

                                double? south = null, north = null, west = null, east = null;
                                // Photon extent = [lon1, lat1, lon2, lat2]
                                if (props.TryGetProperty("extent", out var ext) && ext.GetArrayLength() == 4)
                                {
                                    double lon1 = ext[0].GetDouble(), lat1 = ext[1].GetDouble();
                                    double lon2 = ext[2].GetDouble(), lat2 = ext[3].GetDouble();
                                    south = Math.Min(lat1, lat2); north = Math.Max(lat1, lat2);
                                    west = Math.Min(lon1, lon2); east = Math.Max(lon1, lon2);
                                }

                                var point = new GeoPoint(lat, lon, south, north, west, east);
                                _geoCache[key] = (DateTime.UtcNow, point);
                                return (point, null, null, null);
                            }
                        }
                    }
                    else
                    {
                        error = (error ?? "") + $" Photon returned {(int)response.StatusCode}.";
                    }
                }
                catch (Exception ex)
                {
                    error = (error ?? "") + $" Photon: {ex.Message}";
                }
            }

            return (null, status, body, error?.Trim());
        }

        // ---------------- Step 2: places (Overpass) ----------------

        private async Task<(List<object> Places, int? Status, string? Body, string? Error)> QueryOverpassAsync(
            HttpClient client, string query, string typeKey, bool hasCategory, string categoryKey, CancellationToken ct)
        {
            try
            {
                await _overpassGate.WaitAsync(ct);
            }
            catch (OperationCanceledException)
            {
                return (new List<object>(), null, null, "Timed out waiting for the places server.");
            }

            try
            {
                // Ask all the servers at once and use the first good answer.
                // Asking them one after another took too long when the first
                // ones were overloaded (504) — the time ran out before the
                // last one was even tried.
                using var race = CancellationTokenSource.CreateLinkedTokenSource(ct);
                // Leave time for the Nominatim backup if they're all too busy.
                race.CancelAfter(TimeSpan.FromSeconds(15));
                var pending = OverpassServers
                    .Select(server => AskOverpassServerAsync(client, server, query, typeKey, hasCategory, categoryKey, race.Token))
                    .ToList();

                int? status = null;
                string? body = null;
                var errors = new List<string>();
                var answeredEmpty = false;

                while (pending.Count > 0)
                {
                    var finished = await Task.WhenAny(pending);
                    pending.Remove(finished);
                    var r = await finished;

                    if (r.Places != null && r.Places.Count > 0)
                    {
                        race.Cancel(); // stop waiting for the slower servers
                        return (r.Places, null, null, null);
                    }

                    if (r.Places != null)
                    {
                        // A real "nothing here" answer — keep it, but give the
                        // other servers a chance in case they know more.
                        answeredEmpty = true;
                        continue;
                    }

                    if (r.Status != null) { status = r.Status; body = r.Body; }
                    if (r.Error != null) errors.Add(r.Error);
                }

                if (answeredEmpty) return (new List<object>(), null, null, null);
                return (new List<object>(), status, body, string.Join(" | ", errors));
            }
            finally
            {
                _overpassGate.Release();
            }
        }

        // One Overpass server. Never throws: Places is null when it failed.
        private static async Task<(List<object>? Places, int? Status, string? Body, string? Error)> AskOverpassServerAsync(
            HttpClient client, string server, string query, string typeKey, bool hasCategory, string categoryKey, CancellationToken ct)
        {
            var host = new Uri(server).Host;
            try
            {
                using var content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("data", query)
                });

                using var response = await client.PostAsync(server, content, ct);
                var text = await response.Content.ReadAsStringAsync(ct);

                if (!response.IsSuccessStatusCode)
                {
                    return (null, (int)response.StatusCode, Shorten(text),
                        $"Overpass ({host}) returned {(int)response.StatusCode}.");
                }

                using var doc = JsonDocument.Parse(text);
                var places = ParsePlaces(doc, typeKey, hasCategory, categoryKey);

                // A busy server can answer 200 with no elements and a
                // "remark" saying the query timed out — that's a failure.
                if (places.Count == 0 && doc.RootElement.TryGetProperty("remark", out var remark))
                {
                    return (null, null, null, $"Overpass ({host}): {remark.GetString()}");
                }

                return (places, null, null, null);
            }
            catch (Exception ex)
            {
                // Timeouts, cancelled (another server answered first), or an
                // HTML error page instead of JSON.
                return (null, null, null, $"Overpass ({host}): {ex.Message}");
            }
        }

        // ---------------- Backup: Nominatim place search ----------------

        // Nominatim "special phrases" for each category. With a bounded
        // viewbox, q=[restaurant] returns restaurants inside that box.
        private static readonly Dictionary<string, string[]> NominatimKeywords = new()
        {
            [""] = new[] { "attraction", "museum", "park" },
            ["food"] = new[] { "restaurant", "cafe", "fast food" },
            ["hotel"] = new[] { "hotel", "resort" },
            ["shopping"] = new[] { "mall", "supermarket", "market" },
            ["beach"] = new[] { "beach" },
            ["nature"] = new[] { "park", "waterfall" },
            ["heritage"] = new[] { "church", "museum", "monument" },
        };

        private async Task<List<object>> NominatimPlacesAsync(HttpClient client, GeoPoint geo, string categoryKey, CancellationToken ct)
        {
            var places = new List<object>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!NominatimKeywords.TryGetValue(categoryKey, out var keywords)) keywords = NominatimKeywords[""];

            // The destination's box, or about 5km around it.
            double west = geo.West ?? geo.Lon - 0.05, east = geo.East ?? geo.Lon + 0.05;
            double south = geo.South ?? geo.Lat - 0.05, north = geo.North ?? geo.Lat + 0.05;
            var viewbox = string.Format(CultureInfo.InvariantCulture, "{0},{1},{2},{3}", west, north, east, south);

            try
            {
                await _nominatimGate.WaitAsync(ct);
            }
            catch (OperationCanceledException)
            {
                return places;
            }

            try
            {
                foreach (var keyword in keywords)
                {
                    if (places.Count >= 20 || ct.IsCancellationRequested) break;

                    // Nominatim's rule: no more than one request per second.
                    var since = DateTime.UtcNow - _lastNominatimCall;
                    var gap = TimeSpan.FromMilliseconds(1100);
                    if (since < gap)
                    {
                        try { await Task.Delay(gap - since, ct); }
                        catch (OperationCanceledException) { break; }
                    }
                    _lastNominatimCall = DateTime.UtcNow;

                    try
                    {
                        var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&bounded=1&countrycodes=ph" +
                                  $"&viewbox={viewbox}&q={Uri.EscapeDataString("[" + keyword + "]")}";
                        using var response = await client.GetAsync(url, ct);
                        if (!response.IsSuccessStatusCode)
                        {
                            _logger.LogWarning("Places: Nominatim backup '{Keyword}' returned {Status}", keyword, (int)response.StatusCode);
                            continue;
                        }

                        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                        if (doc.RootElement.ValueKind != JsonValueKind.Array) continue;

                        foreach (var item in doc.RootElement.EnumerateArray())
                        {
                            var name = item.TryGetProperty("name", out var n) ? n.GetString() : null;
                            if (string.IsNullOrWhiteSpace(name) || !seen.Add(name)) continue;

                            var lat = item.TryGetProperty("lat", out var la) ? ParseNum(la.GetString()) : null;
                            var lon = item.TryGetProperty("lon", out var lo) ? ParseNum(lo.GetString()) : null;
                            if (lat == null || lon == null) continue;

                            var type = item.TryGetProperty("type", out var t) ? t.GetString() : null;
                            places.Add(new
                            {
                                name,
                                type = type ?? (categoryKey.Length > 0 ? categoryKey : "attraction"),
                                lat = lat.Value,
                                lon = lon.Value,
                                isFree = false
                            });
                            if (places.Count >= 20) break;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("Places: Nominatim backup '{Keyword}' failed: {Error}", keyword, ex.Message);
                    }
                }
            }
            finally
            {
                _nominatimGate.Release();
            }

            return places;
        }

        private static List<object> ParsePlaces(JsonDocument doc, string typeKey, bool hasCategory, string categoryKey)
        {
            var places = new List<object>();
            if (!doc.RootElement.TryGetProperty("elements", out var elements)) return places;

            foreach (var el in elements.EnumerateArray())
            {
                if (!el.TryGetProperty("tags", out var tags)) continue;

                string? name = tags.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null;
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
                if (tags.TryGetProperty(typeKey, out var typeProp)) type = typeProp.GetString();
                else if (tags.TryGetProperty("amenity", out var amenityProp)) type = amenityProp.GetString();

                // OSM's "fee" tag says whether entry costs money.
                // Only an explicit "no" counts as free — a missing
                // tag means unknown, not free, so we never label a
                // paid place "Libre" by guessing.
                var isFree = tags.TryGetProperty("fee", out var feeProp) &&
                             string.Equals(feeProp.GetString(), "no", StringComparison.OrdinalIgnoreCase);

                places.Add(new
                {
                    name,
                    type = type ?? (hasCategory ? categoryKey : "attraction"),
                    lat = pLat.Value,
                    lon = pLon.Value,
                    isFree
                });

                if (places.Count >= 20) break;
            }

            return places;
        }

        private static double? ParseNum(string? s) =>
            double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : null;

        private static string Shorten(string text) =>
            text.Length > 300 ? text[..300] : text;
    }
}