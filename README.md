# TETRIX

브라우저에서 바로 즐기는 웹 테트리스입니다. 외부 이미지/영상/음원 파일 없이
**순수 HTML/CSS/JavaScript + Canvas + Web Audio API**만으로 동작합니다.

- 상단 로고: CSS/Canvas로 그린 픽셀 블록이 떨어지며 완성되는 애니메이션
- 중간 화면: AI 봇이 자동으로 플레이하는 라이브 데모(영상 대체) → 종료 즉시 같은 화면에서 바로 플레이 전환
- 조작: ← → 이동 · ↑ 회전 · ↓ 소프트드롭 · Space 하드드롭 · P 일시정지 · M 음소거
- 모바일: 화면 아래 터치 버튼(◀ ⟳ ▶ / Soft Drop / Hard Drop)으로 동일하게 플레이 가능
- 점수: 가이드라인 테트리스 표준 규칙 (1/2/3/4줄 = 40/100/300/1200 × (레벨+1), 10줄마다 레벨업)
- 하이스코어: 게임오버 시 상위 10위 안에 들면 이니셜(3글자)을 입력해 순위 등록. 브라우저의
  localStorage에 저장되며, **같은 브라우저/기기에서만 유지**된다 (서버가 없는 정적 사이트라
  방문자 전체가 공유하는 전역 순위표는 아님)
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
index.html          메인 페이지
css/style.css        아케이드 CRT 테마 스타일
js/engine.js         테트리스 핵심 로직 (보드/블록/회전/충돌/점수)
js/render.js         캔버스 렌더링
js/bot.js            데모용 자동 플레이 AI
js/leaderboard.js    localStorage 기반 하이스코어 순위표
js/audio.js          Web Audio 기반 배경음악·효과음 합성
js/main.js           전체 흐름 제어 (로고 인트로 → 데모 → 실제 게임, 터치 조작, 리더보드 모달)
```

## 커스터마이징 팁

- `js/audio.js`의 `MELODY`, `BASS` 배열을 바꾸면 배경음악 멜로디가 바뀝니다.
- `js/main.js`의 `DEMO_DURATION_MS` 값으로 데모 재생 시간을 조절할 수 있습니다.
- `js/engine.js`의 `LINE_SCORE`, `dropIntervalMs()`로 점수/난이도 밸런스를 조절할 수 있습니다.
