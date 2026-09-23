# Modern Standby Wake Agent

Windows Modern Standby PC를 외부 명령으로 깨우기 위한 실험용 에이전트입니다.

## 현재 방식

Windows Task Scheduler의 `WakeToRun` 예약 작업이 주기적으로 PC를 깨웁니다.
에이전트는 외부 Wake API의 대기 요청을 확인하고 요청이 있으면 시스템을 일정 시간 깨어 있게 유지합니다.
Remote Desktop Commander처럼 절전 해제 후 자동 재연결되는 프로그램과 함께 사용할 수 있습니다.

## 구성

- `windows/`: .NET 8 Windows 에이전트
- `server/`: Wake 요청을 보관하고 에이전트 폴링/확인을 처리하는 Node.js API
- `server/test/`: API 인증 및 wake/poll/ack 계약 테스트

## 개발

```powershell
npm test
dotnet build .\windows\WakeAgent.Windows.csproj -c Release
```

현재 개발 버전은 `v0.1.0-dev1`입니다.
실제 원격 기상에는 인터넷에서 접근 가능한 Node.js 서버와 Windows `WakeToRun` 예약 작업 설정이 필요합니다.
