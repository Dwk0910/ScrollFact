# 다른 컴퓨터에서 Docker로 테스트

## Windows에서 처음 실행

Git과 [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)만 설치한다. Docker Desktop은 Linux containers 모드로 실행한다. Node.js·Java·Gradle을 Windows에 따로 설치할 필요 없다.

PowerShell:

```powershell
git clone https://github.com/Dwk0910/ScrollFact.git
cd ScrollFact
.\start-test.cmd
```

이미 받은 저장소라면 `git pull --ff-only` 후 `start-test.cmd`를 실행한다. 탐색기에서 `start-test.cmd`를 더블클릭해도 된다. PowerShell 실행 정책을 변경하지 않는다. 첫 실행은 빌드 도구와 의존성 다운로드로 시간이 걸리며, 이후에는 Docker 빌드 캐시를 사용한다.

브라우저에서 http://127.0.0.1:8080 이 열리면:

1. **확장 프로그램 내려받기** → ZIP을 고정된 폴더에 압축 해제.
2. `chrome://extensions`, `whale://extensions` 또는 `edge://extensions` → 개발자 모드 → 압축 해제된 확장 프로그램 로드 → `manifest.json`이 들어 있는 폴더 선택.
3. 기사에서 확장을 열고 설정 → 계정에 로컬 프로필 ID 입력.
4. AI 연결에서 API 키 입력 → 모델 목록 불러오기 → 모델 선택 → 연결 적용. 키는 새 컴퓨터에서 처음 한 번 입력한다.
5. 기사 댓글을 불러온 뒤 **이 페이지 분석하기**. API 키 없이 전송만 검사하려면 설정에서 연결 점검 모드를 선택한다.

확장 설치는 브라우저에서 한 번 직접 해야 한다. ZIP을 다운로드하는 것만으로 자동 설치되지는 않는다. 서버가 준비된 것은 AI 인증·분석 성공과 다르며 모델 제공자의 오류는 별도다.

## macOS 또는 같은 명령으로 실행

```sh
./start-test.sh
# 또는 Windows/macOS 공통:
docker compose up --build -d --wait --wait-timeout 180
```

macOS Apple Silicon과 Windows x64는 각 Docker 이미지의 해당 아키텍처를 사용한다. 플랫폼을 한쪽으로 강제하지 않는다.

## 다시 시작·업데이트·종료

- 다시 켜기: `docker compose up -d --wait`
- 업데이트: `git pull --ff-only` 후 시작 스크립트 실행. 설치 페이지에서 새 ZIP을 받아 기존 확장 폴더에 덮어쓰고, 브라우저 확장 관리에서 새로고침 → 기사도 새로고침.
- 종료: `docker compose down` (프로필·키·설정 볼륨은 유지).
- 로그: `docker compose logs --tail 100`
- 상태: `docker compose ps`

기존 직접 실행 서버가 8080을 쓰면 해당 서버를 종료하거나 포트를 바꾼다. PowerShell에서 `$env:SCROLLFACT_PORT='18080'; .\start-test.cmd`, macOS에서 `SCROLLFACT_PORT=18080 ./start-test.sh`. 포트를 바꾸면 확장 설정의 서버 주소도 `http://127.0.0.1:18080`으로 바꾼다.

## 데이터와 키

- DB·설정: `scrollfact_scrollfact-data` Docker 볼륨.
- 암호화용 마스터 키: 별도 `scrollfact_scrollfact-secrets` 볼륨의 소유자만 읽고 쓸 수 있는 파일(0600).
- API 키는 AES-GCM으로 암호화해 DB에 저장한다. 암호화 키를 Docker 이미지·저장소·브라우저에 넣지 않는다. Docker 환경에서 OS 키체인과 같은 보호라고 주장하지 않는다. Docker 관리자 권한을 가진 사용자는 두 볼륨에 접근할 수 있다.
- macOS 키체인/Windows DPAPI로 저장된 기존 DB를 컨테이너에 복사하지 않는다. 새 로컬 프로필에 API 키를 한 번 저장한다.
- `docker compose down -v`는 **설정과 암호화 키를 모두 삭제**한다. 일반 종료에 `-v`를 붙이지 않는다. 키 볼륨만 잃으면 기존 API 키를 복호화할 수 없다.
- 배포용 사용자 인증 서비스가 아닌 개인 컴퓨터 테스트 구성이다. 호스트 포트는 `127.0.0.1`에만 공개한다. 컨테이너 안 nginx가 loopback으로 Spring에 전달하므로 기존 로컬 설정 제한을 끄지 않는다. 외부 공개나 다른 비신뢰 컨테이너와의 네트워크 공유 용도로 변경하지 않는다.

## 줄바꿈

`.gitattributes`가 기본 LF를 강제하고 `.bat/.cmd/.ps1`만 Windows CRLF로 체크아웃한다. 셸·Dockerfile·YAML은 Windows의 `core.autocrlf=true`에서도 LF다. 이미지·ZIP·PPT·HWPX·JAR 등은 binary로 지정해 변환하지 않는다. 개인 Git 전역 설정을 바꿀 필요 없다.

참고: [Docker Compose 시작 순서와 준비 확인](https://docs.docker.com/compose/how-tos/startup-order/), [Git gitattributes의 줄바꿈 규칙](https://git-scm.com/docs/gitattributes).
