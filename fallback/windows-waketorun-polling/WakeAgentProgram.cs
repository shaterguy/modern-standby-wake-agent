using System.Diagnostics;

namespace ModernStandbyWakeAgent;

public static class WakeAgentProgram
{
    public static async Task<int> RunAsync(string[] args)
    {
        var log = new AgentLog();
        var config = AgentConfig.Load();
        using var client = new WakeApiClient(config);
        var pending = await client.PollAsync();
        if (pending is null)
        {
            log.Write("No pending wake request.");
            return 0;
        }

        log.Write($"Wake request received: {pending.RequestId}");
        using var power = PowerKeeper.HoldSystemAwake();

        if (!string.IsNullOrWhiteSpace(config.PostWakeCommand))
        {
            StartPostWakeCommand(config.PostWakeCommand, log);
        }

        await client.AcknowledgeAsync(pending.RequestId);
        log.Write($"Wake request acknowledged: {pending.RequestId}");
        if (config.HoldAwakeSeconds > 0)
        {
            await Task.Delay(TimeSpan.FromSeconds(config.HoldAwakeSeconds));
        }

        log.Write("Wake hold completed.");
        return 0;
    }

    private static void StartPostWakeCommand(string command, AgentLog log)
    {
        var info = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = "-NoProfile -WindowStyle Hidden -Command " + command,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        Process.Start(info);
        log.Write("Post-wake command launched.");
    }
}
