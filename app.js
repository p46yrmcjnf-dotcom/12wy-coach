// ─── Supabase sync ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://vydpiywmqbevjuyrqcyj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lmNgfdlgU8ZXHBxzhyBOhw_5Mw7i7TM';
const ROW_ID = 'sara';
let _sb = null;
let _syncTimer = null;

function getSB() {
  if (!_sb && window.supabase) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

async function loadFromSupabase() {
  const sb = getSB();
  if (!sb) return;
  try {
    const { data } = await sb.from('app_data').select('data').eq('id', ROW_ID).maybeSingle();
    if (data && data.data && Object.keys(data.data).length > 1) {
      // Supabase is the source of truth — overwrite local completely
      localStorage.setItem(DB_KEY, JSON.stringify(data.data));
    }
  } catch(e) { /* offline — use localStorage */ }
}

async function pushToSupabase(payload) {
  const sb = getSB();
  if (!sb) return;
  try {
    await sb.from('app_data').upsert({ id: ROW_ID, data: payload, updated_at: new Date().toISOString() });
  } catch(e) { /* will retry on next save */ }
}

function scheduleSyncToSupabase() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => pushToSupabase(db()), 1500);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SEASON_START = new Date('2026-07-06T00:00:00');
const SEASON_END   = new Date('2026-09-27T23:59:59');
const MILESTONES   = { 0: 'Jul 6', 4: 'Aug 3', 8: 'Aug 31', 12: 'Sep 27' };

const TRAVEL_WEEKS = {
  1: { label: 'Washington DC', dates: 'Jul 11–14' },
  8: { label: 'Las Vegas', dates: 'Aug 24–28' },
  11: { label: 'Texas', dates: 'Sep 17–20' }
};

// Networking lead indicators (from Excel: Weekly MSP Tracker)
const NET_LEADS = [
  { key: 'newContacts', label: 'New contacts made', target: 2 },
  { key: 'followUps',   label: 'Follow-ups sent',   target: 2 },
  { key: 'coffees',     label: 'Coffee meetings scheduled', target: 2 },
  { key: 'invites',     label: 'Event invites sent', target: 2 }
];

// Social media lead indicators (from Excel: Social Media Weekly Tracker)
// Blog: target 1, but only on publish weeks (1–2x/month). Score as 1 if publish week, else N/A.
const SOC_LEADS = [
  { key: 'feedPosts', label: 'Feed posts (all platforms)', target: 6 },
  { key: 'stories',   label: 'Stories posted',             target: 3 },
  { key: 'bridge',    label: 'Bridge post',                target: 1 },
  { key: 'blog',      label: 'Blog post (publish weeks only)', target: 1, optional: true }
];

// Health daily non-negotiables (from calendar doc)
const HEALTH_DAILY = [
  { key: 'wakeTime',  label: 'Consistent wake time (±45 min window)' },
  { key: 'hormones',  label: 'Hormones / adrenal support taken' },
  { key: 'meals',     label: 'Meals supporting cortisol rhythm' },
  { key: 'oura',      label: 'Checked Oura readiness before training' },
  { key: 'steps',     label: '10,000+ steps' },
  { key: 'journal',   label: 'Journaled morning energy + midday crash' }
];

// Daily social tasks by day-of-week (0=Sun…6=Sat)
const DAILY_SOCIAL = {
  1: ['Instagram Story', '5-min weekend performance check'],
  2: ['Instagram Feed post', 'Facebook Personal post', 'Facebook MFS post'],
  3: ['Instagram Story'],
  4: ['Instagram Feed post', 'Facebook MFS post'],
  5: ['Instagram Story', 'Facebook Personal post', 'LinkedIn post', '15-min full week data review']
};

// Daily networking tasks by day of week
const DAILY_NET = {
  1: ['New networking outreach — contact 1 of 2', 'Follow-up send 1 of 2'],
  2: ['Coffee meeting 1 of 2', 'Event invite send 1 of 2'],
  3: ['Coffee meeting 2 of 2', 'New networking outreach — contact 2 of 2'],
  4: ['Follow-up send 2 of 2', 'Event invite send 2 of 2'],
  5: ['Coffee / open networking slot (11:45am–2pm)']
};

// ─── Data layer ───────────────────────────────────────────────────────────────
const DB_KEY = 'mfs_12wy';

function db() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; } catch { return {}; }
}

function save(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  scheduleSyncToSupabase();
}

function getDailyLog(dateStr) {
  const d = db();
  return (d.dailyLogs || {})[dateStr] || {};
}

function saveDailyLog(dateStr, log) {
  const d = db();
  if (!d.dailyLogs) d.dailyLogs = {};
  d.dailyLogs[dateStr] = { ...(d.dailyLogs[dateStr] || {}), ...log };
  save(d);
}

function getWAM(weekNum) {
  const d = db();
  return ((d.wam || {})[weekNum]) || {};
}

function saveWAM(weekNum, data) {
  const d = db();
  if (!d.wam) d.wam = {};
  d.wam[weekNum] = { ...(d.wam[weekNum] || {}), ...data };
  save(d);
}

function getMondayPulse(dateStr) {
  const d = db();
  return ((d.mondayPulse || {})[dateStr]) || {};
}

function saveMondayPulse(dateStr, data) {
  const d = db();
  if (!d.mondayPulse) d.mondayPulse = {};
  d.mondayPulse[dateStr] = { ...(d.mondayPulse[dateStr] || {}), ...data };
  save(d);
}

// ─── Date utilities ────────────────────────────────────────────────────────────
function today() {
  const d = new Date();
  return dateStr(d);
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function currentWeekNum() {
  const now = new Date();
  if (now < SEASON_START) return 0;
  if (now > SEASON_END) return 13;
  return Math.ceil((now - SEASON_START) / (7 * 24 * 60 * 60 * 1000));
}

function isPreSeason() { return new Date() < SEASON_START; }
function isPostSeason() { return new Date() > SEASON_END; }

function weekStartDate(weekNum) {
  const d = new Date(SEASON_START);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return d;
}

function daysUntilNextMilestone() {
  const wk = currentWeekNum();
  const milestoneWeeks = [4, 8, 12];
  const next = milestoneWeeks.find(w => w > wk);
  if (!next) return null;
  const milestoneDate = weekStartDate(next);
  const diff = Math.ceil((milestoneDate - new Date()) / (24 * 60 * 60 * 1000));
  return { week: next, days: diff, label: MILESTONES[next] };
}

function dayOfWeek() { return new Date().getDay(); } // 0=Sun

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function isFriday() { return new Date().getDay() === 5; }
function isMonday() { return new Date().getDay() === 1; }

// ─── Execution % calculation ──────────────────────────────────────────────────
// Health: sum of daily checks across the week / (6 items × 7 days)
function calcHealthExec(weekNum) {
  const wkStart = weekStartDate(weekNum);
  let total = 0, done = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(wkStart);
    d.setDate(d.getDate() + i);
    if (d > new Date()) continue;
    const log = getDailyLog(dateStr(d));
    const health = log.health || {};
    total += HEALTH_DAILY.length;
    done += HEALTH_DAILY.filter(h => health[h.key]).length;
  }
  if (total === 0) return null;
  return Math.round((done / total) * 100);
}

// Spiritual: quiet time days / 6 (target 6–7, cap at 100%)
function calcSpiritualExec(weekNum) {
  const wkStart = weekStartDate(weekNum);
  let days = 0, counted = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(wkStart);
    d.setDate(d.getDate() + i);
    if (d > new Date()) continue;
    counted++;
    const log = getDailyLog(dateStr(d));
    if (log.quietTime) days++;
  }
  if (counted === 0) return null;
  return Math.min(Math.round((days / 6) * 100), 100);
}

// Family: Sunday dinner (binary), hike tracked separately
function calcFamilyExec(weekNum) {
  const wkStart = weekStartDate(weekNum);
  // Sunday is day 6 of the week (Mon=0 offset)
  const sunday = new Date(wkStart);
  sunday.setDate(sunday.getDate() + 6);
  if (sunday > new Date()) return null;
  const log = getDailyLog(dateStr(sunday));
  return log.sundayDinner ? 100 : 0;
}

function execColor(pct) {
  if (pct === null) return 'sc-future';
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

// ─── Router ───────────────────────────────────────────────────────────────────
let currentView = 'today';

function navigate(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  renderMain();
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function card(headerHtml, bodyHtml) {
  return `<div class="card"><div class="card-header">${headerHtml}</div><div class="card-body">${bodyHtml}</div></div>`;
}

function showSaved(btn) {
  const note = btn.parentElement.querySelector('.saved-note');
  if (note) { note.classList.add('show'); setTimeout(() => note.classList.remove('show'), 2000); }
}

// ─── Views ────────────────────────────────────────────────────────────────────

function renderToday() {
  const todayStr = today();
  const log = getDailyLog(todayStr);
  const dow = dayOfWeek();
  const wk = currentWeekNum();
  const health = log.health || {};
  const pct = calcHealthExec(wk > 0 ? wk : 1);

  let html = '';

  // Travel week banner
  if (wk > 0 && TRAVEL_WEEKS[wk]) {
    const t = TRAVEL_WEEKS[wk];
    html += `<div class="banner banner-travel">✈️ <strong>Travel week — ${t.label}</strong> (${t.dates}). Minimum viable, not zero: 10k steps, Moves app, Oura on. No self-penalty for missed gym.</div>`;
  }

  // Notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    html += `<div class="notif-bar">🔔 Enable reminders to get morning + Friday WAM prompts <button class="btn btn-sm btn-primary" onclick="requestNotifPermission()">Enable</button></div>`;
  }

  // Panda Planner
  html += card(
    `<h2>🐼 Panda Planner</h2>`,
    `<div class="check-item" onclick="toggleCheck(this)">
      <input type="checkbox" id="panda" ${log.pandaPlanner ? 'checked' : ''} onchange="savePanda(this.checked)">
      <label for="panda" class="${log.pandaPlanner ? 'done' : ''}">Filled out today's Panda Planner (top-3 priorities + gratitude)</label>
    </div>`
  );

  // Morning check-in
  const energy = log.energyLevel || '';
  html += `<div class="card">
    <div class="card-header"><h2>☀️ Morning Check-In</h2></div>
    <div class="card-body">
      <div class="slider-row">
        <label>Morning energy</label>
        <input type="range" class="energy-slider" min="1" max="10" value="${energy || 5}"
          oninput="this.nextElementSibling.textContent=this.value;saveEnergy(this.value)" />
        <span class="slider-val">${energy || 5}</span>
      </div>
      <div class="section-label mt-8">Health Non-Negotiables</div>
      ${HEALTH_DAILY.map(h => `
        <div class="check-item" onclick="toggleCheck(this)">
          <input type="checkbox" id="h_${h.key}" ${health[h.key] ? 'checked' : ''} onchange="saveHealth('${h.key}', this.checked)">
          <label for="h_${h.key}" class="${health[h.key] ? 'done' : ''}">${h.label}</label>
        </div>`).join('')}
      <div class="section-label mt-8">Spiritual</div>
      <div class="check-item" onclick="toggleCheck(this)">
        <input type="checkbox" id="quietTime" ${log.quietTime ? 'checked' : ''} onchange="saveField('quietTime', this.checked)">
        <label for="quietTime" class="${log.quietTime ? 'done' : ''}">Quiet time: prayer, Bible, journaling</label>
      </div>
    </div>
  </div>`;

  // Today's networking tasks
  const netTasks = DAILY_NET[dow] || [];
  if (netTasks.length) {
    const netDone = log.netTasks || {};
    html += card(
      `<h2>🤝 Networking</h2>`,
      netTasks.map((t, i) => `
        <div class="check-item" onclick="toggleCheck(this)">
          <input type="checkbox" id="net_${i}" ${netDone[i] ? 'checked' : ''} onchange="saveNetTask(${i}, this.checked)">
          <label for="net_${i}" class="${netDone[i] ? 'done' : ''}">${t}</label>
        </div>`).join('')
    );
  }

  // Today's social tasks
  const socTasks = DAILY_SOCIAL[dow] || [];
  if (socTasks.length) {
    const socDone = log.socTasks || {};
    html += card(
      `<h2>📱 Social Media</h2>`,
      socTasks.map((t, i) => `
        <div class="check-item" onclick="toggleCheck(this)">
          <input type="checkbox" id="soc_${i}" ${socDone[i] ? 'checked' : ''} onchange="saveSocTask(${i}, this.checked)">
          <label for="soc_${i}" class="${socDone[i] ? 'done' : ''}">${t}</label>
        </div>`).join('')
    );
  }

  // Sunday extras
  if (dow === 0) {
    html += card(
      `<h2>👨‍👩‍👧 Family — Sunday</h2>`,
      `<div class="check-item" onclick="toggleCheck(this)">
        <input type="checkbox" id="sundayDinner" ${log.sundayDinner ? 'checked' : ''} onchange="saveField('sundayDinner', this.checked)">
        <label for="sundayDinner" class="${log.sundayDinner ? 'done' : ''}">Family dinner (protected — no commitments scheduled against it)</label>
      </div>
      <div class="check-item" onclick="toggleCheck(this)">
        <input type="checkbox" id="sundayDebrief" ${log.sundayDebrief ? 'checked' : ''} onchange="saveField('sundayDebrief', this.checked)">
        <label for="sundayDebrief" class="${log.sundayDebrief ? 'done' : ''}">9:30pm debrief + light week-ahead scan</label>
      </div>`
    );
  }

  // Friday hike (every Friday)
  if (dow === 5) {
    html += card(
      `<h2>🥾 Family — Friday Hike</h2>`,
      `<div class="check-item" onclick="toggleCheck(this)">
        <input type="checkbox" id="fridayHike" ${log.fridayHike ? 'checked' : ''} onchange="saveField('fridayHike', this.checked)">
        <label for="fridayHike" class="${log.fridayHike ? 'done' : ''}">Hike attempt — whoever's free (tracked, not scored)</label>
      </div>`
    );
  }

  // Evening check-in
  html += `<div class="card">
    <div class="card-header"><h2>🌙 Evening Check-In <span class="text-muted" style="font-size:11px;font-weight:400;margin-left:4px;">(optional)</span></h2></div>
    <div class="card-body">
      <div class="section-label">Midday crash?</div>
      <div class="toggle-group">
        <button class="toggle-btn ${log.middayCrash === false ? 'active-yes' : ''}" onclick="saveMiddayCrash(false)">No crash ✓</button>
        <button class="toggle-btn ${log.middayCrash === true ? 'active-no' : ''}" onclick="saveMiddayCrash(true)">Had a crash</button>
      </div>
      <div class="section-label mt-8">Evening notes (optional)</div>
      <textarea rows="2" placeholder="What got done, anything to note..." onchange="saveField('eveningNotes', this.value)">${log.eveningNotes || ''}</textarea>
    </div>
  </div>`;

  // Oura guardrail check
  const ouraBelow = log.ouraReadiness && log.ouraReadiness < 60;
  if (ouraBelow) {
    html += `<div class="banner banner-yellow">⚠️ <strong>HPA Guardrail:</strong> Oura readiness below 60. Scale back to Moves app or a walk — don't push into a gym class.</div>`;
  }

  // Oura readiness log
  html += `<div class="card">
    <div class="card-header"><h2>💍 Oura Readiness</h2></div>
    <div class="card-body">
      <div class="slider-row">
        <label>Today's score</label>
        <input type="range" min="0" max="100" value="${log.ouraReadiness || 75}"
          oninput="this.nextElementSibling.textContent=this.value;saveField('ouraReadiness',parseInt(this.value))" />
        <span class="slider-val">${log.ouraReadiness || 75}</span>
      </div>
      ${log.ouraReadiness && log.ouraReadiness < 70 ? `<p class="text-muted mt-8">⚠️ Below 70 — consider scaling back training today.</p>` : ''}
    </div>
  </div>`;

  return html;
}

function renderWAM() {
  const wk = currentWeekNum();
  if (wk === 0) return `<div class="banner banner-green">Pre-season — Week 1 starts July 6. The Friday WAM will be available then.</div>`;

  const displayWk = isFriday() ? wk : wk - 1;
  const weekToReview = displayWk > 0 ? displayWk : 1;

  let html = `<div class="banner banner-green">📋 <strong>Week ${weekToReview} Accountability Review</strong> — Friday, 4:00–4:20pm</div>`;

  // Auto-calculated execution scores
  const hPct = calcHealthExec(weekToReview);
  const sPct = calcSpiritualExec(weekToReview);
  const fPct = calcFamilyExec(weekToReview);
  const wam = getWAM(weekToReview);

  html += card(
    `<h2>📊 Lead Execution %</h2><span class="text-muted" style="font-size:11px;margin-left:auto;">What did the data say?</span>`,
    `<div class="exec-row">
      <span class="exec-name">Health</span>
      <span class="exec-pct ${execClass(hPct)}">${hPct !== null ? hPct + '%' : '—'}</span>
    </div>
    <div class="exec-row">
      <span class="exec-name">Spiritual</span>
      <span class="exec-pct ${execClass(sPct)}">${sPct !== null ? sPct + '%' : '—'}</span>
    </div>
    <div class="exec-row">
      <span class="exec-name">Family (Sunday dinner)</span>
      <span class="exec-pct ${execClass(fPct)}">${fPct !== null ? fPct + '%' : '—'}</span>
    </div>
    <div class="exec-row">
      <span class="exec-name">Networking <span class="text-muted" style="font-size:11px;">(from Excel)</span></span>
      <input type="number" min="0" max="100" value="${wam.networkingPct || ''}" placeholder="%"
        style="width:64px;text-align:center" onchange="saveWAMField(${weekToReview},'networkingPct',parseInt(this.value)||0)">
    </div>
    <div class="exec-row">
      <span class="exec-name">Social Media <span class="text-muted" style="font-size:11px;">(from Excel)</span></span>
      <input type="number" min="0" max="100" value="${wam.socialPct || ''}" placeholder="%"
        style="width:64px;text-align:center" onchange="saveWAMField(${weekToReview},'socialPct',parseInt(this.value)||0)">
    </div>
    <p class="text-muted mt-8" style="font-size:12px;">🟢 ≥80% · 🟡 50–79% · 🔴 &lt;50% — Copy Networking & Social % from your Excel tracker (Weekly MSP Tracker / Social Media Weekly Tracker tabs).</p>`
  );

  html += `<div class="card"><div class="card-header"><h2>📝 Weekly Reflection</h2></div><div class="card-body">`;

  const questions = [
    { key: 'whatWorked', label: 'What worked this week?', placeholder: 'Actions, habits, or mindset shifts that drove results...' },
    { key: 'whatDidnt', label: "What didn't work / what got in the way?", placeholder: 'Be honest — this is just for you...' },
    { key: 'adjustment', label: 'One specific adjustment for next week', placeholder: 'Small and actionable — what exactly will you do differently?' }
  ];

  questions.forEach(q => {
    html += `<div class="wam-q">
      <label>${q.label}</label>
      <textarea rows="3" placeholder="${q.placeholder}" onchange="saveWAMField(${weekToReview},'${q.key}',this.value)">${wam[q.key] || ''}</textarea>
    </div>`;
  });

  html += `<div class="wam-q">
    <label>Additional notes</label>
    <textarea rows="2" placeholder="Anything else worth capturing..." onchange="saveWAMField(${weekToReview},'notes',this.value)">${wam.notes || ''}</textarea>
  </div>`;

  html += `<div class="flex-between mt-8">
    <button class="btn btn-primary" onclick="saveWAMNow(${weekToReview}, this)">Save Review</button>
    <span class="saved-note">✓ Saved</span>
  </div>`;

  html += `</div></div>`;

  // Link reminder for Excel
  html += `<div class="banner banner-yellow" style="font-size:12px;">📊 After saving, update your Excel file: enter week ${weekToReview} data in the <strong>Weekly MSP Tracker</strong> and <strong>Social Media Weekly Tracker</strong> tabs.</div>`;

  return html;
}

function renderMondayPulse() {
  const todayStr = today();
  const pulse = getMondayPulse(todayStr);

  let html = `<div class="banner banner-green">📱 <strong>Monday Social Media Pulse</strong> — 5 minutes, 1:30–1:45pm</div>`;

  html += card(
    `<h2>Weekend Content Check</h2>`,
    `<div class="section-label">Did Saturday content post as planned?</div>
    <div class="toggle-group">
      <button class="toggle-btn ${pulse.satPosted === true ? 'active-yes' : ''}" onclick="savePulse('satPosted',true)">Yes ✓</button>
      <button class="toggle-btn ${pulse.satPosted === false ? 'active-no' : ''}" onclick="savePulse('satPosted',false)">No / Skipped</button>
    </div>
    <div class="section-label mt-8">Did Sunday content post as planned?</div>
    <div class="toggle-group">
      <button class="toggle-btn ${pulse.sunPosted === true ? 'active-yes' : ''}" onclick="savePulse('sunPosted',true)">Yes ✓</button>
      <button class="toggle-btn ${pulse.sunPosted === false ? 'active-no' : ''}" onclick="savePulse('sunPosted',false)">No / Skipped</button>
    </div>
    <div class="section-label mt-8">Quick engagement note (optional)</div>
    <textarea rows="2" placeholder="What performed well? Any comments or DMs to follow up on?" onchange="savePulse('engagementNote',this.value)">${pulse.engagementNote || ''}</textarea>
    <div class="flex-between mt-8">
      <button class="btn btn-primary" onclick="savePulseNow(this)">Save Pulse</button>
      <span class="saved-note">✓ Saved</span>
    </div>`
  );

  html += `<div class="banner banner-yellow" style="font-size:12px;">📊 Full social media review is Friday 4:20–4:45pm — log all lead/lag numbers in your Excel <strong>Social Media Weekly Tracker</strong> tab then.</div>`;

  return html;
}

function renderScorecard() {
  const wk = Math.min(currentWeekNum(), 12);
  const milestone = daysUntilNextMilestone();

  let html = '';

  // Progress
  if (!isPreSeason() && !isPostSeason()) {
    const progress = Math.round((wk / 12) * 100);
    html += `<div class="card"><div class="card-body">
      <div class="flex-between">
        <span style="font-size:14px;font-weight:700;">Week ${wk} of 12</span>
        <span style="font-size:13px;color:var(--text-muted);">${progress}% through the season</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      ${milestone ? `<div class="milestone-chip">📍 Week ${milestone.week} health check-in (${milestone.label}) in ${milestone.days} days</div>` : '<div class="milestone-chip">🏁 Final check-in week!</div>'}
    </div></div>`;
  } else if (isPreSeason()) {
    html += `<div class="banner banner-green">Pre-season — Week 1 starts July 6, 2026. Scorecard will populate as weeks complete.</div>`;
  }

  // Health baselines reminder
  html += card(
    `<h2>Health Targets</h2><span class="badge badge-green" style="margin-left:auto;">Check-ins: Wks 0/4/8/12</span>`,
    `<table style="width:100%;font-size:12px;border-collapse:collapse;">
      <tr style="color:var(--text-muted);"><td style="padding:4px 0;font-weight:700;">Metric</td><td style="text-align:right;font-weight:700;padding:4px;">Baseline</td><td style="text-align:right;font-weight:700;padding:4px;">Week 12 Goal</td></tr>
      <tr><td style="padding:4px 0;">HRV (Oura)</td><td style="text-align:right;padding:4px;">~47 ms</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">55+ ms</td></tr>
      <tr><td>RHR</td><td style="text-align:right;padding:4px;">~47 bpm</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">Low 40s</td></tr>
      <tr><td>Oura stress</td><td style="text-align:right;padding:4px;">~39</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">&lt;35</td></tr>
      <tr><td>Total sleep</td><td style="text-align:right;padding:4px;">6h 35m</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">7h 15m</td></tr>
      <tr><td>REM %</td><td style="text-align:right;padding:4px;">13%</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">18%+</td></tr>
      <tr><td>Waist</td><td style="text-align:right;padding:4px;">32.6 in</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">↓ trending</td></tr>
      <tr><td>Lean mass</td><td style="text-align:right;padding:4px;">~100 lb</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">Maintain / ↑</td></tr>
      <tr><td>Visceral fat</td><td style="text-align:right;padding:4px;">7</td><td style="text-align:right;padding:4px;color:var(--green);font-weight:600;">6</td></tr>
    </table>`
  );

  // 12-week scorecard grid
  const weeks = Array.from({length: 12}, (_, i) => i + 1);
  const areas = [
    { label: 'Health', fn: calcHealthExec },
    { label: 'Spiritual', fn: calcSpiritualExec },
    { label: 'Family', fn: calcFamilyExec }
  ];

  html += `<div class="card"><div class="card-header"><h2>📊 12-Week Scorecard</h2></div><div class="card-body" style="overflow-x:auto;">`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:11px;">`;
  html += `<tr><th style="text-align:left;padding:4px;"></th>${weeks.map(w => `<th style="text-align:center;padding:2px;background:var(--green);color:white;border-radius:2px;">${w}</th>`).join('')}</tr>`;

  areas.forEach(area => {
    html += `<tr><td style="padding:6px 4px;font-weight:600;white-space:nowrap;">${area.label}</td>`;
    weeks.forEach(w => {
      const pct = area.fn(w);
      const cls = execColor(pct);
      const display = pct !== null ? pct + '%' : (w > wk ? '' : '—');
      html += `<td class="sc-cell ${cls}" style="padding:5px 1px;">${display}</td>`;
    });
    html += `</tr>`;
  });
  html += `</table>`;
  html += `<p class="text-muted mt-8" style="font-size:11px;">🟢 ≥80% · 🟡 50–79% · 🔴 &lt;50% &nbsp;|&nbsp; Networking & Social Media detail: see your Excel tracker</p>`;
  html += `</div></div>`;

  // Goal summary
  html += card(
    `<h2>Goals at a Glance</h2>`,
    `<div style="font-size:13px;line-height:1.8;">
      <div><strong>Networking:</strong> 3–5 new clients by Sep 27 · 2-2-2-2 weekly rhythm</div>
      <div><strong>Social:</strong> 8–12 Money 101 registrations via social · 20%+ non-follower reach ↑</div>
      <div><strong>Health:</strong> HRV 47→55+, sleep 6h35→7h15, visceral fat 7→6</div>
      <div><strong>Spiritual:</strong> Quiet time 3 days → 6–7 days/week</div>
      <div><strong>Family:</strong> Sunday dinner protected every week</div>
    </div>`
  );

  return html;
}

function renderHistory() {
  const d = db();
  const wams = d.wam || {};
  const wk = currentWeekNum();

  if (Object.keys(wams).length === 0) {
    return `<div class="banner banner-green">No WAM reviews saved yet. Complete your first Friday review on July 10.</div>`;
  }

  let html = `<h2 style="font-size:15px;font-weight:700;margin-bottom:12px;">WAM Review History</h2>`;

  for (let w = 1; w <= Math.min(wk, 12); w++) {
    const wam = wams[w];
    if (!wam) continue;
    const hPct = calcHealthExec(w);
    const sPct = calcSpiritualExec(w);
    const fPct = calcFamilyExec(w);
    const nPct = wam.networkingPct;
    const socPct = wam.socialPct;

    html += `<div class="history-item" onclick="this.querySelector('.wam-detail').style.display = this.querySelector('.wam-detail').style.display==='none'?'block':'none'">
      <h3>Week ${w} Review</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0;">
        ${hPct !== null ? `<span class="badge ${hPct>=80?'badge-green':hPct>=50?'badge-yellow':'badge-red'}">H:${hPct}%</span>` : ''}
        ${sPct !== null ? `<span class="badge ${sPct>=80?'badge-green':sPct>=50?'badge-yellow':'badge-red'}">S:${sPct}%</span>` : ''}
        ${fPct !== null ? `<span class="badge ${fPct>=80?'badge-green':fPct>=50?'badge-yellow':'badge-red'}">F:${fPct}%</span>` : ''}
        ${nPct !== undefined ? `<span class="badge ${nPct>=80?'badge-green':nPct>=50?'badge-yellow':'badge-red'}">N:${nPct}%</span>` : ''}
        ${socPct !== undefined ? `<span class="badge ${socPct>=80?'badge-green':socPct>=50?'badge-yellow':'badge-red'}">SM:${socPct}%</span>` : ''}
      </div>
      <div class="wam-detail" style="display:none;margin-top:8px;font-size:13px;line-height:1.6;">
        ${wam.whatWorked ? `<div><strong>✓ Worked:</strong> ${wam.whatWorked}</div>` : ''}
        ${wam.whatDidnt ? `<div><strong>✗ Didn't work:</strong> ${wam.whatDidnt}</div>` : ''}
        ${wam.adjustment ? `<div><strong>→ Adjustment:</strong> ${wam.adjustment}</div>` : ''}
        ${wam.notes ? `<div><strong>Notes:</strong> ${wam.notes}</div>` : ''}
      </div>
    </div>`;
  }

  return html;
}

// ─── Main render ──────────────────────────────────────────────────────────────
function renderMain() {
  const main = document.getElementById('main');
  switch (currentView) {
    case 'today':   main.innerHTML = renderToday(); break;
    case 'wam':     main.innerHTML = renderWAM(); break;
    case 'monday':  main.innerHTML = renderMondayPulse(); break;
    case 'scorecard': main.innerHTML = renderScorecard(); break;
    case 'history': main.innerHTML = renderHistory(); break;
  }
}

function renderHeader() {
  const wk = currentWeekNum();
  const badge = isPreSeason()
    ? `<span class="preseason-badge">Pre-Season</span>`
    : isPostSeason()
    ? `<span class="week-badge">Season Complete</span>`
    : `<span class="week-badge">Week ${wk} of 12</span>`;

  document.querySelector('.app-header .week-badge-slot').innerHTML = badge;
}

// ─── Save handlers ────────────────────────────────────────────────────────────
function toggleCheck(row) {
  const cb = row.querySelector('input[type=checkbox]');
  if (cb && event.target !== cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
}

function savePanda(val) { saveDailyLog(today(), { pandaPlanner: val }); rerender(); }
function saveEnergy(val) { saveDailyLog(today(), { energyLevel: parseInt(val) }); }
function saveField(key, val) { saveDailyLog(today(), { [key]: val }); rerender(); }
function saveMiddayCrash(val) { saveDailyLog(today(), { middayCrash: val }); rerender(); }

function saveHealth(key, val) {
  const log = getDailyLog(today());
  const health = { ...(log.health || {}), [key]: val };
  saveDailyLog(today(), { health });
  rerender();
}

function saveNetTask(idx, val) {
  const log = getDailyLog(today());
  const netTasks = { ...(log.netTasks || {}), [idx]: val };
  saveDailyLog(today(), { netTasks });
  rerender();
}

function saveSocTask(idx, val) {
  const log = getDailyLog(today());
  const socTasks = { ...(log.socTasks || {}), [idx]: val };
  saveDailyLog(today(), { socTasks });
  rerender();
}

function saveWAMField(weekNum, key, val) { saveWAM(weekNum, { [key]: val }); }
function saveWAMNow(weekNum, btn) { saveWAM(weekNum, {}); showSaved(btn); }

function savePulse(key, val) { saveMondayPulse(today(), { [key]: val }); rerender(); }
function savePulseNow(btn) { saveMondayPulse(today(), {}); showSaved(btn); }

let rerenderTimer = null;
function rerender() {
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => { renderMain(); renderHeader(); }, 50);
}

// ─── Notifications ────────────────────────────────────────────────────────────
async function requestNotifPermission() {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') scheduleNotifications();
  rerender();
}

function scheduleNotifications() {
  if (!('serviceWorker' in navigator)) return;
  // Schedule via periodic check — simplified for PWA
  localStorage.setItem('mfs_notifs', 'enabled');
}

function checkDailyReminder() {
  if (Notification.permission !== 'granted') return;
  if (localStorage.getItem('mfs_notifs') !== 'enabled') return;
  const now = new Date();
  const h = now.getHours();
  const todayStr = today();
  const lastNotif = localStorage.getItem('mfs_last_notif');
  if (lastNotif === todayStr) return;

  if (h >= 6 && h < 7) {
    new Notification('12WY Morning Check-In', { body: 'Fill out your Panda Planner and log your morning check-in.', icon: './MFSlogo2025.png' });
    localStorage.setItem('mfs_last_notif', todayStr);
  }
  if (h >= 16 && h < 17 && new Date().getDay() === 5) {
    new Notification('12WY — Friday WAM', { body: 'Time for your 4pm accountability review. How did this week go?', icon: './MFSlogo2025.png' });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  renderHeader();
  renderMain();

  // Load latest data from Supabase then re-render
  loadFromSupabase().then(() => { renderHeader(); renderMain(); });

  // Re-sync whenever the app comes back into focus (switching tabs or returning from another app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadFromSupabase().then(() => { renderHeader(); renderMain(); });
    }
  });

  // Auto-show WAM on Friday, Monday pulse on Monday
  if (isFriday() && currentWeekNum() > 0) navigate('wam');
  else if (isMonday() && currentWeekNum() > 0) navigate('monday');

  // Check reminder
  setInterval(checkDailyReminder, 60 * 1000);
  checkDailyReminder();
}

document.addEventListener('DOMContentLoaded', init);
