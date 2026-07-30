# TETRIX

브라우저에서 바로 즐기는 웹 테트리스입니다. 외부 이미지/영상/음원 파일 없이
**순수 HTML/CSS/JavaScript + Canvas + Web Audio API**만으로 동작합니다.

- 상단 로고: CSS/Canvas로 그린 픽셀 블록이 떨어지며 완성되는 애니메이션
- 중간 화면: AI 봇이 자동으로 플레이하는 라이브 데모(영상 대체) → 종료 즉시 같은 화면에서 바로 플레이 전환
- 조작: ← → 이동 · ↑ 회전 · ↓ 소프트드롭 · Space 하드드롭 · P 일시정지 · M 음소거
- 모바일: 화면 아래 터치 버튼(◀ ⟳ ▶ / Soft Drop / Hard Drop)으로 동일하게 플레이 가능
- 언어: 한국어 / English / 日本語 / 中文 4개 언어 지원 (화면 상단 버튼으로 전환, 선택은 저장되어 두 페이지에서 유지됨)
- 점수: 가이드라인 테트리스 표준 규칙 (1/2/3/4줄 = 40/100/300/1200 × (레벨+1), 10줄마다 레벨업)
- 하이스코어: 게임오버 시 상위 20위 안에 들면 이니셜(3글자)을 입력해 순위 등록.
  **`ranking.html`이라는 별도 페이지**에서 전체 20위까지 확인 가능. localStorage에 저장되며
  **같은 브라우저/기기에서만 유지**된다 (서버가 없는 정적 사이트라 방문자 전체가 공유하는
  전역 순위표는 아님)
- BGM: Web Audio API로 실시간 합성한 8비트 칩튠 (파일 불필요)

## 로컬에서 확인하기

파일을 그대로 더블클릭해도 되지만, 일부 브라우저 보안 정책 때문에
로컬 서버로 여는 것을 추천합니다.

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## GitHub Pages로 배포하기

1. 이 폴더 전체를 GitHub 저장소에 올립니다.
   ```bash
   git init
   git add .
   git commit -m "Initial commit: TETRIX"
   git branch -M main
   git remote add origin https://github.com/사용자명/저장소이름.git
   git push -u origin main
   ```
2. GitHub 저장소 페이지에서 **Settings → Pages**로 이동합니다.
3. **Build and deployment → Source**를 `Deploy from a branch`로 설정합니다.
4. **Branch**를 `main`, 폴더를 `/ (root)`로 선택하고 **Save**를 누릅니다.
5. 1~2분 뒤 `https://사용자명.github.io/저장소이름/` 주소로 접속하면 사이트가 열립니다.

> `index.html`이 저장소 최상위 경로에 있어야 별도 설정 없이 바로 인식됩니다.

## 파일 구조

```
index.html          메인 페이지 (게임)
ranking.html         전체 순위(상위 20위) 페이지
css/style.css        아케이드 CRT 테마 스타일
js/i18n.js            한국어/영어/일본어/중국어 번역 데이터 및 언어 전환
js/engine.js         테트리스 핵심 로직 (보드/블록/회전/충돌/점수)
js/render.js         캔버스 렌더링
js/bot.js            데모용 자동 플레이 AI
js/leaderboard.js    localStorage 기반 하이스코어 순위표
js/audio.js          Web Audio 기반 배경음악·효과음 합성
js/main.js           전체 흐름 제어 (로고 인트로 → 데모 → 실제 게임, 터치 조작, 모달)
```

## 커스터마이징 팁

- `js/audio.js`의 `MELODY`, `BASS` 배열을 바꾸면 배경음악 멜로디가 바뀝니다.
- `js/main.js`의 `DEMO_DURATION_MS` 값으로 데모 재생 시간을 조절할 수 있습니다.
- `js/engine.js`의 `LINE_SCORE`, `dropIntervalMs()`로 점수/난이도 밸런스를 조절할 수 있습니다.

## 모든 방문자와 기록 공유하기 (글로벌 순위표)

기본 상태로는 순위 기록이 방문자 각자의 브라우저에만 저장됩니다. **모든 방문자가 같은
순위표를 보게 하려면** 무료 Firebase Realtime Database를 연결하세요.

1. [console.firebase.google.com](https://console.firebase.google.com) 접속 → Google 계정으로 로그인
2. **프로젝트 추가** → 이름 입력(예: `tetrix`) → Google 애널리틱스는 꺼도 무방 → 프로젝트 만들기
3. 왼쪽 메뉴에서 **빌드 → Realtime Database** 클릭 → **데이터베이스 만들기**
4. 위치를 선택하고, 보안 규칙은 일단 **테스트 모드로 시작** 선택
5. 데이터베이스가 만들어지면 상단에 보이는 주소를 복사합니다.
   `https://tetrix-xxxxx-default-rtdb.aaa-southeast1.firebasedatabase.app` 같은 형태예요.
6. **Rules(규칙)** 탭으로 이동해서 아래 내용으로 바꾸고 **게시(Publish)**:
   ```json
   {
     "rules": {
       "scores": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
7. `js/leaderboard.js` 파일 맨 위에서 이 줄을 찾아
   ```js
   const FIREBASE_URL = "";
   ```
   따옴표 안에 5번에서 복사한 주소를 붙여넣으세요:
   ```js
   const FIREBASE_URL = "https://tetrix-xxxxx-default-rtdb.aaa-southeast1.firebasedatabase.app";
   ```
8. 저장하고 GitHub에 다시 업로드(커밋)하면, 그 순간부터 모든 방문자가 같은 순위표를 보게 됩니다.

⚠️ 참고: 이 방식은 계정 로그인 없이 누구나 점수를 등록하는 캐주얼한 순위표라, 이론적으로는
브라우저 개발자도구를 이용해 점수를 조작해 등록하는 것도 막을 수는 없어요. 친구들과 재미로
경쟁하는 용도로는 충분하지만, 부정행위 방지가 중요하다면 별도의 서버 검증 로직이 필요합니다.
