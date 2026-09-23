using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace ModernStandbyWakeAgent;

public sealed class WakeApiClient : IDisposable
{
    private readonly HttpClient _http;

    public WakeApiClient(AgentConfig config)
    {
        _http = new HttpClient
        {
            BaseAddress = new Uri(config.Endpoint.TrimEnd('/') + "/"),
            Timeout = TimeSpan.FromSeconds(10)
        };
        _http.DefaultRequestHeaders.Add("x-device-id", config.DeviceId);
        _http.DefaultRequestHeaders.Add("x-device-secret", config.DeviceSecret);
    }

    public async Task<PendingWake?> PollAsync()
    {
        using var response = await _http.PostAsJsonAsync("api/poll", new { });
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<PollResponse>();
        return payload?.Pending;
    }
    public async Task AcknowledgeAsync(string requestId)
    {
        using var response = await _http.PostAsJsonAsync("api/ack", new { requestId });
        response.EnsureSuccessStatusCode();
    }

    public void Dispose() => _http.Dispose();

    public sealed record PendingWake(
        [property: JsonPropertyName("requestId")] string RequestId,
        [property: JsonPropertyName("createdAt")] string CreatedAt);

    private sealed record PollResponse(
        [property: JsonPropertyName("pending")] PendingWake? Pending);
}
