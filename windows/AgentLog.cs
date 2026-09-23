namespace ModernStandbyWakeAgent;

public sealed class AgentLog
{
    private readonly string _path;

    public AgentLog()
    {
        Directory.CreateDirectory(AgentConfig.DataDirectory);
        _path = Path.Combine(AgentConfig.DataDirectory, "wake-agent.log");
    }

    public void Write(string message)
    {
        var line = $"{DateTimeOffset.Now:O} {message}{Environment.NewLine}";
        File.AppendAllText(_path, line);
    }
}
