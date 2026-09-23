using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

namespace WanderWiseApi.Controllers;

[ApiController]
public class PlacesController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public PlacesController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("/api/places")]
    public async Task<IActionResult> GetPlaces([FromQuery] string destination)
    {
        if (string.IsNullOrWhiteSpace(destination))
            return BadRequest(new { error = "A destination is required." });

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("WanderWise-CapstoneApp/1.0");

        var geoUrl = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(destination + ", Philippines")}&format=json&limit=1";
        var geoResp = await client.GetAsync(geoUrl);
        if (!geoResp.IsSuccessStatusCode)
            return StatusCode(502, new { error = "Failed to look up that destination's location." });

        var geoJson = await geoResp.Content.ReadAsStringAsync();
        using var geoDoc = JsonDocument.Parse(geoJson);
        if (geoDoc.RootElement.GetArrayLength() == 0)
            return NotFound(new { error = $"Could not find '{destination}' on the map." });

        var first = geoDoc.RootElement[0];
        var lat = first.GetProperty("lat").GetString();
        var lon = first.GetProperty("lon").GetString();

        var overpassQuery = $@"
[out:json][timeout:25];
(
  node[""tourism""](around:15000,{lat},{lon});
  way[""tourism""](around:15000,{lat},{lon});
);
out center 30;";

        var overpassContent = new StringContent(overpassQuery, Encoding.UTF8, "text/plain");
        var overpassResp = await client.PostAsync("https://overpass-api.de/api/interpreter", overpassContent);
        if (!overpassResp.IsSuccessStatusCode)
            return StatusCode(502, new { error = "Failed to fetch places for that destination." });

        var overpassJson = await overpassResp.Content.ReadAsStringAsync();
        using var overpassDoc = JsonDocument.Parse(overpassJson);

        var results = new List<object>();
        if (overpassDoc.RootElement.TryGetProperty("elements", out var elements))
        {
            foreach (var el in elements.EnumerateArray())
            {
                if (!el.TryGetProperty("tags", out var tags)) continue;
                if (!tags.TryGetProperty("name", out var nameProp)) continue;

                var name = nameProp.GetString();
                var tourismType = tags.TryGetProperty("tourism", out var t) ? t.GetString() : null;

                double? elLat = null, elLon = null;
                if (el.TryGetProperty("lat", out var latProp)) elLat = latProp.GetDouble();
                if (el.TryGetProperty("lon", out var lonProp)) elLon = lonProp.GetDouble();
                if (elLat is null && el.TryGetProperty("center", out var center))
                {
                    elLat = center.GetProperty("lat").GetDouble();
                    elLon = center.GetProperty("lon").GetDouble();
                }

                results.Add(new { name, type = tourismType, lat = elLat, lon = elLon });
            }
        }

        return Ok(new { destination, lat, lon, places = results });
    }
}