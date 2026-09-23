using System.Text.Json;

namespace ModernStandbyWakeAgent;

public sealed class AgentConfig
{
    public required string Endpoint { get; init; }
    public required string DeviceId { get; init; }
    public required string DeviceSecret { get; init; }
    public int HoldAwakeSeconds { get; init; } = 90;
    public string? PostWakeCommand { get; init; }

    public static string DataDirectory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ModernStandbyWakeAgent");

    public static string ConfigPath => Path.Combine(DataDirectory, "config.json");

    public static AgentConfig Load()
    {        if (!File.Exists(ConfigPath))
            throw new FileNotFoundException($"Configuration not found: {ConfigPath}");

        var json = File.ReadAllText(ConfigPath);
        var config = JsonSerializer.Deserialize<AgentConfig>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (config is null ||
            string.IsNullOrWhiteSpace(config.Endpoint) ||
            string.IsNullOrWhiteSpace(config.DeviceId) ||
            string.IsNullOrWhiteSpace(config.DeviceSecret))
        {
            throw new InvalidDataException("Configuration is incomplete.");
        }

        return config;
    }
}
