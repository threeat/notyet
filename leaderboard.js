/* =========================================================
   TETRIX - Leaderboard
   방문자의 브라우저에 최고 점수 10개를 저장한다 (서버 없음).
   localStorage를 쓸 수 없는 환경(예: 미리보기 샌드박스)에서는
   자동으로 메모리 저장으로 대체되어 오류 없이 동작한다.
   ========================================================= */

const LB_KEY = "tetrix_highscores_v1";
const MAX_ENTRIES = 10;

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

function getScores() {
  return safeGet(LB_KEY) || [];
}

function qualifies(score) {
  if (!score || score <= 0) return false;
  const scores = getScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}

function addScore(initials, score) {
  const clean = (initials || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "AAA";
  const scores = getScores();
  scores.push({ initials: clean, score, date: new Date().toISOString().slice(0, 10) });
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  safeSet(LB_KEY, trimmed);
  return trimmed;
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

window.TetrixLeaderboard = { getScores, qualifies, addScore, renderRows, MAX_ENTRIES };
