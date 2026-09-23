# Modern Standby Wake Agent

Windows Modern Standby PC를 사용자가 요청한 시점에만 즉시 깨우기 위한 Wake API입니다.

## 주 경로

```text
ChatGPT / client
  -> authenticated Wake API
  -> raw UDP Magic Packet
  -> Internet / NAT forwarding
  -> Wi-Fi adapter in Modern Standby
  -> Windows wake
  -> Remote Desktop Commander reconnect
```

주기적인 `WakeToRun` 폴링은 사용하지 않습니다. 초기 폴링 구현은 `fallback/windows-waketorun-polling/`에 참고용으로만 보존되어 있으며 기본 운용 대상이 아닙니다.

## 서버 환경 변수

- `DEVICE_ID`: 허용할 대상 장치 식별자.
- `WAKE_API_TOKEN`: `/api/wake` Bearer 인증 토큰.
- `WOL_MAC`: 대상 NIC MAC 주소.
- `WOL_HOST`: Magic Packet을 보낼 공인 IP 또는 라우팅 가능한 주소.
- `WOL_PORT`: NAT에서 전달할 UDP 포트.
- `WOL_REPEAT`: 한 요청당 반복 송신 횟수. 기본값 3.
- `PORT`: HTTP 서버 포트. 기본값 3000.
## API

`POST /api/wake`

요청:

```http
Authorization: Bearer <token>
Content-Type: application/json

{"deviceId":"<device-id>"}
```

정상 요청은 UDP Magic Packet 송신을 완료한 뒤 HTTP 200을 반환합니다.

실기 검증용 지연 송신은 `ALLOW_DELAYED_WAKE=1`일 때만 사용할 수 있으며 기본값은 비활성입니다. 정상 운용에서는 요청 즉시 송신합니다.

## 개발 및 테스트

```powershell
npm test
npm start
```

테스트에는 Magic Packet 바이트 구조와 API 인증·즉시 송신 계약 검증이 포함됩니다.

## 네트워크 전제

외부 인터넷에서 사설망의 무선 NIC로 전달하려면 각 NAT 단계에서 동일한 UDP 포트를 다음 홉으로 전달해야 합니다. 실제 IP·MAC·토큰은 저장소에 넣지 않고 배포 환경 변수와 라우터 설정에서 관리합니다.

현재 개발 버전은 `v0.1.0-dev3`입니다.
