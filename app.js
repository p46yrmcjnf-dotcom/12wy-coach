// ─── Supabase sync ─────────────────────────────────────────────────────────────
const SB_URL = 'https://vydpiywmqbevjuyrqcyj.supabase.co/rest/v1/app_data';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZHBpeXdtcWJldmp1eXJxY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODk5MDksImV4cCI6MjA5ODY2NTkwOX0.j0ZgMn0dyUKsMEeb0m0Nuu9dOPOrC01Ky8OXdVEIQj4';
const SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
let _syncTimer = null;

async function loadFromSupabase() {
  try {
    const res = await fetch(`${SB_URL}?id=eq.sara&select=data`, { headers: SB_HEADERS });
    const rows = await res.json();
    const d = rows?.[0]?.data;
    if (!d) return;
    const { c2, ...c1 } = d;
    if (c1.dailyLogs || c1.wam || c1.mondayPulse) localStorage.setItem(DB_KEY, JSON.stringify(c1));
    if (c2) localStorage.setItem(C2_KEY, JSON.stringify(c2));
  } catch(e) {}
}

async function pushToSupabase() {
  try {
    const c1 = db(); delete c1.c2;
    await fetch(SB_URL, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: 'sara', data: { ...c1, c2: dbC2() }, updated_at: new Date().toISOString() })
    });
  } catch(e) {}
}

function scheduleSyncToSupabase() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(pushToSupabase, 1500);
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const DB_KEY  = 'mfs_12wy';
const C2_KEY  = 'mfs_12wy_c2';
const SEASON_START = new Date('2026-10-03T00:00:00');
const SEASON_END   = new Date('2026-12-25T23:59:59');
const MILESTONES   = { 4: 'Oct 31', 8: 'Nov 28', 12: 'Dec 25' };

const NET_SCORED = [
  { key: 'newContacts',     label: 'New contacts made',          floor: 1, target: 2, stretch: 3 },
  { key: 'followUps',       label: 'Follow-ups sent',            floor: 2, target: 3, stretch: 5 },
  { key: 'coffees',         label: 'Coffee meetings scheduled',  floor: 1, target: 2, stretch: 3 },
  { key: 'backlogOutreach', label: 'Backlog outreach messages',  floor: 0, target: 2, stretch: 4 },
];
const NET_LAG = [
  { key: 'eventsAttended',     label: 'Events attended' },
  { key: 'eventsHosted',       label: 'Events hosted' },
  { key: 'coffeesHeld',        label: 'Coffee meetings held' },
  { key: 'guestsConfirmed',    label: 'Event guests confirmed / attended' },
  { key: 'newClients',         label: 'New clients / yeses' },
  { key: 'ffScanCount',        label: 'First Friday — short-link scans' },
  { key: 'ffCalendlyBookings', label: 'First Friday — Calendly bookings' },
  { key: 'ffContactsTagged',   label: 'First Friday — contacts tagged' },
];
const SOC_SCORED = [
  { key: 'feedPosts',         label: 'Feed posts (all platforms)',      floor: 3,  target: 6,  stretch: 8  },
  { key: 'stories',           label: 'Stories posted',                  floor: 8,  target: 10, stretch: 15 },
  { key: 'bridge',            label: 'Bridge post',                     floor: 1,  target: 1,  stretch: 2  },
  { key: 'blog',              label: 'Blog post',                       floor: 0,  target: 1,  stretch: 1, blogOnly: true },
  { key: 'dmsSent',           label: 'DMs sent (outbound proactive)',   floor: 0,  target: 2,  stretch: 4  },
  { key: 'proactiveComments', label: 'Proactive comments on local biz', floor: 2,  target: 3,  stretch: 5  },
];
const SOC_LAG = [
  { key: 'nonFollowerReach',   label: 'Non-follower reach' },
  { key: 'totalEngagement',    label: 'Total engagement' },
  { key: 'newFollowers',       label: 'New followers' },
  { key: 'dmsReceived',        label: 'DMs received' },
  { key: 'eventRegistrations', label: 'Event registrations (social)' },
];
const HEALTH_SCORED = [
  { key: 'daysMoved', label: 'Days moved (workout / spin / walk / etc.)', floor: 3, target: 5, stretch: 7 },
];
const HEALTH_TRACKED = [
  { key: 'avgSteps',         label: 'Avg daily steps (Oura)',     type: 'number'  },
  { key: 'strengthSessions', label: 'Strength training sessions', type: 'counter' },
];
const SPIRITUAL_SCORED = [
  { key: 'quietTimeDays', label: 'Quiet time days (Bible / journal / prayer)', floor: 3, target: 5, stretch: 7 },
];
const SPIRITUAL_TRACKED = [
  { key: 'sabbathObserved', label: 'Sabbath observed (Sunday)', type: 'toggle'  },
  { key: 'churchCount',     label: 'Church attendance',         type: 'counter' },
];
const FAMILY_TRACKED = [
  { key: 'sundayDinner',  label: 'Sunday family dinner' },
  { key: 'dateNight',     label: 'Date night with Clark' },
  { key: 'sundayDebrief', label: 'Sunday debrief / week-prep with Clark' },
];

// ─── Data layer ─────────────────────────────────────────────────────────────────
function db()   { try { return JSON.parse(localStorage.getItem(DB_KEY))  || {}; } catch { return {}; } }
function dbC2() { try { return JSON.parse(localStorage.getItem(C2_KEY)) || {}; } catch { return {}; } }
function saveC2(data) { localStorage.setItem(C2_KEY, JSON.stringify(data)); scheduleSyncToSupabase(); }

function getDailyLog(ds)      { return ((dbC2().dailyLogs || {})[ds])        || {}; }
function getWeeklyNet(sat)    { return ((dbC2().weeklyNet || {})[sat])        || {}; }
function getWeeklySoc(sat)    { return ((dbC2().weeklySoc || {})[sat])        || {}; }
function getWeeklyHealth(sat) { return ((dbC2().weeklyHealth || {})[sat])     || {}; }
function getWeeklySpiritual(sat) { return ((dbC2().weeklySpiritual || {})[sat]) || {}; }
function getWeeklyFamily(sat)    { return ((dbC2().weeklyFamily || {})[sat])    || {}; }
function getWAM(wk)           { return ((dbC2().wam || {})[wk])               || {}; }
function getPulse(ds)         { return ((dbC2().pulse || {})[ds])             || {}; }

function saveDailyLog(ds, log) {
  const d = dbC2(); if (!d.dailyLogs) d.dailyLogs = {};
  d.dailyLogs[ds] = { ...(d.dailyLogs[ds] || {}), ...log }; saveC2(d);
}
function saveWeeklyNet(sat, key, val) {
  const d = dbC2(); if (!d.weeklyNet) d.weeklyNet = {};
  if (!d.weeklyNet[sat]) d.weeklyNet[sat] = {};
  d.weeklyNet[sat][key] = Math.max(0, parseInt(val) || 0); saveC2(d); rerender();
}
function saveWeeklySoc(sat, key, val) {
  const d = dbC2(); if (!d.weeklySoc) d.weeklySoc = {};
  if (!d.weeklySoc[sat]) d.weeklySoc[sat] = {};
  d.weeklySoc[sat][key] = typeof val === 'boolean' ? val : Math.max(0, parseInt(val) || 0); saveC2(d); rerender();
}
function saveWeeklyHealth(sat, key, val) {
  const d = dbC2(); if (!d.weeklyHealth) d.weeklyHealth = {};
  if (!d.weeklyHealth[sat]) d.weeklyHealth[sat] = {};
  d.weeklyHealth[sat][key] = typeof val === 'boolean' ? val : Math.max(0, parseInt(val) || 0); saveC2(d); rerender();
}
function saveWeeklySpiritual(sat, key, val) {
  const d = dbC2(); if (!d.weeklySpiritual) d.weeklySpiritual = {};
  if (!d.weeklySpiritual[sat]) d.weeklySpiritual[sat] = {};
  d.weeklySpiritual[sat][key] = typeof val === 'boolean' ? val : Math.max(0, parseInt(val) || 0); saveC2(d); rerender();
}
function saveWeeklyFamily(sat, key, val) {
  const d = dbC2(); if (!d.weeklyFamily) d.weeklyFamily = {};
  if (!d.weeklyFamily[sat]) d.weeklyFamily[sat] = {};
  d.weeklyFamily[sat][key] = val; saveC2(d); rerender();
}
function saveWAM(wk, data) {
  const d = dbC2(); if (!d.wam) d.wam = {};
  d.wam[wk] = { ...(d.wam[wk] || {}), ...data }; saveC2(d);
}
function savePulse(ds, key, val) {
  const d = dbC2(); if (!d.pulse) d.pulse = {};
  if (!d.pulse[ds]) d.pulse[ds] = {};
  d.pulse[ds][key] = val; saveC2(d); rerender();
}

// ─── Date utilities ──────────────────────────────────────────────────────────────
let _selectedDate = null;

function selectedDateObj() {
  if (_selectedDate) { const [y,m,d] = _selectedDate.split('-').map(Number); return new Date(y, m-1, d); }
  return new Date();
}
function selectedDateStr() { return dateStr(selectedDateObj()); }
function today()            { return dateStr(new Date()); }

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function weekSaturdayForDate(d) {
  const dow = d.getDay();
  const offset = dow === 6 ? 0 : -(dow + 1);
  const sat = new Date(d); sat.setDate(sat.getDate() + offset);
  return dateStr(sat);
}
function weekSaturday() { return weekSaturdayForDate(selectedDateObj()); }

function weekNumForDate(d) {
  if (d < SEASON_START) return 0;
  if (d > SEASON_END)   return 13;
  return Math.ceil((d - SEASON_START) / (7 * 24 * 60 * 60 * 1000));
}
function currentWeekNum()  { return weekNumForDate(new Date()); }
function selectedWeekNum() { return weekNumForDate(selectedDateObj()); }

function weekStartDate(weekNum) {
  const d = new Date(SEASON_START); d.setDate(d.getDate() + (weekNum - 1) * 7); return d;
}
function weekEndDate(weekNum) {
  const d = weekStartDate(weekNum); d.setDate(d.getDate() + 6); return d;
}

function isPreSeason()  { return new Date() < SEASON_START; }
function isPostSeason() { return new Date() > SEASON_END; }
function isFriday()     { return new Date().getDay() === 5; }
function isSaturday()   { return new Date().getDay() === 6; }
function isMonday()     { return new Date().getDay() === 1; }

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function daysUntilNextMilestone() {
  const wk = currentWeekNum();
  const next = [4, 8, 12].find(w => w > wk);
  if (!next) return null;
  const ms = weekStartDate(next + 1);
  return { week: next, days: Math.ceil((ms - new Date()) / 86400000), label: MILESTONES[next] };
}

// ─── Scoring ───────────────────────────────────────────────────────────────────
function tieredScore(val, floor, target, stretch) {
  let pct;
  if (floor === 0) {
    pct = target > 0 ? Math.round((val / target) * 100) : 100;
  } else if (val >= target) {
    pct = 100;
  } else if (val >= floor) {
    pct = Math.round(60 + 40 * (val - floor) / (target - floor));
  } else {
    pct = Math.round(60 * val / floor);
  }
  return { pct: Math.min(100, Math.max(0, pct)), isStretch: stretch > target && val >= stretch };
}

function calcPillarExec(indicators, weekData, useFloor = false) {
  const active = indicators.filter(n => !n.blogOnly || weekData.blogWeek);
  if (!active.some(n => (weekData[n.key] || 0) > 0)) return null;
  const scores = active.map(n => {
    const val = weekData[n.key] || 0;
    if (useFloor && n.floor > 0) return tieredScore(val, 0, n.floor, n.target).pct;
    return tieredScore(val, n.floor, n.target, n.stretch).pct;
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / active.length);
}

function weekIsCrisis(weekNum) { return getWAM(weekNum).capacity === 'crisis'; }

function calcHealthExec(weekNum) {
  return calcPillarExec(HEALTH_SCORED, getWeeklyHealth(dateStr(weekStartDate(weekNum))), weekIsCrisis(weekNum));
}
function calcSpiritualExec(weekNum) {
  return calcPillarExec(SPIRITUAL_SCORED, getWeeklySpiritual(dateStr(weekStartDate(weekNum))), weekIsCrisis(weekNum));
}
function calcNetExec(weekNum) {
  return calcPillarExec(NET_SCORED, getWeeklyNet(dateStr(weekStartDate(weekNum))), weekIsCrisis(weekNum));
}
function calcSocExec(weekNum) {
  return calcPillarExec(SOC_SCORED, getWeeklySoc(dateStr(weekStartDate(weekNum))), weekIsCrisis(weekNum));
}

function execColor(pct) {
  if (pct === null || pct === undefined) return 'sc-future';
  if (pct >= 80) return 'sc-green';
  if (pct >= 50) return 'sc-yellow';
  return 'sc-red';
}
function execClass(pct) {
  if (pct === null || pct === undefined) return '';
  if (pct >= 80) return 'exec-green';
  if (pct >= 50) return 'exec-yellow';
  return 'exec-red';
}

// ─── UI helpers ─────────────────────────────────────────────────────────────────
function card(headerHtml, bodyHtml) {
  return `<div class="card"><div class="card-header">${headerHtml}</div><div class="card-body">${bodyHtml}</div></div>`;
}
function showSaved(btn) {
  const note = btn.parentElement.querySelector('.saved-note');
  if (note) { note.classList.add('show'); setTimeout(() => note.classList.remove('show'), 2000); }
}

function numRow(label, val, onMinus, onPlus, floor, target, stretch) {
  const score = tieredScore(val, floor, target, stretch);
  const color = val >= target ? 'var(--green)' : (val >= floor && floor > 0) ? 'var(--yellow)' : 'var(--text)';
  const hint = floor > 0 ? `F${floor} · T${target} · S${stretch}` : `T${target} · S${stretch}`;
  const star = score.isStretch ? ' ⭐' : '';
  return `<div class="num-row">
    <label>${label}${star}</label>
    <span style="font-size:10px;color:var(--text-muted);">${hint}</span>
    <div style="display:flex;align-items:center;gap:6px;">
      <button onclick="${onMinus}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
      <span style="font-size:18px;font-weight:700;min-width:20px;text-align:center;color:${color};">${val}</span>
      <button onclick="${onPlus}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
    </div>
  </div>`;
}

function lagNumRow(label, val, sat, storeKey, storeFn) {
  return `<div class="num-row">
    <label>${label}</label>
    <span class="num-tag tag-lag">lag</span>
    <input type="number" min="0" value="${val || ''}" placeholder="0"
      style="width:64px;text-align:center;"
      onchange="${storeFn}('${sat}','${storeKey}',parseInt(this.value)||0)">
  </div>`;
}

function toggleRow(label, val, onclick) {
  return `<div class="check-item" onclick="toggleCheck(this)">
    <input type="checkbox" ${val ? 'checked' : ''} onchange="${onclick}">
    <label class="${val ? 'done' : ''}">${label}</label>
  </div>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
let currentView = 'today';

function navigate(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderMain();
}

function setSelectedDate(val) {
  _selectedDate = (val === today() || !val) ? null : val;
  rerender();
}
function changeDate(delta) {
  const d = selectedDateObj(); d.setDate(d.getDate() + delta);
  const ds = dateStr(d);
  if (ds < '2026-10-03' || ds > '2026-12-25') return;
  setSelectedDate(ds);
}

// ─── State ────────────────────────────────────────────────────────────────────
let _wamWeekOverride = null;
let _lagNetOpen = false;
let _lagSocOpen = false;
let _showExport = false;
let _exportContent = '';

// ─── Today view ───────────────────────────────────────────────────────────────
function renderToday() {
  const ds  = selectedDateStr();
  const log = getDailyLog(ds);
  const wk  = selectedWeekNum();
  const sat = weekSaturday();
  const isToday = ds === today();

  const health   = getWeeklyHealth(sat);
  const spiritual = getWeeklySpiritual(sat);
  const family   = getWeeklyFamily(sat);
  const net      = getWeeklyNet(sat);
  const soc      = getWeeklySoc(sat);
  const isBlogWeek = !!soc.blogWeek;

  let html = '';

  if (wk === 1) {
    html += `<div class="banner banner-green">📌 <strong>Carry-over priority:</strong> Heather Seidel video campaign — address this week.</div>`;
  }

  // ── Date picker ──
  html += `<div class="card"><div class="card-body" style="display:flex;align-items:center;gap:8px;padding:10px 12px;">
    <button onclick="changeDate(-1)" style="padding:5px 11px;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:15px;">←</button>
    <input type="date" value="${ds}" min="2026-10-03" max="2026-12-25"
      onchange="setSelectedDate(this.value)"
      style="flex:1;text-align:center;font-size:13px;font-weight:600;color:var(--green);background:transparent;border:none;outline:none;cursor:pointer;" />
    <button onclick="changeDate(1)" style="padding:5px 11px;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:15px;">→</button>
    ${!isToday ? `<button onclick="setSelectedDate(null)" style="padding:5px 8px;border:1px solid var(--green);border-radius:6px;background:var(--green-pale);color:var(--green);cursor:pointer;font-size:11px;font-weight:600;">Today</button>` : ''}
  </div></div>`;

  if (wk > 0 && wk <= 12) {
    const wkEnd = weekEndDate(wk);
    html += `<p style="font-size:12px;color:var(--text-muted);margin:-4px 0 10px;">Week ${wk} · ${formatDate(weekStartDate(wk))} – ${formatDate(wkEnd)}</p>`;
  } else if (wk === 0) {
    html += `<div class="banner banner-yellow">Pre-season — Cycle 2 begins Saturday, Oct 3.</div>`;
    return html;
  }

  // Notification bar
  if ('Notification' in window && Notification.permission === 'default') {
    html += `<div class="notif-bar">🔔 Enable reminders for morning + WAM prompts <button class="btn btn-sm btn-primary" onclick="requestNotifPermission()">Enable</button></div>`;
  }

  // ── Panda Planner (daily) ──
  html += card(`<h2>🐼 Panda Planner</h2>`,
    toggleRow('Filled out today\'s Panda Planner (top-3 priorities + gratitude)', log.pandaPlanner,
      `saveDailyLog('${ds}',{pandaPlanner:this.checked});rerender()`)
  );

  // ── Morning Check-In (daily) ──
  html += `<div class="card"><div class="card-header"><h2>☀️ Morning Check-In</h2></div><div class="card-body">
    <div class="slider-row">
      <label>Morning energy</label>
      <input type="range" class="energy-slider" min="1" max="10" value="${log.energyLevel || 5}"
        oninput="this.nextElementSibling.textContent=this.value;saveDailyLog('${ds}',{energyLevel:parseInt(this.value)})" />
      <span class="slider-val">${log.energyLevel || 5}</span>
    </div>
    <div class="slider-row mt-8">
      <label>Oura readiness</label>
      <input type="range" min="0" max="100" value="${log.ouraReadiness || 75}"
        oninput="this.nextElementSibling.textContent=this.value;saveDailyLog('${ds}',{ouraReadiness:parseInt(this.value)})" />
      <span class="slider-val">${log.ouraReadiness || 75}</span>
    </div>
    ${(log.ouraReadiness || 75) < 60 ? `<p class="text-muted mt-8" style="color:var(--yellow);">⚠️ Oura below 60 — consider scaling back training.</p>` : ''}
  </div></div>`;

  // ── Health — Weekly ──
  const hExec = calcHealthExec(wk);
  html += `<div class="card"><div class="card-header">
    <h2>💪 Health — Week ${wk}</h2>
    ${hExec !== null ? `<span class="badge badge-${hExec>=80?'green':hExec>=50?'yellow':'red'}" style="margin-left:auto;">${hExec}%</span>` : ''}
  </div><div class="card-body">`;
  HEALTH_SCORED.forEach(n => {
    const val = health[n.key] || 0;
    html += numRow(n.label, val,
      `saveWeeklyHealth('${sat}','${n.key}',${val-1})`,
      `saveWeeklyHealth('${sat}','${n.key}',${val+1})`,
      n.floor, n.target, n.stretch);
  });
  html += `<div class="num-row" style="margin-top:4px;">
    <label>Avg daily steps (Oura)</label>
    <span class="num-tag" style="background:#E8F0FB;color:#1A3A6A;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;">tracked</span>
    <input type="number" min="0" step="100" value="${health.avgSteps || ''}" placeholder="steps"
      style="width:80px;text-align:center;"
      onchange="saveWeeklyHealth('${sat}','avgSteps',parseInt(this.value)||0)">
  </div>
  <div class="num-row">
    <label>Strength training sessions</label>
    <span class="num-tag" style="background:#E8F0FB;color:#1A3A6A;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;">tracked</span>
    <div style="display:flex;align-items:center;gap:6px;">
      <button onclick="saveWeeklyHealth('${sat}','strengthSessions',${(health.strengthSessions||0)-1})" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
      <span style="font-size:18px;font-weight:700;min-width:20px;text-align:center;">${health.strengthSessions || 0}</span>
      <button onclick="saveWeeklyHealth('${sat}','strengthSessions',${(health.strengthSessions||0)+1})" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
    </div>
  </div>
  </div></div>`;

  // ── Spiritual — Weekly ──
  const sExec = calcSpiritualExec(wk);
  html += `<div class="card"><div class="card-header">
    <h2>🙏 Spiritual — Week ${wk}</h2>
    ${sExec !== null ? `<span class="badge badge-${sExec>=80?'green':sExec>=50?'yellow':'red'}" style="margin-left:auto;">${sExec}%</span>` : ''}
  </div><div class="card-body">`;
  SPIRITUAL_SCORED.forEach(n => {
    const val = spiritual[n.key] || 0;
    html += numRow(n.label, val,
      `saveWeeklySpiritual('${sat}','${n.key}',${val-1})`,
      `saveWeeklySpiritual('${sat}','${n.key}',${val+1})`,
      n.floor, n.target, n.stretch);
  });
  html += `<div class="check-item" onclick="toggleCheck(this)" style="margin-top:4px;">
    <input type="checkbox" ${spiritual.sabbathObserved ? 'checked' : ''} onchange="saveWeeklySpiritual('${sat}','sabbathObserved',this.checked)">
    <label class="${spiritual.sabbathObserved ? 'done' : ''}">Sabbath observed (Sunday)</label>
  </div>
  <div class="num-row">
    <label>Church attendance</label>
    <span class="num-tag" style="background:#E8F0FB;color:#1A3A6A;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;">tracked</span>
    <div style="display:flex;align-items:center;gap:6px;">
      <button onclick="saveWeeklySpiritual('${sat}','churchCount',${(spiritual.churchCount||0)-1})" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
      <span style="font-size:18px;font-weight:700;min-width:20px;text-align:center;">${spiritual.churchCount || 0}</span>
      <button onclick="saveWeeklySpiritual('${sat}','churchCount',${(spiritual.churchCount||0)+1})" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
    </div>
  </div>
  </div></div>`;

  // ── Family — Weekly ──
  html += `<div class="card"><div class="card-header"><h2>👨‍👩‍👧 Family — Week ${wk}</h2>
    <span style="font-size:10px;color:var(--text-muted);margin-left:auto;">tracked · not scored</span>
  </div><div class="card-body">`;
  FAMILY_TRACKED.forEach(f => {
    html += `<div class="check-item" onclick="toggleCheck(this)">
      <input type="checkbox" ${family[f.key] ? 'checked' : ''} onchange="saveWeeklyFamily('${sat}','${f.key}',this.checked)">
      <label class="${family[f.key] ? 'done' : ''}">${f.label}</label>
    </div>`;
  });
  html += `</div></div>`;

  // ── Networking — Scored ──
  const nExec = calcNetExec(wk);
  html += `<div class="card"><div class="card-header">
    <h2>🤝 Networking — Week ${wk}</h2>
    ${nExec !== null ? `<span class="badge badge-${nExec>=80?'green':nExec>=50?'yellow':'red'}" style="margin-left:auto;">${nExec}%</span>` : ''}
  </div><div class="card-body">`;
  NET_SCORED.forEach(n => {
    const val = net[n.key] || 0;
    html += numRow(n.label, val,
      `saveWeeklyNet('${sat}','${n.key}',${val-1})`,
      `saveWeeklyNet('${sat}','${n.key}',${val+1})`,
      n.floor, n.target, n.stretch);
  });
  html += `<div style="margin-top:8px;">
    <span class="collapse-toggle" onclick="_lagNetOpen=!_lagNetOpen;rerender()">
      ${_lagNetOpen ? '▲ Hide' : '▼ Add'} lag indicators (events, clients, First Friday)
    </span>
    ${_lagNetOpen ? NET_LAG.map(n => lagNumRow(n.label, net[n.key], sat, n.key, 'saveWeeklyNet')).join('') : ''}
  </div>
  </div></div>`;

  // ── Social Media — Scored ──
  const smExec = calcSocExec(wk);
  html += `<div class="card"><div class="card-header">
    <h2>📱 Social Media — Week ${wk}</h2>
    ${smExec !== null ? `<span class="badge badge-${smExec>=80?'green':smExec>=50?'yellow':'red'}" style="margin-left:auto;">${smExec}%</span>` : ''}
  </div><div class="card-body">
    <div class="section-label">Blog publish week?</div>
    <div class="toggle-group" style="margin-bottom:10px;">
      <button class="toggle-btn ${isBlogWeek ? 'active-yes' : ''}" onclick="saveWeeklySoc('${sat}','blogWeek',true)">Yes — blog week</button>
      <button class="toggle-btn ${!isBlogWeek ? 'active-yes' : ''}" onclick="saveWeeklySoc('${sat}','blogWeek',false)">No — standard week</button>
    </div>`;
  SOC_SCORED.filter(s => !s.blogOnly || isBlogWeek).forEach(s => {
    const val = soc[s.key] || 0;
    html += numRow(s.label, val,
      `saveWeeklySoc('${sat}','${s.key}',${val-1})`,
      `saveWeeklySoc('${sat}','${s.key}',${val+1})`,
      s.floor, s.target, s.stretch);
  });
  html += `<div style="margin-top:8px;">
    <span class="collapse-toggle" onclick="_lagSocOpen=!_lagSocOpen;rerender()">
      ${_lagSocOpen ? '▲ Hide' : '▼ Add'} lag indicators (reach, engagement, followers)
    </span>
    ${_lagSocOpen ? SOC_LAG.map(n => lagNumRow(n.label, soc[n.key], sat, n.key, 'saveWeeklySoc')).join('') : ''}
  </div>
  </div></div>`;

  // ── Evening Check-In (daily) ──
  html += `<div class="card"><div class="card-header"><h2>🌙 Evening Check-In <span class="text-muted" style="font-size:11px;font-weight:400;">(optional)</span></h2></div>
  <div class="card-body">
    <div class="section-label">Midday crash?</div>
    <div class="toggle-group">
      <button class="toggle-btn ${log.middayCrash === false ? 'active-yes' : ''}" onclick="saveDailyLog('${ds}',{middayCrash:false});rerender()">No crash ✓</button>
      <button class="toggle-btn ${log.middayCrash === true ? 'active-no' : ''}" onclick="saveDailyLog('${ds}',{middayCrash:true});rerender()">Had a crash</button>
    </div>
    <div class="section-label mt-8">Evening notes</div>
    <textarea rows="2" placeholder="What got done, anything to note..." onchange="saveDailyLog('${ds}',{eveningNotes:this.value})">${log.eveningNotes || ''}</textarea>
  </div></div>`;

  return html;
}

// ─── WAM view ─────────────────────────────────────────────────────────────────
function renderWAM() {
  const wk = currentWeekNum();
  if (wk === 0) return `<div class="banner banner-green">Pre-season — Cycle 2 begins Saturday, Oct 3. WAM will be available after Week 1 (Oct 9).</div>`;

  const defaultWk = isFriday() ? wk : Math.max(1, wk - 1);
  const maxWk = Math.min(wk, 12);
  const weekToReview = _wamWeekOverride || Math.min(defaultWk, maxWk);

  let html = `<div class="card"><div class="card-body" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;">
    <span style="font-size:13px;font-weight:600;">Review week:</span>
    ${Array.from({length: maxWk}, (_, i) => i + 1).map(w => {
      const wam = getWAM(w);
      const cap = wam.capacity;
      const dot = wam.whatWorked || wam.weekContext;
      const capColor = cap === 'crisis' ? 'var(--red)' : cap === 'reduced' ? 'var(--yellow)' : '';
      const borderColor = w === weekToReview ? 'var(--green)' : capColor || 'var(--border)';
      const bg = w === weekToReview ? 'var(--green)' : capColor ? (cap==='crisis'?'#FDECEA':'#FFF8E6') : 'white';
      const color = w === weekToReview ? 'white' : 'var(--text)';
      return `<button onclick="_wamWeekOverride=${w};renderMain()" style="padding:5px 10px;border-radius:6px;border:2px solid ${borderColor};background:${bg};color:${color};font-weight:700;cursor:pointer;font-size:13px;position:relative;">
        ${w}${dot ? '<span style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;background:var(--green-light);border-radius:50%;border:1px solid white;"></span>' : ''}
      </button>`;
    }).join('')}
  </div></div>`;

  const wam = getWAM(weekToReview);
  const satStr = dateStr(weekStartDate(weekToReview));
  const cap = wam.capacity || 'full';

  if (weekToReview === 12) {
    html += `<div class="banner banner-yellow">🎄 Week 12 ends Friday Dec 25 (Christmas). Consider doing your WAM Saturday Dec 26.</div>`;
  }

  html += `<div class="banner banner-green">📋 <strong>Week ${weekToReview} Review</strong> · ${formatDate(weekStartDate(weekToReview))} – ${formatDate(weekEndDate(weekToReview))}</div>`;

  // ── Capacity flag ──
  html += `<div class="card"><div class="card-header"><h2>⚡ Week Capacity</h2></div><div class="card-body">
    <div class="toggle-group">
      <button class="toggle-btn ${cap==='full'?'active-yes':''}" onclick="saveWAM(${weekToReview},{capacity:'full'});rerender()">Full</button>
      <button class="toggle-btn ${cap==='reduced'?'active-yes':''}" onclick="saveWAM(${weekToReview},{capacity:'reduced'});rerender()">Reduced</button>
      <button class="toggle-btn ${cap==='crisis'?'active-no':''}" onclick="saveWAM(${weekToReview},{capacity:'crisis'});rerender()">Crisis</button>
    </div>
    ${cap !== 'full' ? `<div class="mt-8">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:5px;">Disruption reason</label>
      <input type="text" placeholder="e.g. caregiving, travel, illness..." value="${wam.disruptionReason||''}"
        onchange="saveWAM(${weekToReview},{disruptionReason:this.value})" style="width:100%;">
    </div>` : ''}
    ${cap==='crisis' ? `<p class="text-muted mt-8" style="font-size:12px;">🔴 Crisis week: execution % scored against Floor thresholds.</p>` : ''}
  </div></div>`;

  // ── Lead Execution % ──
  const hPct  = calcHealthExec(weekToReview);
  const sPct  = calcSpiritualExec(weekToReview);
  const nPct  = calcNetExec(weekToReview);
  const smPct = calcSocExec(weekToReview);
  const net   = getWeeklyNet(satStr);
  const soc   = getWeeklySoc(satStr);
  const health = getWeeklyHealth(satStr);
  const spiritual = getWeeklySpiritual(satStr);
  const family = getWeeklyFamily(satStr);

  html += card(`<h2>📊 Lead Execution %</h2><span class="text-muted" style="font-size:11px;margin-left:auto;">${cap==='crisis'?'⚠️ Scored vs. Floor':'auto-calculated'}</span>`,
    `<div class="exec-row">
      <span class="exec-name">Health</span>
      <div>
        <span class="exec-pct ${execClass(hPct)}">${hPct !== null ? hPct + '%' : '—'}</span>
        ${hPct !== null ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">Moved: ${health.daysMoved||0}/wk</span>` : ''}
      </div>
    </div>
    <div class="exec-row">
      <span class="exec-name">Spiritual</span>
      <div>
        <span class="exec-pct ${execClass(sPct)}">${sPct !== null ? sPct + '%' : '—'}</span>
        ${sPct !== null ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">QT: ${spiritual.quietTimeDays||0} days</span>` : ''}
      </div>
    </div>
    <div class="exec-row">
      <span class="exec-name">Networking</span>
      <div>
        <span class="exec-pct ${execClass(nPct)}">${nPct !== null ? nPct + '%' : '—'}</span>
        ${nPct !== null ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">C:${net.newContacts||0} F:${net.followUps||0} ☕${net.coffees||0} B:${net.backlogOutreach||0}</span>` : ''}
      </div>
    </div>
    <div class="exec-row">
      <span class="exec-name">Social Media</span>
      <div>
        <span class="exec-pct ${execClass(smPct)}">${smPct !== null ? smPct + '%' : '—'}</span>
        ${smPct !== null ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">Posts:${soc.feedPosts||0} Str:${soc.stories||0} Br:${soc.bridge||0}</span>` : ''}
      </div>
    </div>
    <div class="exec-row" style="border-bottom:none;">
      <span class="exec-name">Family <span style="font-size:11px;color:var(--text-muted);">(tracked)</span></span>
      <span style="font-size:12px;">
        ${family.sundayDinner ? '🍽️' : '○'} Dinner &nbsp;
        ${family.dateNight ? '💛' : '○'} Date &nbsp;
        ${family.sundayDebrief ? '📝' : '○'} Debrief
      </span>
    </div>`
  );

  // ── Reflection ──
  html += `<div class="card"><div class="card-header"><h2>📝 Weekly Reflection</h2></div><div class="card-body">`;
  [
    { key: 'weekContext',  label: 'Week context — what was happening in life?',    placeholder: 'Travel, caregiving, health, family, unexpected events — this is your memory for the 4/8/12 check-ins.' },
    { key: 'whatWorked',   label: 'What worked this week?',                         placeholder: 'Actions, habits, or mindset shifts that drove results...' },
    { key: 'whatDidnt',    label: "What didn't work / what got in the way?",        placeholder: 'Be honest — this is just for you...' },
    { key: 'adjustment',   label: 'One specific adjustment for next week',          placeholder: 'Small and actionable — what exactly will you do differently?' },
  ].forEach(q => {
    html += `<div class="wam-q">
      <label>${q.label}</label>
      <textarea rows="3" placeholder="${q.placeholder}" onchange="saveWAM(${weekToReview},{'${q.key}':this.value})">${wam[q.key] || ''}</textarea>
    </div>`;
  });
  html += `<div class="wam-q">
    <label>Additional notes</label>
    <textarea rows="2" placeholder="Anything else worth capturing..." onchange="saveWAM(${weekToReview},{notes:this.value})">${wam.notes||''}</textarea>
  </div>
  <div class="flex-between mt-8">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="saveWAM(${weekToReview},{});showSaved(this)">Save Review</button>
      <button class="btn btn-secondary btn-sm" onclick="exportWeekCSV(${weekToReview})">📊 Export CSV</button>
    </div>
    <span class="saved-note">✓ Saved</span>
  </div>`;
  html += `</div></div>`;

  return html;
}

// ─── Week Pulse view ──────────────────────────────────────────────────────────
function renderPulse() {
  const ds = today();
  const pulse = getPulse(ds);
  let html = `<div class="banner banner-green">📱 <strong>Weekend Content Check</strong> — quick 5-min review</div>`;
  html += card(`<h2>Content Check</h2>`,
    `<div class="section-label">Did Saturday content post as planned?</div>
    <div class="toggle-group">
      <button class="toggle-btn ${pulse.satPosted===true?'active-yes':''}" onclick="savePulse('${ds}','satPosted',true)">Yes ✓</button>
      <button class="toggle-btn ${pulse.satPosted===false?'active-no':''}" onclick="savePulse('${ds}','satPosted',false)">No / Skipped</button>
    </div>
    <div class="section-label mt-8">Did Sunday content post as planned?</div>
    <div class="toggle-group">
      <button class="toggle-btn ${pulse.sunPosted===true?'active-yes':''}" onclick="savePulse('${ds}','sunPosted',true)">Yes ✓</button>
      <button class="toggle-btn ${pulse.sunPosted===false?'active-no':''}" onclick="savePulse('${ds}','sunPosted',false)">No / Skipped</button>
    </div>
    <div class="section-label mt-8">Quick engagement note (optional)</div>
    <textarea rows="2" placeholder="What performed well? DMs or comments to follow up on?" onchange="savePulse('${ds}','engagementNote',this.value)">${pulse.engagementNote||''}</textarea>
    <div class="flex-between mt-8">
      <button class="btn btn-primary" onclick="savePulse('${ds}','saved',true);showSaved(this)">Save Pulse</button>
      <span class="saved-note">✓ Saved</span>
    </div>`
  );
  return html;
}

// ─── Scorecard view ───────────────────────────────────────────────────────────
function renderScorecard() {
  const wk = Math.min(Math.max(currentWeekNum(), 0), 12);
  let html = '';

  if (isPreSeason()) {
    html += `<div class="banner banner-green">Pre-season — Cycle 2 starts Oct 3, 2026. Scorecard will populate as weeks complete.</div>`;
  } else if (!isPostSeason()) {
    const progress = Math.round((wk / 12) * 100);
    const milestone = daysUntilNextMilestone();
    html += `<div class="card"><div class="card-body">
      <div class="flex-between">
        <span style="font-size:14px;font-weight:700;">Week ${wk} of 12</span>
        <span style="font-size:13px;color:var(--text-muted);">${progress}% through the cycle</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      ${milestone ? `<div class="milestone-chip">📍 Week ${milestone.week} check-in (${milestone.label}) in ${milestone.days} days</div>` : '<div class="milestone-chip">🏁 Final check-in week!</div>'}
    </div></div>`;
  }

  // 12-week grid
  const areas = [
    { label: 'Health',    fn: calcHealthExec },
    { label: 'Spiritual', fn: calcSpiritualExec },
    { label: 'Network',   fn: calcNetExec },
    { label: 'Social',    fn: calcSocExec },
  ];
  const weeks = Array.from({length: 12}, (_, i) => i + 1);

  html += `<div class="card"><div class="card-header"><h2>📊 12-Week Scorecard</h2></div><div class="card-body" style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr><th style="text-align:left;padding:4px;"></th>${weeks.map(w => {
        const cap = getWAM(w).capacity;
        const bg = cap==='crisis' ? '#FFCDD2' : cap==='reduced' ? '#FFF9C4' : 'var(--green)';
        const col = cap==='crisis' ? '#B71C1C' : cap==='reduced' ? '#7B6000' : 'white';
        return `<th style="text-align:center;padding:2px;background:${bg};color:${col};border-radius:2px;font-size:10px;">${w}</th>`;
      }).join('')}</tr>`;

  areas.forEach(area => {
    html += `<tr><td style="padding:6px 4px;font-weight:600;white-space:nowrap;">${area.label}</td>`;
    weeks.forEach(w => {
      const pct = area.fn(w);
      const cls = execColor(pct);
      const display = pct !== null ? pct + '%' : (w > wk ? '' : '—');
      html += `<td class="sc-cell ${cls}">${display}</td>`;
    });
    html += `</tr>`;
  });
  html += `</table>
    <p class="text-muted mt-8" style="font-size:11px;">🟢 ≥80% · 🟡 50–79% · 🔴 &lt;50% · Red header = Crisis week · Yellow = Reduced</p>
  </div></div>`;

  // Goals
  html += card(`<h2>Goals — Cycle 2</h2>`,
    `<div style="font-size:13px;line-height:1.8;">
      <div><strong>Networking:</strong> New contacts 2/wk · Follow-ups 3/wk · Coffees 2/wk · Backlog outreach 2/wk</div>
      <div><strong>Social:</strong> Feed 6/wk · Stories 10/wk · Bridge 1/wk · DMs 2/wk · Comments 3/wk</div>
      <div><strong>Health:</strong> 5 days moved/wk · strength sessions tracked · Oura steps tracked</div>
      <div><strong>Spiritual:</strong> 5 quiet time days/wk · Sabbath observed</div>
      <div><strong>Family:</strong> Sunday dinner · Date night with Clark · Sunday debrief</div>
    </div>`
  );

  return html;
}

// ─── History view ─────────────────────────────────────────────────────────────
function renderHistory() {
  const d = dbC2();
  const wams = d.wam || {};
  const wk = currentWeekNum();
  const hasC1 = !!(db().wam && Object.keys(db().wam).length > 0);

  if (Object.keys(wams).length === 0 && !hasC1) {
    return `<div class="banner banner-green">No WAM reviews saved yet. Complete your first review after Week 1 (Oct 9).</div>`;
  }

  let html = `<h2 style="font-size:15px;font-weight:700;margin-bottom:12px;">Cycle 2 — WAM History</h2>`;

  for (let w = 1; w <= Math.min(isPostSeason() ? 12 : wk, 12); w++) {
    const wam = wams[w]; if (!wam) continue;
    const cap = wam.capacity || 'full';
    const hPct = calcHealthExec(w);
    const sPct = calcSpiritualExec(w);
    const nPct = calcNetExec(w);
    const smPct = calcSocExec(w);
    const borderColor = cap==='crisis' ? 'var(--red)' : cap==='reduced' ? 'var(--yellow)' : 'transparent';

    html += `<div class="history-item" style="border-left:3px solid ${borderColor};" onclick="this.querySelector('.wam-detail').style.display=this.querySelector('.wam-detail').style.display==='none'?'block':'none'">
      <div class="flex-between">
        <h3>Week ${w} · ${formatDate(weekStartDate(w))}</h3>
        ${cap!=='full' ? `<span class="badge ${cap==='crisis'?'badge-red':'badge-yellow'}">${cap}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0;">
        ${hPct  !== null ? `<span class="badge ${hPct>=80?'badge-green':hPct>=50?'badge-yellow':'badge-red'}">H:${hPct}%</span>`  : ''}
        ${sPct  !== null ? `<span class="badge ${sPct>=80?'badge-green':sPct>=50?'badge-yellow':'badge-red'}">S:${sPct}%</span>`   : ''}
        ${nPct  !== null ? `<span class="badge ${nPct>=80?'badge-green':nPct>=50?'badge-yellow':'badge-red'}">N:${nPct}%</span>`   : ''}
        ${smPct !== null ? `<span class="badge ${smPct>=80?'badge-green':smPct>=50?'badge-yellow':'badge-red'}">SM:${smPct}%</span>` : ''}
      </div>
      <div class="wam-detail" style="display:none;margin-top:8px;font-size:13px;line-height:1.6;">
        ${wam.weekContext ? `<div style="background:var(--cream);border-left:3px solid var(--green);padding:8px 10px;border-radius:4px;margin-bottom:8px;"><strong>Context:</strong> ${wam.weekContext}</div>` : ''}
        ${wam.disruptionReason ? `<div><strong>Disruption:</strong> ${wam.disruptionReason}</div>` : ''}
        ${wam.whatWorked  ? `<div><strong>✓ Worked:</strong> ${wam.whatWorked}</div>`         : ''}
        ${wam.whatDidnt   ? `<div><strong>✗ Didn't:</strong> ${wam.whatDidnt}</div>`           : ''}
        ${wam.adjustment  ? `<div><strong>→ Next week:</strong> ${wam.adjustment}</div>`       : ''}
        ${wam.notes       ? `<div><strong>Notes:</strong> ${wam.notes}</div>`                  : ''}
        <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="event.stopPropagation();exportWeekCSV(${w})">📊 Export Week ${w}</button>
      </div>
    </div>`;
  }

  // Cycle 1 archive
  if (hasC1) {
    const c1wams = db().wam || {};
    html += `<h2 style="font-size:13px;font-weight:700;margin:20px 0 8px;color:var(--text-muted);">— Cycle 1 Archive (Jul 6 – Sep 27, 2026) —</h2>`;
    for (let w = 1; w <= 12; w++) {
      const wam = c1wams[w]; if (!wam) continue;
      html += `<div class="history-item" style="opacity:0.7;" onclick="this.querySelector('.c1-detail').style.display=this.querySelector('.c1-detail').style.display==='none'?'block':'none'">
        <h3 style="color:var(--text-muted);">C1 Week ${w}</h3>
        <div class="c1-detail" style="display:none;margin-top:8px;font-size:13px;line-height:1.6;">
          ${wam.weekContext ? `<div><strong>Context:</strong> ${wam.weekContext}</div>` : ''}
          ${wam.whatWorked  ? `<div><strong>✓ Worked:</strong> ${wam.whatWorked}</div>` : ''}
          ${wam.whatDidnt   ? `<div><strong>✗ Didn't:</strong> ${wam.whatDidnt}</div>` : ''}
          ${wam.adjustment  ? `<div><strong>→ Next:</strong> ${wam.adjustment}</div>`  : ''}
        </div>
      </div>`;
    }
  }

  return html;
}

// ─── Export overlay ───────────────────────────────────────────────────────────
function exportWeekCSV(weekNum) {
  const satStr = dateStr(weekStartDate(weekNum));
  const net = getWeeklyNet(satStr);
  const soc = getWeeklySoc(satStr);
  const h   = getWeeklyHealth(satStr);
  const sp  = getWeeklySpiritual(satStr);
  const fam = getWeeklyFamily(satStr);
  const wam = getWAM(weekNum);
  const wkEnd = weekEndDate(weekNum);

  const headers = [
    'Week','Sat Start','Fri End','Capacity','Disruption',
    'New Contacts','Follow-ups Sent','Coffees Scheduled','Backlog Outreach',
    'Events Attended','Events Hosted','Coffees Held','Guests Confirmed','New Clients',
    'FF Scans','FF Calendly','FF Contacts Tagged',
    'Feed Posts','Stories','Bridge','Blog','DMs Sent','Proactive Comments',
    'Non-Follower Reach','Total Engagement','New Followers','DMs Received','Event Registrations',
    'Days Moved','Avg Steps','Strength Sessions',
    'Quiet Time Days','Sabbath','Church Count',
    'Sunday Dinner','Date Night','Sunday Debrief',
    'Net Exec %','Soc Exec %','Health Exec %','Spiritual Exec %'
  ];
  const row = [
    weekNum, satStr, dateStr(wkEnd), wam.capacity||'full', wam.disruptionReason||'',
    net.newContacts||0, net.followUps||0, net.coffees||0, net.backlogOutreach||0,
    net.eventsAttended||0, net.eventsHosted||0, net.coffeesHeld||0, net.guestsConfirmed||0, net.newClients||0,
    net.ffScanCount||0, net.ffCalendlyBookings||0, net.ffContactsTagged||0,
    soc.feedPosts||0, soc.stories||0, soc.bridge||0, soc.blog||0, soc.dmsSent||0, soc.proactiveComments||0,
    soc.nonFollowerReach||0, soc.totalEngagement||0, soc.newFollowers||0, soc.dmsReceived||0, soc.eventRegistrations||0,
    h.daysMoved||0, h.avgSteps||0, h.strengthSessions||0,
    sp.quietTimeDays||0, sp.sabbathObserved?'Yes':'No', sp.churchCount||0,
    fam.sundayDinner?'Yes':'No', fam.dateNight?'Yes':'No', fam.sundayDebrief?'Yes':'No',
    calcNetExec(weekNum)??'', calcSocExec(weekNum)??'', calcHealthExec(weekNum)??'', calcSpiritualExec(weekNum)??''
  ];

  _exportContent = [headers, row].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  _showExport = true;
  rerender();
}

function renderExportOverlay() {
  if (!_showExport) return '';
  return `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this){_showExport=false;rerender()}">
    <div style="background:white;border-radius:12px;padding:16px;width:100%;max-width:600px;max-height:80vh;overflow-y:auto;">
      <div class="flex-between" style="margin-bottom:10px;">
        <h2 style="font-size:15px;font-weight:700;">Export Week Data — CSV</h2>
        <button onclick="_showExport=false;rerender()" style="border:none;background:none;font-size:22px;cursor:pointer;color:var(--text-muted);">×</button>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Copy and paste into your Excel Weekly Tracker.</p>
      <textarea id="exportTextarea" readonly style="width:100%;height:180px;font-family:monospace;font-size:10px;background:var(--cream);">${_exportContent}</textarea>
      <button class="btn btn-primary btn-full mt-8" onclick="copyExportCSV()">Copy to Clipboard</button>
    </div>
  </div>`;
}

function copyExportCSV() {
  const ta = document.getElementById('exportTextarea');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(_exportContent).then(() => alert('Copied!')).catch(() => { ta.select(); document.execCommand('copy'); });
  } else { ta.select(); document.execCommand('copy'); }
}

// ─── Main render ──────────────────────────────────────────────────────────────
function renderMain() {
  const main = document.getElementById('main');
  let html = '';
  switch (currentView) {
    case 'today':     html = renderToday();    break;
    case 'wam':       html = renderWAM();      break;
    case 'pulse':     html = renderPulse();    break;
    case 'scorecard': html = renderScorecard(); break;
    case 'history':   html = renderHistory();  break;
  }
  main.innerHTML = html + renderExportOverlay();
}

function renderHeader() {
  const wk = currentWeekNum();
  const badge = isPreSeason()
    ? `<span class="preseason-badge">Cycle 2 Pre-Season</span>`
    : isPostSeason()
    ? `<span class="week-badge">Cycle 2 Complete</span>`
    : `<span class="week-badge">Week ${wk} of 12</span>`;
  document.querySelector('.app-header .week-badge-slot').innerHTML = badge;
}

let rerenderTimer = null;
function rerender() {
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => { renderMain(); renderHeader(); }, 50);
}

// ─── Save handlers ────────────────────────────────────────────────────────────
function toggleCheck(row) {
  const cb = row.querySelector('input[type=checkbox]');
  if (cb && event.target !== cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
}

function saveWAMField(wk, key, val) { saveWAM(wk, { [key]: val }); }

// ─── Notifications ────────────────────────────────────────────────────────────
async function requestNotifPermission() {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') localStorage.setItem('mfs_notifs', 'enabled');
  rerender();
}

function checkDailyReminder() {
  if (Notification.permission !== 'granted') return;
  if (localStorage.getItem('mfs_notifs') !== 'enabled') return;
  const now = new Date(), h = now.getHours();
  const todayStr = today();
  if (localStorage.getItem('mfs_last_notif') === todayStr) return;
  if (h >= 6 && h < 7) {
    new Notification('12WY Check-In', { body: 'Log your Panda Planner and daily activity.', icon: './MFSlogo2025.png' });
    localStorage.setItem('mfs_last_notif', todayStr);
  }
  if (h >= 16 && h < 17 && (isFriday() || isSaturday())) {
    new Notification('12WY — WAM Time', { body: 'Week review time. How did this week go?', icon: './MFSlogo2025.png' });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

  renderHeader();
  renderMain();

  loadFromSupabase().then(() => { renderHeader(); renderMain(); });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadFromSupabase().then(() => { renderHeader(); renderMain(); });
    }
  });

  const wk = currentWeekNum();
  if ((isFriday() || isSaturday()) && wk > 0) navigate('wam');
  else if (isMonday() && wk > 0) navigate('pulse');

  setInterval(checkDailyReminder, 60000);
  checkDailyReminder();
}

document.addEventListener('DOMContentLoaded', init);
