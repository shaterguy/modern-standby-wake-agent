using System.Runtime.InteropServices;

namespace ModernStandbyWakeAgent;

public sealed class PowerKeeper : IDisposable
{
    [Flags]
    private enum ExecutionState : uint
    {
        SystemRequired = 0x00000001,
        Continuous = 0x80000000
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern ExecutionState SetThreadExecutionState(ExecutionState esFlags);

    private bool _active;

    private PowerKeeper()
    {
        var result = SetThreadExecutionState(
            ExecutionState.Continuous | ExecutionState.SystemRequired);
        if (result == 0)
            throw new InvalidOperationException(
                $"SetThreadExecutionState failed: {Marshal.GetLastWin32Error()}");

        _active = true;
    }
    public static PowerKeeper HoldSystemAwake() => new();

    public void Dispose()
    {
        if (!_active) return;
        SetThreadExecutionState(ExecutionState.Continuous);
        _active = false;
    }
}
