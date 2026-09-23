# WakeToRun polling fallback

이 디렉터리는 초기 WakeToRun 주기 폴링 방식의 보존본입니다.

정상 운용 경로에는 사용하지 않습니다. 주 경로는 외부 Wake API가 요청 즉시 UDP Magic Packet을 보내고, Windows Intel AX201의 Modern Standby wake 기능이 이를 직접 처리하는 방식입니다.

이 fallback은 Magic Packet 경로를 사용할 수 없는 환경에서만 별도 검토 후 사용할 수 있습니다. 주기적으로 시스템을 깨우므로 기본 설치·자동 등록 대상이 아닙니다.
