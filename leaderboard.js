/* =========================================================
   TETRIX - Leaderboard (Cloud + Local fallback)

   전 세계 방문자가 기록을 공유하는 진짜 글로벌 순위표를 쓰려면
   아래 FIREBASE_URL 에 본인의 Firebase Realtime Database 주소를
   넣으세요. (무료, 회원가입만 하면 됨 — README.md 참고)

   비워두면(기본값) 예전처럼 "이 브라우저에만" 저장되는 로컬
   모드로 자동 동작합니다 — 아무것도 깨지지 않아요.
   ========================================================= */

const FIREBASE_URL = ""; // 예: "https://tetrix-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app"

const LB_KEY = "tetrix_highscores_v1";
const MAX_ENTRIES = 20;
const cloudEnabled = () => !!FIREBASE_URL;

/* ---------- 로컬(브라우저 전용) 저장 — 폴백/기본 모드 ---------- */
function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return (window.__tetrixMemoryStore && window.__tetrixMemoryStore[key]) || null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    window.__tetrixMemoryStore = window.__tetrixMemoryStore || {};
    window.__tetrixMemoryStore[key] = value;
  }
}
function getLocalScores() {
  return safeGet(LB_KEY) || [];
}
function addLocalScore(entry) {
  const scores = getLocalScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  safeSet(LB_KEY, trimmed);
  return trimmed;
}

/* ---------- 클라우드(Firebase Realtime Database REST API) ---------- */
async function getCloudScores() {
  const res = await fetch(`${FIREBASE_URL}/scores.json?orderBy="score"&limitToLast=${MAX_ENTRIES}`);
  if (!res.ok) throw new Error("cloud fetch failed: " + res.status);
  const data = await res.json();
  if (!data) return [];
  const list = Object.values(data);
  list.sort((a, b) => b.score - a.score);
  return list;
}
async function addCloudScore(entry) {
  const res = await fetch(`${FIREBASE_URL}/scores.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry)
  });
  if (!res.ok) throw new Error("cloud write failed: " + res.status);
  return getCloudScores();
}

/* ---------- 공개 API (전부 async — 클라우드/로컬 모드 모두 동일하게 사용) ---------- */
async function getScores() {
  if (!cloudEnabled()) return getLocalScores();
  try {
    return await getCloudScores();
  } catch (e) {
    console.warn("[TETRIX] Cloud leaderboard unavailable, falling back to local.", e);
    return getLocalScores();
  }
}

async function qualifies(score) {
  if (!score || score <= 0) return false;
  const scores = await getScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}

async function addScore(initials, score) {
  const clean = (initials || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "AAA";
  const entry = { initials: clean, score, date: new Date().toISOString().slice(0, 10) };

  if (!cloudEnabled()) return addLocalScore(entry);
  try {
    return await addCloudScore(entry);
  } catch (e) {
    console.warn("[TETRIX] Cloud leaderboard unavailable, saving locally instead.", e);
    return addLocalScore(entry);
  }
}

function renderRows(scores, highlightIndex = -1) {
  if (scores.length === 0) {
    return `<p class="lb-empty">No scores yet — be the first!</p>`;
  }
  return `<div class="lb-table">${scores
    .map((entry, i) => {
      const rank = i + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      const hl = i === highlightIndex ? " lb-row--new" : "";
      return `<div class="lb-row${hl}">
        <span class="lb-rank">${medal}</span>
        <span class="lb-initials">${entry.initials}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
        <span class="lb-date">${entry.date}</span>
      </div>`;
    })
    .join("")}</div>`;
}

window.TetrixLeaderboard = { getScores, qualifies, addScore, renderRows, MAX_ENTRIES, cloudEnabled };
