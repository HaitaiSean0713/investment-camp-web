const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dollars = v => v == null ? '—' : '$' + Number(v).toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
const signed = v => v == null ? '—' : (Number(v)>=0?'+':'')+Number(v).toFixed(2)+'%';
const time = v => v ? new Date(v).toLocaleString('zh-TW',{hour12:false}) : '—';
const stageName = {PREPARING:'準備中',INFORMATION:'情報閱讀',DISCUSSION:'情報交流',TRADING:'交易進行中',CLOSED:'交易已關閉',RESULT:'績效公布',BREAK:'休息時間',FINISHED:'活動結束'};

const svgIcons = {
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  setup: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  teams: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  stocks: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  rounds: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  intelligence: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  transactions: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>',
  snapshots: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  import: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
  market: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
  portfolio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  ranking: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>'
};

const app = $('#app');
const state = {
  page: location.pathname.startsWith('/presenter/') ? 'presenter' : location.pathname.startsWith('/team') ? 'team' : 'admin',
  adminTab: 'dashboard',
  teamTab: 'market',
  activities: [],
  aid: Number(localStorage.getItem('camp_aid') || 0),
  dashboard: null,
  team: null,
  presenter: null,
  stockId: null,
  link: null,
  timer: 0
};

const brandLogoSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>';

function brand(subtitle='NYCU IMF CAMP'){
  return `<div class="brand"><span class="brandmark">${brandLogoSvg}</span><div class="brand-text"><span>NYCU IMF CAMP</span><small>${escapeHtml(subtitle)}</small></div></div>`;
}

function winBar(title=''){
  if(!title) return '';
  const clean = title.replace(/\/\/.*$/, '').trim();
  return `<div class="card-bar"><span class="card-bar-tag">${escapeHtml(clean || title)}</span></div>`;
}

async function api(path, method='GET', body){
  const opts = {method, credentials:'same-origin', headers:{}};
  if(body !== undefined){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(path, opts);
  let data; try{ data = await res.json(); } catch{ data = {error: '伺服器回應格式錯誤'}; }
  if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function toast(msg, error=false){
  const el = $('#toast');
  const icon = error
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>';
  el.innerHTML = `${icon}<span>${escapeHtml(msg)}</span>`;
  el.className = (error ? 'error ' : '') + 'show';
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.className = '', 3800);
}

function fatal(msg){
  app.innerHTML = `<div class="auth"><div class="card auth-card">${winBar('SYSTEM NOTICE')}<div class="pad">${brand('SYSTEM ERROR')}<h1 style="color:var(--accent-red);margin-top:20px">無法載入系統</h1><p>${escapeHtml(msg)}</p><button class="btn primary block" data-action="reload" style="margin-top:20px">重新整理連線</button></div></div></div>`;
}

function badge(text, kind=''){ return `<span class="badge ${kind}">${escapeHtml(text)}</span>`; }
function empty(title, text=''){ return `<div class="empty"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div>`; }
function field(label, name, type='text', value='', extra=''){ return `<label>${escapeHtml(label)}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`; }
function btn(label, action, klass='', extra=''){ return `<button class="btn ${klass}" data-action="${action}" ${extra}>${label}</button>`; }
function formData(form){ const o = {}; new FormData(form).forEach((v, k) => o[k] = v); return o; }

function modal(title, html, actions=''){
  let d = $('#modal');
  if(!d){ d = document.createElement('dialog'); d.id = 'modal'; document.body.append(d); }
  d.innerHTML = `<div class="modal-header"><h3 class="modal-title">${escapeHtml(title)}</h3><button class="modal-close" data-action="close-modal" aria-label="關閉">✕</button></div><div class="modal-inner">${html}<div class="form-actions">${actions}</div></div>`;
  d.showModal();
  return d;
}

function closeModal(){ const d = $('#modal'); if(d?.open) d.close(); }
function confirmAction(title, body, action){
  modal(title, `<p style="line-height:1.7;margin-bottom:8px">${body}</p>`, `${btn('取消', 'close-modal', 'ghost')} ${btn('確認執行', action, 'primary')}`);
}
function spinner(){ app.innerHTML = '<div class="loading">系統載入中…</div>'; }
function options(list, selected, label='name', value='id'){
  return list.map(x => `<option value="${escapeHtml(x[value])}" ${String(x[value])===String(selected)?'selected':''}>${escapeHtml(x[label])}</option>`).join('');
}
function getRound(){ return state.dashboard?.rounds.find(r => r.round_number === state.dashboard.current_round); }

async function init(){
  try{
    if(state.page === 'admin') await loadAdmin();
    else if(state.page === 'team') await loadTeam();
    else await loadPresenter();
  }catch(e){ fatal(e.message); }
  setInterval(tick, 1000);
  setInterval(async () => {
    try{
      if(state.page === 'presenter') await loadPresenter(false);
      if(state.page === 'team') await loadTeam(false);
    }catch{}
  }, 8000);
}

function tick(){
  if(state.timer > 0) state.timer--;
  $$('[data-clock]').forEach(el => { el.textContent = formatClock(state.timer); });
}

function formatClock(seconds){
  seconds = Math.max(0, seconds || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

async function loadAdmin(render=true){
  const me = await api('/api/auth/me');
  if(me.role !== 'admin'){ renderLogin(); return; }
  state.activities = await api('/api/admin/activities');
  if(!state.activities.some(a => a.id === state.aid)) state.aid = state.activities[0]?.id || 0;
  localStorage.setItem('camp_aid', state.aid);
  state.dashboard = state.aid ? await api(`/api/admin/activity/${state.aid}`) : null;
  state.timer = state.dashboard?.timer_remaining_live || 0;
  if(render) renderAdmin();
}

function renderLogin(){
  app.innerHTML = `<div class="auth"><div class="card auth-card">${winBar('ADMIN AUTH')}<div class="pad">${brand('ADMIN WORKSPACE')}<h1 style="margin-top:20px">管理員戰情登入</h1><p>請輸入管理員密碼，解鎖整場營隊的行情調控與資訊發布權限。</p><form data-form="login"><label>管理員主密碼<input type="password" name="password" required autocomplete="current-password" autofocus placeholder="••••••••••••"></label><button class="btn primary block" style="margin-top:12px">登入管理後台 →</button></form></div></div></div>`;
}

const adminTabs = [
  ['dashboard', '總覽戰情'],
  ['setup', '活動設定'],
  ['teams', '小隊席位'],
  ['stocks', '市場股票'],
  ['rounds', '回合價格'],
  ['intelligence', '情報發布'],
  ['transactions', '交易紀錄'],
  ['snapshots', '績效快照'],
  ['import', '批次匯入']
];

function renderAdmin(){
  const a = state.dashboard;
  app.innerHTML = `<div class="layout"><aside class="sidebar">${brand('ADMIN DASHBOARD')}<nav class="nav">${adminTabs.map(([id, label]) => `<button data-tab="${id}" class="${state.adminTab===id?'active':''}"><span class="nav-icon">${svgIcons[id]||''}</span><span>${label}</span></button>`).join('')}</nav><div class="sidefoot"><strong style="color:var(--text);display:block;margin-bottom:4px">NYCU IMF CAMP</strong>國立陽明交通大學 資財營 模擬投資平台</div></aside><main class="main"><div class="topbar"><div><div class="eyebrow">NYCU IMF CAMP · 管理員戰情室</div><h1>${escapeHtml(adminTabs.find(x => x[0] === state.adminTab)?.[1] || '總覽戰情')}</h1></div><div class="top-actions"><select class="select-activity" id="activity-select" aria-label="選擇活動">${state.activities.length ? options(state.activities, state.aid) : '<option value="0">尚無活動</option>'}</select>${btn('＋ 新增活動', 'new-activity', 'small')}${btn('登出', 'logout', 'small ghost')}</div></div>${a ? renderAdminTab(a) : renderNoActivity()}</main></div>`;
  if(a && state.adminTab === 'transactions') loadAdminTransactions();
}

async function loadAdminTransactions(){
  try{
    const tx = await api(`/api/admin/activity/${state.aid}/transactions`);
    const el = $('#admin-async');
    if(!el) return;
    el.outerHTML = tx.length ? `<div class="tablewrap"><table><thead><tr><th>時間</th><th>隊伍</th><th>回合</th><th>股票</th><th>方向</th><th>股數</th><th>價格</th><th>金額</th></tr></thead><tbody>${tx.map(t => `<tr><td>${time(t.created_at)}</td><td><strong>${escapeHtml(t.team_name)}</strong></td><td>Round ${t.round_number}</td><td><span class="mono">${escapeHtml(t.symbol)}</span></td><td>${badge(t.type==='BUY'?'買入':'賣出', t.type==='BUY'?'green':'gold')}</td><td class="mono">${t.quantity}</td><td class="mono">${dollars(t.price)}</td><td class="mono"><strong>${dollars(t.total_amount)}</strong></td></tr>`).join('')}</tbody></table></div>` : empty('尚未送出任何委託單', '各隊在 TRADING 階段送出訂單後，將即時在此更新。');
  }catch(e){ toast(e.message, true); }
}

function renderNoActivity(){
  return `<div class="hero">${winBar('GET STARTED')}<div class="eyebrow">WELCOME TO NYCU IMF CAMP</div><h1>歡迎來到 NYCU IMF 投資模擬競賽</h1><p>設定全體起始資金、掛牌企業股票、編排情報劇本，帶領全體學員體驗資訊不對稱與即時撮合的操盤快感！</p><div class="hero-actions">${btn('建立第一場投資競賽 →', 'new-activity', 'primary')}</div></div>`;
}

function renderAdminTab(a){
  switch(state.adminTab){
    case 'setup': return renderSetup(a);
    case 'teams': return renderTeams(a);
    case 'stocks': return renderStocks(a);
    case 'rounds': return renderRounds(a);
    case 'intelligence': return renderIntelAdmin(a);
    case 'transactions': return '<div id="admin-async" class="loading">載入交易紀錄…</div>';
    case 'snapshots': return renderSnapshots(a);
    case 'import': return renderImport(a);
    default: return renderDashboard(a);
  }
}

function renderDashboard(a){
  const active = a.status === 'ACTIVE';
  return `<section class="hero">${winBar('WAR ROOM')}<div class="hero-num">${a.current_round || '—'}</div><div class="eyebrow">NYCU IMF CAMP · ${escapeHtml(a.code)} · ${active ? 'LIVE CHALLENGE' : 'ACTIVITY CONCLUDED'}</div><h1>NYCU IMF CAMP 戰情中心</h1><p>情報不對稱、小隊博弈、即時操盤——今天沒有大盤指數，只有你們製造的傳奇行情。</p><div class="hero-actions">${btn('開啟投影大螢幕 ↗', 'open-presenter', 'primary')} ${btn('複製整場活動', 'duplicate', 'ghost')}</div></section>
  <section class="section"><div class="grid four"><div class="card metric">${winBar('ROUND')}<div class="label">CURRENT ROUND</div><div class="value">Round ${a.current_round || '—'}</div><div class="sub">${stageName[a.stage]}</div></div><div class="card metric">${winBar('TEAMS')}<div class="label">ACTIVE TEAMS</div><div class="value">${a.teams.length}</div><div class="sub">已建立參賽隊伍</div></div><div class="card metric">${winBar('STOCKS')}<div class="label">MARKET STOCKS</div><div class="value">${a.stocks.length}</div><div class="sub">檔標的股票流通</div></div><div class="card metric">${winBar('SNAPSHOT')}<div class="label">PUBLISHED SNAPSHOT</div><div class="value">${a.published_snapshot ? '#' + a.published_snapshot.id : '—'}</div><div class="sub">${a.published_snapshot ? time(a.published_snapshot.published_at) : '尚未公布榜單'}</div></div></div></section>
  <section class="section"><div class="section-head"><h2>現場主持推進（7 步標準節奏）</h2>${badge(a.stage==='TRADING'?'● 交易開放下單中':'○ 交易已鎖定', a.stage==='TRADING'?'green':'red')}</div><div class="card pad quick">${winBar('FLOW CONTROLLER')}<div class="btnrow" style="margin-top:14px">${btn('① 推送機密情報', 'preview-release', a.stage==='INFORMATION'?'primary':'')}${btn('② 開放情報交流', 'stage-discussion', a.stage==='DISCUSSION'?'primary':'')}${btn('③ 開放即時下單', 'stage-trading', a.stage==='TRADING'?'primary':'')}${btn('④ 結束本輪交易', 'stage-closed', a.stage==='CLOSED'?'primary':'warn')}${btn('⑤ 凍結績效快照', 'quick-snapshot', '')}${btn('⑥ 公布光榮榜單', 'go-snapshots', a.stage==='RESULT'?'primary':'')}${btn('⑦ 進入下一回合', 'next-round', '')}</div></div></section>
  <section class="grid two section"><div class="card pad">${winBar('TIMER')}<div class="section-head" style="margin-top:10px"><h2>階段計時器</h2>${badge(a.timer_mode==='AUTOMATIC'?'自動關閉':'手動控制', 'aqua')}</div><div class="value mono" data-clock style="font-size:52px;font-weight:800;letter-spacing:-0.03em;margin:12px 0;color:var(--text)">${formatClock(state.timer)}</div><div class="form-actions" style="margin-top:12px"><input id="timer-minutes" type="number" min="0" value="10" style="width:90px" aria-label="分鐘"><span class="muted tiny" style="align-self:center">分鐘</span>${btn('開始', 'timer-start', 'small primary')}${btn('暫停', 'timer-pause', 'small')}${btn('繼續', 'timer-resume', 'small')}${btn('重設', 'timer-reset', 'small')}${btn('歸零跳過', 'timer-skip', 'small ghost')}</div></div><div class="card pad">${winBar('STATUS')}<div style="margin-top:10px"><h2>活動概況</h2><p class="muted" style="line-height:1.7">隊伍起始資金 <strong>${dollars(a.initial_cash)}</strong> · 累計成交 <strong>${a.transaction_count}</strong> 筆委託</p><p class="muted" style="line-height:1.7">目前處於 <strong>${stageName[a.stage]}</strong>。切換回合時，系統將自動套用下一回合固定股價並重新計算隊伍市值。</p>${a.status==='FINISHED' ? badge('活動已圓滿落幕', 'gold') : btn('查看回合走勢價格表 →', 'go-rounds', 'small') }</div></div></section>`;
}

function renderSetup(a){
  return `<div class="grid two"><section class="card pad">${winBar('SETTINGS')}<h2 style="margin-top:8px">活動設定</h2><p class="muted tiny">活動代碼：<strong class="mono" style="color:var(--aqua)">${escapeHtml(a.code)}</strong> · 初始資金：${dollars(a.initial_cash)}</p><form data-form="settings" class="formgrid">${field('活動名稱', 'name', 'text', a.name, 'required')}
  <label>交易倒數結束模式<select name="timer_mode"><option value="MANUAL" ${a.timer_mode==='MANUAL'?'selected':''}>倒數完只通知主持人（建議）</option><option value="AUTOMATIC" ${a.timer_mode==='AUTOMATIC'?'selected':''}>倒數完自動關閉交易</option></select></label>
  <label class="check wide"><input type="checkbox" name="performance_report_visible" ${a.performance_report_visible?'checked':''}><span>允許隊伍在結算時查看各自的操盤手最終報告</span></label><label class="check wide"><input type="checkbox" name="review_visible" ${a.review_visible?'checked':''}><span>開放情報復盤（公布所有情報劇本與接收者）</span></label><div class="wide" style="margin-top:12px"><button class="btn primary">儲存設定</button></div></form></section>
  <section class="card pad">${winBar('STAGE OVERRIDE')}<h2 style="margin-top:8px">快速階段手動切換</h2><p class="muted tiny">直接切換目前回合狀態，下單功能僅在「交易進行中」有效。</p><div class="btnrow" style="margin-top:14px">${['INFORMATION','DISCUSSION','TRADING','CLOSED','RESULT','BREAK'].map(x => btn(stageName[x], `setstage-${x}`, a.stage===x?'primary':'')).join('')}</div><div class="divider"></div><h2>投影大螢幕連結</h2><p class="tiny muted">此畫面為公開唯讀，供教室投影機展示。</p><div class="linkbox" style="margin-top:8px">${escapeHtml(location.origin + '/presenter/' + a.code)}</div><div style="margin-top:12px">${btn('開啟投影大螢幕 ↗', 'open-presenter', 'small')}</div></section></div><section class="card pad section" style="border-color:rgba(255,56,100,0.4)">${winBar('DANGER ZONE')}<h2 style="margin-top:8px">刪除活動</h2><p class="muted tiny">永久銷毀「<strong>${escapeHtml(a.name)}</strong>」的所有參賽隊伍、持股、歷史委託與快照。此操作不可復原。</p><div style="margin-top:14px">${btn('永久刪除活動', 'delete-activity', 'danger')}</div></section>`;
}

function renderTeams(a){
  return `<div class="grid two"><section class="card pad">${winBar('NEW TEAM')}<h2 style="margin-top:8px">新增參賽隊伍</h2><p class="muted tiny">每隊共用一台手機或平板。建立後將產生專屬加入 QR Code 與連結。</p><form data-form="team" class="formgrid">${field('隊伍名稱', 'name', 'text', '', 'required placeholder="例如：第七小隊" class="wide"')}<div class="wide" style="margin-top:8px"><button class="btn primary">新增隊伍</button></div></form></section><section class="card pad">${winBar('SECURITY')}<h2 style="margin-top:8px">小隊連線機制</h2><p class="muted" style="line-height:1.7">主持人將專屬連結或 QR Code 傳給隊伍。隊伍點擊後即建立登入狀態，無需帳號密碼。</p><div class="notice">注意：重新產生連結會使該隊先前的 QR Code 與已登入裝置失效。</div></section></div><section class="section"><div class="section-head"><h2>參賽小隊名冊</h2>${badge(`${a.teams.length} 隊`, 'aqua')}</div>${a.teams.length ? `<div class="tablewrap"><table><thead><tr><th>隊伍名稱</th><th>建立時間</th><th>專屬加入憑據</th></tr></thead><tbody>${a.teams.map(t => `<tr><td><strong style="font-size:15px">${escapeHtml(t.name)}</strong></td><td>${time(t.created_at)}</td><td>${btn('產生專屬加入 QR / 連結', 'regen-'+t.id, 'small')}</td></tr>`).join('')}</tbody></table></div>` : empty('參賽席位虛位以待', '快建立參賽隊伍，準備領取啟動資金與初始情報！')}</section>`;
}

function parseFields(v){
  return String(v || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf('：') >= 0 ? s.indexOf('：') : s.indexOf(':');
    return {field_name: i >= 0 ? s.slice(0, i).trim() : s, field_value: i >= 0 ? s.slice(i+1).trim() : ''};
  });
}

function fieldsText(fields){
  return fields.map(f => `${f.field_name}：${f.field_value}`).join('\n');
}

function renderStocks(a){
  return `<section class="card pad">${winBar('NEW STOCK')}<h2 style="margin-top:8px">掛牌新虛構股票</h2><p class="muted tiny">股票價格由主持人預先定義，學員的交易量不會影響價格波動。</p><form data-form="stock" class="formgrid">${field('股票代號', 'symbol', 'text', '', 'required placeholder="例如：NT01"')}${field('公司名稱', 'name', 'text', '', 'required placeholder="例如：未來綠能"')}${field('產業分類', 'industry', 'text', '', 'placeholder="例如：永續科技"')}${field('Logo 圖片網址（選填）', 'logo', 'url', '', 'placeholder="https://..."')}
  <label class="wide">公司背景說明<textarea name="description" placeholder="簡述公司業務模式、產品與市場優勢…"></textarea></label><label class="wide">財務狀況數據<textarea name="financials" placeholder="例如：去年營收成長 35%，毛利率 42%…"></textarea></label><label class="wide">自訂詳細欄位（每行一筆，格式：名稱：內容）<textarea name="fields" placeholder="市占率：27%&#10;主要客戶：台積電、聯發科"></textarea></label><div class="wide" style="margin-top:8px"><button class="btn primary">掛牌股票</button></div></form></section><section class="section"><div class="section-head"><h2>市場掛牌標的</h2>${badge(`${a.stocks.length} 檔`, 'aqua')}</div>${a.stocks.length ? `<div class="grid three">${a.stocks.map(s => `<div class="card pad" style="display:flex;flex-direction:column;justify-content:space-between">${winBar(s.symbol)}<div class="stock-heading" style="margin-top:12px"><span class="symbol">${escapeHtml(s.symbol.slice(0,2))}</span>${badge(s.industry || '一般標的', 'aqua')}</div><div style="margin:16px 0 8px"><h2 style="font-size:18px;margin:0 0 4px">${escapeHtml(s.name)}</h2><div class="muted tiny mono">${escapeHtml(s.symbol)}</div></div><div class="stock-price">${dollars(s.price)}</div><div class="muted tiny" style="margin-bottom:16px">已記錄 ${s.history.length} 個回合走勢</div><div class="form-actions" style="margin-top:auto">${btn('編輯公司資料', 'edit-stock-'+s.id, 'small block')}</div></div>`).join('')}</div>` : empty('市場標的正在掛牌中…', '主持人正在為大家準備本場的神秘企業標的。')}</section>`;
}

function renderRounds(a){
  const future = a.rounds.filter(r => r.round_number > a.current_round);
  return `<div class="grid two"><section class="card pad">${winBar('NEW ROUND')}<h2 style="margin-top:8px">新增回合</h2><form data-form="round" class="formgrid">${field('回合編號', 'round_number', 'number', a.rounds.length + 1, 'min="1" required')}<div class="wide" style="margin-top:8px"><button class="btn primary">新增回合</button></div></form><p class="muted tiny" style="margin-top:12px">請依序建立回合。每回合可為每檔股票設定固定股價。</p></section><section class="card pad">${winBar('PRICE CONTROL')}<h2 style="margin-top:8px">設定回合固定價格</h2><form data-form="price" class="formgrid"><label>回合<select name="round_id" required>${options(future, '', 'round_number')}</select></label><label>股票<select name="stock_id" required>${options(a.stocks, '', 'symbol')}</select></label>${field('固定價格', 'price', 'number', '', 'min="0.01" step="0.01" required placeholder="100.00"')}<div style="align-self:end"><button class="btn primary">儲存價格</button></div></form></section></div><section class="section"><div class="section-head"><h2>回合價格矩陣</h2>${btn('進入下一回合 →', 'next-round', 'primary')}</div>${a.rounds.length ? `<div class="tablewrap"><table><thead><tr><th>回合</th><th>狀態</th>${a.stocks.map(s => `<th>${escapeHtml(s.symbol)}</th>`).join('')}</tr></thead><tbody>${a.rounds.map(r => `<tr><td><strong>Round ${r.round_number}</strong></td><td>${badge(r.status, r.status==='ACTIVE'?'green':'')}</td>${a.stocks.map(s => `<td class="mono"><strong>${dollars(r.prices.find(p => p.stock_id === s.id)?.price)}</strong></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : empty('尚未建立回合價格')}</section>`;
}

function teamChecks(a, selected=[]){
  return `<div class="btnrow" style="margin-top:8px">${a.teams.map(t => `<label class="check item" style="padding:8px 12px;margin:0"><input type="checkbox" name="team_ids" value="${t.id}" ${selected.includes(t.id)?'checked':''}><span>${escapeHtml(t.name)}</span></label>`).join('')}</div>`;
}

function renderIntelAdmin(a){
  return `<section class="card pad">${winBar('NEW INTEL')}<div class="section-head" style="margin-top:8px"><h2>編寫情報劇本</h2>${badge('資訊不對稱核心機制', 'aqua')}</div><form data-form="news" class="formgrid"><label>所屬回合<select name="round_id" required>${options(a.rounds, a.rounds.find(r => r.round_number === a.current_round)?.id || a.rounds[0]?.id, 'round_number')}</select></label><label>情報可見度<select name="type"><option value="PRIVATE">PRIVATE · 單一隊伍秘密</option><option value="GROUP">GROUP · 部分隊伍共享</option><option value="PUBLIC">PUBLIC · 全體公開情報</option></select></label>${field('情報標題', 'title', 'text', '', 'required placeholder="例如：供應商罷工危機"')}${field('情報分類', 'category', 'text', '', 'placeholder="例如：營運風險 / 技術突破"')}<label class="wide">情報內文<textarea name="content" required placeholder="詳細描述情報內容，這將直接影響學員對下一回合股價走勢的預期…"></textarea></label>${field('附圖網址（選填）', 'image', 'url', '', 'class="wide" placeholder="https://..."')}<div class="wide"><label>指定接收隊伍（若為 PUBLIC 則會自動發送給所有隊伍）</label>${teamChecks(a)}</div><div class="wide" style="margin-top:8px"><button class="btn primary">建立待發布情報</button></div></form></section>
  <section class="section"><div class="section-head"><h2>情報庫發送狀態</h2><div class="btnrow">${btn('預覽本回合分配', 'preview-release', 'small')}${btn('隨機分配情報池', 'random-assign', 'small')}</div></div>${a.news.length ? `<div class="tablewrap"><table><thead><tr><th>情報標題</th><th>回合</th><th>類型</th><th>接收隊伍</th><th>發送狀態</th><th>管理操作</th></tr></thead><tbody>${a.news.map(n => `<tr><td><strong>${escapeHtml(n.title)}</strong></td><td>Round ${n.round_number}</td><td>${badge(n.type, n.type==='PUBLIC'?'gold':'')}</td><td>${escapeHtml(n.assignments.map(x => x.team_name).join('、') || '—')}</td><td>${badge(n.assignments.some(x => x.released)?'已發送':'待發布', n.assignments.some(x => x.released)?'green':'')}</td><td>${!n.assignments.some(x => x.released) ? btn('編輯', 'edit-news-'+n.id, 'small') : ''} ${n.type!=='PUBLIC' ? btn('改為公開', 'public-news-'+n.id, 'small') : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('無線電靜默中…', '本回合情報尚未編排，快新增情報豐富劇本！')}</section>`;
}

function renderSnapshots(a){
  return `<div class="grid two"><section class="card pad">${winBar('SNAPSHOT GENERATOR')}<h2 style="margin-top:8px">建立績效快照</h2><p class="muted tiny">立即凍結並計算各隊當前總資產與排名。建立後仍需點擊「公布」，學員才會看見。</p><form data-form="snapshot" class="formgrid"><label>公開透明度層級<select name="display_level"><option value="C">C 級 · 排名、總資產、報酬率（完整）</option><option value="B">B 級 · 排名、總資產</option><option value="A">A 級 · 僅排名與隊名（保留神秘感）</option></select></label><label class="check" style="align-self:center"><input type="checkbox" name="is_final"><span>最終快照（將結算並結束整場活動）</span></label><div class="wide" style="margin-top:8px"><button class="btn primary">建立績效快照</button></div></form></section><section class="card pad">${winBar('CURRENT STANDINGS')}<h2 style="margin-top:8px">目前已公開榜單</h2>${a.published_snapshot ? `<p class="muted tiny">快照 #${a.published_snapshot.id} · Round ${a.published_snapshot.round_number} · 公布於 ${time(a.published_snapshot.published_at)}</p><div style="margin-top:12px">${a.published_snapshot.entries.slice(0, 3).map((e, idx) => `<div class="ranking-row"><span class="rank podium-${idx+1}">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span><strong>${escapeHtml(e.team_name)}</strong><span class="mono">${e.total_asset ? dollars(e.total_asset) : ''}</span><span class="rate mono ${Number(e.return_rate)>=0?'gain':'loss'}">${e.return_rate ? signed(e.return_rate) : ''}</span></div>`).join('')}</div>` : empty('尚未公布光榮榜', '快照建立後，點擊公布才會向隊伍及大螢幕推播。')}</section></div><section class="section"><div class="section-head"><h2>快照歷史存檔</h2>${badge(`${a.snapshots.length} 次`, 'aqua')}</div>${a.snapshots.length ? `<div class="tablewrap"><table><thead><tr><th>快照編號</th><th>建立時間</th><th>層級</th><th>公布狀態</th><th>操作</th></tr></thead><tbody>${a.snapshots.map(s => `<tr><td><strong>#${s.id}</strong> ${s.is_final ? badge('FINAL', 'gold') : ''}</td><td>${time(s.created_at)}</td><td>等級 ${s.display_level}</td><td>${badge(s.is_published ? '已公開' : '未公開', s.is_published ? 'green' : 'red')}</td><td>${btn('詳細明細', 'view-snapshot-'+s.id, 'small')} ${s.is_published ? '' : btn('立即公布', 'publish-'+s.id, 'small primary')}</td></tr>`).join('')}</tbody></table></div>` : empty('尚未建立快照')}</section>`;
}

function renderImport(a){
  return `<div class="grid two"><section class="card pad">${winBar('IMPORT PRICES')}<h2 style="margin-top:8px">批次匯入回合股價</h2><p class="muted tiny">支援 CSV 與 XLSX。首欄為 Round，其餘欄位為股票代號。</p><div class="linkbox mono">Round,NT01,GP01<br>1,100,80<br>2,120,75</div><form data-form="import-prices" class="stack" style="margin-top:16px"><label>選擇試算表檔案<input type="file" name="file" accept=".csv,.xlsx,text/csv" required></label><button class="btn primary">匯入股價資料</button></form></section><section class="card pad">${winBar('IMPORT INTEL')}<h2 style="margin-top:8px">批次匯入情報劇本</h2><p class="muted tiny">每列建立一則情報。Team 欄位必須與建立的隊伍名稱一致。</p><div class="linkbox mono">Round,News,Team,Content<br>2,產品突破,第一隊,內部測試效能提升40%</div><form data-form="import-news" class="stack" style="margin-top:16px"><label>選擇試算表檔案<input type="file" name="file" accept=".csv,.xlsx,text/csv" required></label><button class="btn primary">匯入情報劇本</button></form></section></div><div class="notice gold section">匯入提示：XLSX 檔案會讀取第一個工作表。若隊伍名稱或代號不符，系統將取消該次匯入以確保資料一致性。</div>`;
}

async function loadTeam(render=true){
  const previous = state.team;
  try{
    state.team = await api('/api/team/me');
  }catch(e){
    if(e.message === '請先登入'){ renderTeamEntry(); return; }
    throw e;
  }
  state.timer = state.team.timer_remaining;
  if(location.pathname.startsWith('/team/stock/')){
    state.stockId = Number(location.pathname.split('/').pop());
    state.teamTab = 'stock';
  } else if(location.pathname.startsWith('/team/')){
    state.teamTab = location.pathname.split('/')[2] || 'market';
  }
  const changed = !previous || previous.round !== state.team.round || previous.stage !== state.team.stage ||
    previous.snapshot?.id !== state.team.snapshot?.id || previous.review_visible !== state.team.review_visible ||
    JSON.stringify(previous.portfolio) !== JSON.stringify(state.team.portfolio) ||
    JSON.stringify(previous.stocks.map(x => x.price)) !== JSON.stringify(state.team.stocks.map(x => x.price));
  if(render || changed) renderTeam();
  else {
    const m = $('[data-clock]');
    if(m) m.textContent = formatClock(state.timer);
    if(state.teamTab === 'intelligence') renderTeamIntel();
  }
}

function renderTeamEntry(){
  app.innerHTML = `<div class="auth"><div class="card auth-card">${winBar('TEAM ACCESS')}<div class="pad">${brand('TEAM WORKSPACE')}<h1 style="margin-top:20px">小隊終端機連線</h1><p>請掃描主辦方提供的隊伍專屬 QR Code，或點選邀請連結登入。</p><div class="notice" style="margin-top:20px">提示：每個加入連結與小隊唯一綁定，請勿轉傳或分享給其他隊伍。</div></div></div></div>`;
}

const teamTabs = [
  ['market', '行情市場'],
  ['intelligence', '小隊情報'],
  ['portfolio', '資產持股'],
  ['transactions', '交易紀錄'],
  ['ranking', '光榮榜單']
];

function renderTeam(){
  const a = state.team;
  app.innerHTML = `<div class="team-shell"><div class="team-header">${brand('TEAM WORKSPACE')}<div class="team-id"><div>${escapeHtml(a.team.name)}</div><div class="accent mono" style="font-size:12px;margin-top:3px">ROUND ${a.round || '—'} · ${stageName[a.stage]}</div></div></div><nav class="team-nav">${teamTabs.map(([id, label]) => `<button data-teamtab="${id}" class="${state.teamTab===id||(state.teamTab==='stock'&&id==='market')?'active':''}">${label}</button>`).join('')}</nav><div id="team-content">${renderTeamTab(a)}</div><nav class="bottom-nav">${teamTabs.map(([id, label]) => `<button data-teamtab="${id}" class="${state.teamTab===id||(state.teamTab==='stock'&&id==='market')?'active':''}"><span class="bnav-icon">${svgIcons[id]||''}</span><span>${label}</span></button>`).join('')}</nav></div>`;
  if(state.teamTab === 'intelligence') renderTeamIntel();
  if(state.teamTab === 'transactions') renderTransactions().then(replaceTeamContent);
  if(state.teamTab === 'performance') renderPerformance().then(replaceTeamContent);
  if(state.teamTab === 'review') renderReview();
}

function renderTeamTab(a){
  switch(state.teamTab){
    case 'stock': return renderStockDetail(a);
    case 'intelligence':
    case 'transactions':
    case 'performance':
    case 'review': return '<div class="loading">系統讀取中…</div>';
    case 'portfolio': return renderPortfolio(a);
    case 'ranking': return renderRanking(a);
    default: return renderMarket(a);
  }
}

function renderMarket(a){
  return `<section class="hero">${winBar('MARKET TERMINAL // 行情戰況')}<div class="hero-num">${a.round || '—'}</div><div class="eyebrow">${escapeHtml(a.name)} · ROUND ${a.round || '—'}</div><h1>市場不相信眼淚，但相信情報</h1><p>${a.stage==='TRADING' ? '本回合固定價格交易進行中，看準時機果斷出手！' : '手握機密、與盟友諜對諜。鐘聲響起，誰能搶得先機？'}</p>${a.timer_running ? `<div class="clock mono" data-clock style="font-size:38px;font-weight:900;color:var(--gold);margin-top:14px">${formatClock(state.timer)}</div>` : ''}</section>
  <section class="section"><div class="grid three"><div class="card metric">${winBar('CASH')}<div class="label">可用現金儲備</div><div class="value mono">${dollars(a.portfolio.cash)}</div></div><div class="card metric">${winBar('STOCK')}<div class="label">股票即時市值</div><div class="value mono">${dollars(a.portfolio.stock_value)}</div></div><div class="card metric">${winBar('TOTAL')}<div class="label">目前結算總資產</div><div class="value mono" style="color:var(--aqua)">${dollars(a.portfolio.total_asset)}</div></div></div></section><section class="section"><div class="section-head"><h2>市場公開行情表</h2>${badge('本回合價格固定', 'aqua')}</div>${a.stocks.length ? `<div class="stock-grid">${a.stocks.map(s => `<div class="card stock-card" data-stock="${s.id}">${winBar(s.symbol)}<div class="stock-heading" style="margin-top:10px"><div style="display:flex;gap:12px;align-items:center"><span class="symbol">${escapeHtml(s.symbol.slice(0,2))}</span><div><div class="stock-name">${escapeHtml(s.name)}</div><div class="muted tiny mono">${escapeHtml(s.symbol)} · ${escapeHtml(s.industry || '一般')}</div></div></div><span class="muted" style="font-size:18px">↗</span></div><div class="stock-price">${dollars(s.price)}</div><div class="${Number(s.change_percent)>=0?'gain':'loss'} tiny mono">${s.change_percent == null ? '首回合固定基準' : signed(s.change_percent) + ' 較上回合'}</div></div>`).join('')}</div>` : empty('市場標的正在掛牌中…', '主持人正在為大家準備本場的神秘企業標的。')}</section>`;
}

function chart(s){
  const data = s.history.map(x => Number(x.price));
  if(!data.length) return empty('尚無歷史走勢資料');
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = data.length > 1 ? 100 / (data.length - 1) : 0;
  const pts = data.map((x, i) => `${i * step},${85 - ((x - min) / span) * 65}`).join(' ');
  const pillTags = s.history.map(x => `<span class="chart-pill">R${x.round}: ${dollars(x.price)}</span>`).join('');
  
  return `<div class="chart-container"><svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="歷史股價走勢圖"><defs><linearGradient id="chartGrad-${s.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00ff9d" stop-opacity="0.35"/><stop offset="100%" stop-color="#00ff9d" stop-opacity="0.0"/></linearGradient></defs><line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/><line x1="0" y1="52" x2="100" y2="52" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/><line x1="0" y1="85" x2="100" y2="85" stroke="rgba(255,255,255,0.06)" vector-effect="non-scaling-stroke"/><polygon points="0,95 ${pts} 100,95" fill="url(#chartGrad-${s.id})"/><polyline points="${pts}" fill="none" stroke="#00ff9d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${data.map((x, i) => `<circle cx="${i * step}" cy="${85 - ((x - min) / span) * 65}" r="2.2" fill="#00ff9d" stroke="#080c14" stroke-width="1"/>`).join('')}</svg><div class="chart-history-tags">${pillTags}</div></div>`;
}

function renderStockDetail(a){
  const s = a.stocks.find(x => x.id === state.stockId);
  if(!s) return empty('找不到此股票');
  const holding = a.portfolio.holdings.find(x => x.stock_id === s.id);
  const currentCash = Number(a.portfolio.cash) || 0;
  const currentQty = holding?.quantity || 0;
  const unitPrice = Number(s.price) || 0;

  return `${btn('← 返回市場大廳', 'back-market', 'small ghost')}<div class="section stock-detail"><div class="stack"><div class="card pad">${winBar('CHART // ' + s.symbol)}<div class="eyebrow" style="margin-top:10px">${escapeHtml(s.symbol)} · ${escapeHtml(s.industry || '未分類')}</div>${s.logo ? `<img src="${escapeHtml(s.logo)}" alt="${escapeHtml(s.name)} logo" style="max-width:80px;max-height:80px;object-fit:contain;float:right;border-radius:6px">` : ''}<h1 class="page-title">${escapeHtml(s.name)}</h1><div class="stock-price" style="font-size:42px">${dollars(s.price)}</div><div class="${Number(s.change_percent)>=0?'gain':'loss'} mono">${s.change_percent == null ? '首回合固定基準' : signed(s.change_percent) + ' 較上回合'}</div><div class="divider"></div><h2>歷史走勢</h2>${chart(s)}</div><div class="card pad">${winBar('DOSSIER // 公司檔案')}<div style="margin-top:10px"><h2>公司檔案</h2><p class="muted" style="white-space:pre-line;line-height:1.8">${escapeHtml(s.description || '主辦方尚未提供詳細公司介紹。')}</p>${s.financials ? `<div class="divider"></div><h3>財務狀況</h3><p class="muted" style="white-space:pre-line">${escapeHtml(s.financials)}</p>` : ''}${s.fields.length ? `<div class="divider"></div><div class="info-grid">${s.fields.map(f => `<div class="info-cell"><span>${escapeHtml(f.field_name)}</span><strong>${escapeHtml(f.field_value)}</strong></div>`).join('')}</div>` : ''}</div></div></div><div class="stack"><div class="card pad">${winBar('HOLDINGS')}<div style="margin-top:10px"><h2>小隊持股庫存</h2><div class="info-grid"><div class="info-cell"><span>目前庫存</span><strong class="mono" id="current-holding-qty">${currentQty} 股</strong></div><div class="info-cell"><span>平均成本</span><strong class="mono">${dollars(holding?.average_cost || 0)}</strong></div><div class="info-cell"><span>持股市值</span><strong class="mono">${dollars(holding?.market_value || 0)}</strong></div><div class="info-cell"><span>未實現損益</span><strong class="mono ${Number(holding?.unrealized_profit||0)>=0?'gain':'loss'}">${dollars(holding?.unrealized_profit || 0)}</strong></div></div></div></div><div class="card pad">${winBar('ORDER DESK')}<div style="margin-top:10px"><h2>即時委託下單</h2>${a.stage==='TRADING' ? `<p class="muted tiny">本回合固定成交價：<strong class="mono" style="color:var(--text)">${dollars(s.price)}</strong> / 股。</p><form data-form="trade" class="stack" id="live-trade-form"><input type="hidden" name="stock_id" value="${s.id}"><input type="hidden" id="stock-unit-price" value="${unitPrice}"><input type="hidden" id="team-available-cash" value="${currentCash}"><input type="hidden" id="team-held-shares" value="${currentQty}"><label>下單方向<select name="type" id="trade-side-select"><option value="BUY">買入股票 (BUY)</option><option value="SELL">賣出股票 (SELL)</option></select></label><label>委託股數<input name="quantity" id="trade-quantity-input" type="number" value="1" min="1" step="1" required><div class="quick-chips"><button type="button" class="quick-chip" data-quick-qty="1">+1</button><button type="button" class="quick-chip" data-quick-qty="5">+5</button><button type="button" class="quick-chip" data-quick-qty="10">+10</button><button type="button" class="quick-chip" data-quick-qty="50">+50</button><button type="button" class="quick-chip" data-quick-max="true">最大上限</button></div></label><div class="trade-preview-box"><span>預估交易金額</span><strong id="trade-estimate" class="mono" style="font-size:16px;color:var(--aqua)">${dollars(s.price)}</strong></div><button class="btn primary block" style="margin-top:6px">確認送出委託單</button></form>` : `<div class="notice gold">目前非下單階段（狀態：${stageName[a.stage]}）。主持人開放「交易進行中」後即可直接下單。</div>`}</div></div></div></div>`;
}

async function renderTeamIntel(){
  const news = await api('/api/team/intelligence');
  if(state.teamTab !== 'intelligence') return;
  const groups = [...new Set(news.map(n => n.round_number))].sort((a, b) => b - a);
  const html = `<div class="eyebrow">EXCLUSIVE INTELLIGENCE</div><h1 class="page-title">最高機密 // 小隊情報庫</h1><div class="notice">這份情報目前僅有貴隊知悉。要嚴守秘密默默佈局，還是拿去和別隊等價交換？策略由你們決定。</div>${state.team.review_visible ? `<div class="form-actions" style="margin:16px 0">${btn('進入全活動情報復盤 →', 'open-review', 'small primary')}</div>` : ''}${groups.length ? groups.map(round => `<section class="section"><div class="section-head"><h2>Round ${round} 情報劇本</h2>${badge(news.filter(n => n.round_number === round).length + ' 則', 'aqua')}</div><div class="stack">${news.filter(n => n.round_number === round).map(n => `<div class="card intel-card ${n.type==='PUBLIC'?'public':''}">${winBar(n.type==='PUBLIC'?'PUBLIC WIRE':'CLASSIFIED')}<div style="margin-top:10px"><div class="eyebrow">${escapeHtml(n.category || 'MARKET INSIGHT')}</div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.content)}</p>${n.image ? `<img src="${escapeHtml(n.image)}" alt="${escapeHtml(n.title)}" style="max-width:100%;border-radius:6px;margin-top:8px">` : ''}<div class="meta muted tiny" style="margin-top:12px">${badge(n.type==='PUBLIC'?'全場公開':'小隊機密', n.type==='PUBLIC'?'gold':'aqua')} <span>發布於 ${time(n.released_at)}</span></div></div></div>`).join('')}</div></section>`).join('') : empty('無線電靜默中…', '本回合情報尚未解鎖，請隨時注意主持人廣播發布。')}`;
  replaceTeamContent(html);
}

async function renderReview(){
  try{
    const items = await api('/api/team/review');
    if(state.teamTab !== 'review') return;
    const rounds = [...new Set(items.map(x => x.round_number))].sort((a, b) => a - b);
    replaceTeamContent(`<div class="eyebrow">INFORMATION POST-MORTEM</div><h1 class="page-title">情報復盤 // 劇本解密總覽</h1><div class="notice">主持人已開放復盤。以下為活動中各小隊實際獲得的所有情報劇本，供復盤與策略檢討。</div>${rounds.map(r => `<section class="section"><h2>Round ${r} 情報劇本解密</h2><div class="grid two">${items.filter(x => x.round_number === r).map(x => `<div class="card pad">${winBar(x.team_name)}<div style="margin-top:10px"><div class="eyebrow">${escapeHtml(x.team_name)} 獲得</div><h3 style="margin:8px 0">${escapeHtml(x.title)}</h3><p class="muted" style="white-space:pre-line;line-height:1.7">${escapeHtml(x.content)}</p></div></div>`).join('')}</div></section>`).join('')}`);
  }catch(e){
    toast(e.message, true);
    state.teamTab = 'intelligence';
    renderTeam();
  }
}

function renderPortfolio(a){
  return `<div class="eyebrow">LIVE ASSETS</div><h1 class="page-title">戰果檢視 // 我的即時金庫</h1><div class="grid three section"><div class="card metric">${winBar('CASH')}<div class="label">可用現金儲備</div><div class="value mono">${dollars(a.portfolio.cash)}</div></div><div class="card metric">${winBar('PORTFOLIO')}<div class="label">持股總市值</div><div class="value mono">${dollars(a.portfolio.stock_value)}</div></div><div class="card metric">${winBar('NET WORTH')}<div class="label">目前結算總資產</div><div class="value mono" style="color:var(--aqua)">${dollars(a.portfolio.total_asset)}</div></div></div><section class="section"><div class="section-head"><h2>小隊持股庫存明細</h2>${badge(`${a.portfolio.holdings.length} 檔`, 'aqua')}</div>${a.portfolio.holdings.length ? `<div class="tablewrap"><table><thead><tr><th>標的股票</th><th>持股數</th><th>成本均價</th><th>當前現價</th><th>市值</th><th>未實現損益</th></tr></thead><tbody>${a.portfolio.holdings.map(h => `<tr><td><strong>${escapeHtml(h.symbol)}</strong> <span class="muted tiny">${escapeHtml(h.name)}</span></td><td class="mono">${h.quantity}</td><td class="mono">${dollars(h.average_cost)}</td><td class="mono">${dollars(h.price)}</td><td class="mono"><strong>${dollars(h.market_value)}</strong></td><td class="mono ${Number(h.unrealized_profit)>=0?'gain':'loss'}">${dollars(h.unrealized_profit)}</td></tr>`).join('')}</tbody></table></div>` : empty('目前空手無持股', '可前往行情市場挑選標的股票並下單。')}</section>`;
}

async function renderTransactions(){
  const tx = await api('/api/team/transactions');
  return `<div class="eyebrow">TRADE LOG</div><h1 class="page-title">交易歷程紀錄</h1>${tx.length ? `<div class="tablewrap section"><table><thead><tr><th>時間</th><th>回合</th><th>標的</th><th>方向</th><th>股數</th><th>成交價</th><th>總金額</th></tr></thead><tbody>${tx.map(t => `<tr><td>${time(t.created_at)}</td><td>Round ${t.round_number}</td><td><strong>${escapeHtml(t.symbol)}</strong></td><td>${badge(t.type==='BUY'?'買入':'賣出', t.type==='BUY'?'green':'gold')}</td><td class="mono">${t.quantity}</td><td class="mono">${dollars(t.price)}</td><td class="mono"><strong>${dollars(t.total_amount)}</strong></td></tr>`).join('')}</tbody></table></div>` : empty('尚未送出任何委託單', '抓準時機，在交易進行中階段果斷出手！')}`;
}

function renderRanking(a){
  const s = a.snapshot;
  return `<div class="eyebrow">OFFICIAL LEADERBOARD</div><h1 class="page-title">光榮榜 // 誰是華爾街巨鱷？</h1><div class="notice gold">此榜單為主持人最近一次公布之官方快照。未到最終結算，勝負皆未定！</div>${s ? `<div class="section-head section"><h2>官方快照 #${s.id}</h2>${badge(`Round ${s.round_number} · ${time(s.published_at)}`, 'aqua')}</div><div class="card">${winBar('LEADERBOARD')}<div style="padding:10px 0">${s.entries.map((e, idx) => `<div class="ranking-row"><span class="rank podium-${idx+1}">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + e.rank}</span><strong style="font-size:15px">${escapeHtml(e.team_name)}</strong><span class="mono">${e.total_asset ? dollars(e.total_asset) : ''}</span><span class="rate mono ${Number(e.return_rate)>=0?'gain':'loss'}">${e.return_rate ? signed(e.return_rate) : ''}</span></div>`).join('')}</div></div>${s.is_final ? `<div class="form-actions" style="margin-top:20px">${btn('查看最終結算成績報告', 'show-performance', 'primary')}</div>` : ''}` : empty('主辦方尚未公布績效', '主持人結算並公布後，此處將同步更新排行榜。')}`;
}

async function renderPerformance(){
  try{
    const r = await api('/api/team/performance');
    return `<div class="eyebrow">FINAL PERFORMANCE REPORT</div><h1 class="page-title">最終結算戰報 // 操盤手履歷</h1><div class="grid three section"><div class="card metric">${winBar('FINAL RANK')}<div class="label">最終排名</div><div class="value" style="color:var(--gold)">#${r.rank}</div></div><div class="card metric">${winBar('ASSETS')}<div class="label">結算總資產</div><div class="value mono">${dollars(r.total_asset)}</div></div><div class="card metric">${winBar('ROI')}<div class="label">總投資報酬率</div><div class="value mono ${Number(r.return_rate)>=0?'gain':'loss'}">${signed(r.return_rate)}</div></div></div><div class="card pad">${winBar('SUMMARY')}<div style="margin-top:10px"><h2>績效總結</h2><p class="muted" style="line-height:1.7">起始本金 <strong>${dollars(r.report.initial_cash)}</strong> · 累計成交 <strong>${r.report.transaction_count}</strong> 次委託</p><p class="muted" style="line-height:1.7">最高獲利股票：<strong class="gain">${escapeHtml(r.report.best_stock || '—')}</strong> · 最大虧損股票：<strong class="loss">${escapeHtml(r.report.worst_stock || '—')}</strong></p></div></div><div class="section"><h2>各標的股票損益明細</h2>${r.report.stock_results?.length ? `<div class="tablewrap"><table><thead><tr><th>標的</th><th>已實現損益</th><th>未實現損益</th><th>合計損益</th></tr></thead><tbody>${r.report.stock_results.map(x => `<tr><td><strong>${escapeHtml(x.symbol)}</strong></td><td class="mono">${dollars(x.realized)}</td><td class="mono">${dollars(x.unrealized)}</td><td class="mono <strong>${Number(x.total_profit)>=0?'gain':'loss'}">${dollars(x.total_profit)}</strong></td></tr>`).join('')}</tbody></table></div>` : empty('無損益資料')}</div><div class="section"><h2>最終結算持股</h2>${r.report.holdings.length ? r.report.holdings.map(h => `<div class="item mono"><strong>${escapeHtml(h.symbol)}</strong> · ${h.quantity} 股 · 市值 ${dollars(h.market_value)} · 損益 ${dollars(h.unrealized_profit)}</div>`).join('') : empty('最終結算無持股')}</div><div class="section"><h2>完整委託紀錄</h2>${r.report.transactions.length ? r.report.transactions.map(t => `<div class="item mono">Round ${t.round_number} · <strong>${escapeHtml(t.symbol)}</strong> · ${t.type==='BUY'?'買入':'賣出'} ${t.quantity} 股 · 金額 ${dollars(t.total_amount)}</div>`).join('') : empty('無交易紀錄')}</div>`;
  }catch(e){
    toast(e.message, true);
    state.teamTab = 'ranking';
    return renderRanking(state.team);
  }
}

async function loadPresenter(render=true){
  const code = decodeURIComponent(location.pathname.split('/')[2] || '');
  if(!code){ fatal('缺少活動代碼'); return; }
  const previous = state.presenter;
  state.presenter = await api('/api/public/' + encodeURIComponent(code));
  state.timer = state.presenter.timer_remaining;
  if(render || !previous || previous.round !== state.presenter.round || previous.stage !== state.presenter.stage ||
     previous.snapshot?.id !== state.presenter.snapshot?.id ||
     JSON.stringify(previous.news) !== JSON.stringify(state.presenter.news) ||
     JSON.stringify(previous.stocks.map(x => x.price)) !== JSON.stringify(state.presenter.stocks.map(x => x.price))) {
    renderPresenter();
  }
}

function renderPresenter(){
  const a = state.presenter, s = a.snapshot;
  const isTrading = a.stage === 'TRADING';
  const isDiscussion = a.stage === 'DISCUSSION';
  const isResult = a.stage === 'RESULT' || a.stage === 'FINISHED';

  app.innerHTML = `<div class="presenter"><div class="presenter-head">${brand('ARENA DISPLAY')}<div class="eyebrow">${escapeHtml(a.code)} · 大會即時看板</div></div><h1>ROUND ${a.round || '—'}</h1><div class="stage"><span class="statusdot" style="${isTrading?'background:var(--accent-green)':isDiscussion?'background:var(--accent-amber)':'background:var(--accent-purple)'}"></span> <span>${stageName[a.stage]}</span></div><div class="clock mono" data-clock>${formatClock(state.timer)}</div><div class="presenter-body"><div class="card">${winBar('MARKET TICKER')}<div class="presenter-table" style="padding:16px 20px">${a.stocks.length ? a.stocks.map(x => `<div class="presenter-row"><span><strong>${escapeHtml(x.name)}</strong> <span class="muted tiny mono">${escapeHtml(x.symbol)}</span></span><span class="mono"><strong>${dollars(x.price)}</strong> <small class="${Number(x.change_percent)>=0?'gain':'loss'}">${x.change_percent == null ? '' : signed(x.change_percent)}</small></span></div>`).join('') : empty('市場行情準備中')}</div></div><div class="card">${winBar(isResult ? 'LEADERBOARD' : 'PUBLIC INTELLIGENCE')}<div style="padding:16px 20px">${isResult && s ? `<div class="presenter-table">${s.entries.slice(0, 5).map((e, idx) => `<div class="presenter-row result"><span><span class="rank podium-${idx+1}">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + e.rank}</span>${escapeHtml(e.team_name)}</span><span class="mono" style="color:var(--accent-blue)">${e.total_asset ? dollars(e.total_asset) : ''}</span></div>`).join('')}</div>` : a.news.length ? a.news.slice(0, 4).map(n => `<div class="item"><h3 style="margin-top:0">${escapeHtml(n.title)}</h3><p>${escapeHtml(n.content)}</p></div>`).join('') : empty('目前尚無全場公開消息')}</div></div></div><div class="presenter-foot"><span>NYCU IMF CAMP · ${escapeHtml(a.name)}</span> · <span>${isTrading ? '交易進行中' : '全場行情看板'}</span></div></div>`;
}

document.addEventListener('click', async e => {
  const tab = e.target.closest('[data-tab]');
  if(tab){
    state.adminTab = tab.dataset.tab;
    renderAdmin();
    return;
  }
  const ttab = e.target.closest('[data-teamtab]');
  if(ttab){
    state.teamTab = ttab.dataset.teamtab;
    history.pushState(null, '', '/team/' + state.teamTab);
    renderTeam();
    return;
  }
  const stock = e.target.closest('[data-stock]');
  if(stock){
    state.stockId = Number(stock.dataset.stock);
    state.teamTab = 'stock';
    history.pushState(null, '', '/team/stock/' + state.stockId);
    renderTeam();
    return;
  }
  const quickQty = e.target.closest('[data-quick-qty]');
  if(quickQty){
    const delta = Number(quickQty.dataset.quickQty);
    const input = $('#trade-quantity-input');
    if(input){
      input.value = Math.max(1, (Number(input.value) || 0) + delta);
      updateTradeEstimate();
    }
    return;
  }
  const quickMax = e.target.closest('[data-quick-max]');
  if(quickMax){
    const side = $('#trade-side-select')?.value || 'BUY';
    const input = $('#trade-quantity-input');
    const unitPrice = Number($('#stock-unit-price')?.value) || 1;
    const cash = Number($('#team-available-cash')?.value) || 0;
    const held = Number($('#team-held-shares')?.value) || 0;
    if(input){
      if(side === 'BUY'){
        const maxAffordable = Math.floor(cash / unitPrice);
        input.value = Math.max(1, maxAffordable);
      } else {
        input.value = Math.max(1, held);
      }
      updateTradeEstimate();
    }
    return;
  }
  const b = e.target.closest('[data-action]');
  if(!b) return;
  const action = b.dataset.action;
  try{
    await runAction(action);
  }catch(err){
    toast(err.message, true);
  }
});

function updateTradeEstimate(){
  const side = $('#trade-side-select')?.value || 'BUY';
  const qty = Number($('#trade-quantity-input')?.value) || 0;
  const unitPrice = Number($('#stock-unit-price')?.value) || 0;
  const total = qty * unitPrice;
  const estimate = $('#trade-estimate');
  if(estimate) estimate.textContent = dollars(total);
}

document.addEventListener('input', e => {
  if(e.target.id === 'trade-quantity-input' || e.target.id === 'trade-side-select') {
    updateTradeEstimate();
  }
});

function replaceTeamContent(html){
  const el = $('#team-content');
  if(el) el.innerHTML = html;
}

document.addEventListener('change', async e => {
  if(e.target.id === 'activity-select'){
    state.aid = Number(e.target.value);
    localStorage.setItem('camp_aid', state.aid);
    await loadAdmin();
  }
  if(e.target.id === 'trade-side-select'){
    updateTradeEstimate();
  }
});

document.addEventListener('submit', async e => {
  const form = e.target.closest('form[data-form]');
  if(!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const d = formData(form);
  try{
    await submitForm(kind, d, form);
  }catch(err){
    toast(err.message, true);
  }
});

window.addEventListener('popstate', () => {
  if(state.page === 'team'){
    state.teamTab = location.pathname.split('/')[2] || 'market';
    if(state.teamTab === 'stock') state.stockId = Number(location.pathname.split('/')[3]);
    renderTeam();
  }
});

async function submitForm(kind, d, form){
  const aid = state.aid;
  if(kind === 'login'){
    await api('/api/auth/login', 'POST', {password: d.password});
    toast('登入成功');
    await loadAdmin();
    return;
  }
  if(kind === 'activity'){
    const r = await api('/api/admin/activities', 'POST', {name: d.name, code: d.code, initial_cash: d.initial_cash});
    state.aid = r.id;
    state.adminTab = 'dashboard';
    closeModal();
    toast('活動已成功建立');
    await loadAdmin();
    return;
  }
  if(kind === 'team'){
    const r = await api(`/api/admin/activity/${aid}/teams`, 'POST', {name: d.name});
    toast('隊伍已成功建立');
    await loadAdmin();
    showTeamLink(r);
    return;
  }
  if(kind === 'stock'){
    await api(`/api/admin/activity/${aid}/stocks`, 'POST', {...d, fields: parseFields(d.fields)});
    toast('股票已成功掛牌');
    await loadAdmin();
    return;
  }
  if(kind === 'edit-stock'){
    await api(`/api/admin/activity/${aid}/stocks/${d.id}`, 'POST', {...d, fields: parseFields(d.fields)});
    closeModal();
    toast('股票檔案已更新');
    await loadAdmin();
    return;
  }
  if(kind === 'round'){
    await api(`/api/admin/activity/${aid}/rounds`, 'POST', {round_number: d.round_number});
    toast('回合已成功建立');
    await loadAdmin();
    return;
  }
  if(kind === 'price'){
    await api(`/api/admin/activity/${aid}/prices`, 'POST', d);
    toast('回合固定股價已儲存');
    await loadAdmin();
    return;
  }
  if(kind === 'news' || kind === 'edit-news'){
    const team_ids = $$('input[name=team_ids]:checked', form).map(x => Number(x.value));
    const payload = {...d, team_ids};
    if(payload.type === 'PUBLIC') payload.team_ids = [];
    if(kind === 'news'){
      await api(`/api/admin/activity/${aid}/news`, 'POST', payload);
      toast('情報已登錄情報庫');
    } else {
      await api(`/api/admin/activity/${aid}/news/${d.id}`, 'POST', payload);
      closeModal();
      toast('情報已成功更新');
    }
    await loadAdmin();
    return;
  }
  if(kind === 'snapshot'){
    const is_final = !!form.querySelector('[name=is_final]').checked;
    if(is_final){
      confirmAction('建立最終結算快照', '<strong>警告：這會立即結束活動並凍結最終排名。</strong> 建立後仍需點擊「公布」，光榮榜才會推送到大螢幕與隊伍端。', 'confirm-final-snapshot');
      state.pendingSnapshot = {display_level: d.display_level, is_final: true};
      return;
    }
    await api(`/api/admin/activity/${aid}/snapshots`, 'POST', {display_level: d.display_level, is_final: false});
    toast('快照已建立（尚未公布）');
    await loadAdmin();
    return;
  }
  if(kind === 'settings'){
    await api(`/api/admin/activity/${aid}/settings`, 'POST', {
      name: d.name,
      timer_mode: d.timer_mode,
      performance_report_visible: !!form.querySelector('[name=performance_report_visible]').checked,
      review_visible: !!form.querySelector('[name=review_visible]').checked
    });
    toast('設定已成功儲存');
    await loadAdmin();
    return;
  }
  if(kind === 'delete-activity'){
    if(d.code !== state.dashboard.code) throw Error('活動代碼不符，未執行刪除');
    await api(`/api/admin/activity/${aid}/delete`, 'POST', {code: d.code});
    closeModal();
    state.aid = 0;
    state.adminTab = 'dashboard';
    toast('活動已成功刪除');
    await loadAdmin();
    return;
  }
  if(kind === 'trade'){
    const r = await api('/api/team/trade', 'POST', d);
    toast(`${d.type==='BUY'?'買入':'賣出'}成功：${r.quantity} 股 ${r.symbol} · ${dollars(r.total)}`);
    await loadTeam();
    return;
  }
  if(kind.startsWith('import-')){
    const file = form.querySelector('input[type=file]').files[0];
    if(!file) throw Error('請選擇檔案');
    const payload = {kind: kind.slice(7)};
    if(file.name.toLowerCase().endsWith('.xlsx')){
      const binary = new Uint8Array(await file.arrayBuffer());
      let s = '';
      for(const b of binary) s += String.fromCharCode(b);
      payload.xlsx_base64 = btoa(s);
    } else {
      payload.csv = await file.text();
    }
    const r = await api(`/api/admin/activity/${aid}/import`, 'POST', payload);
    toast(`已成功匯入 ${r.imported} 筆資料`);
    await loadAdmin();
    return;
  }
}

async function runAction(action){
  const aid = state.aid, a = state.dashboard;
  if(action === 'reload'){ location.reload(); return; }
  if(action === 'close-modal'){ closeModal(); return; }
  if(action === 'logout'){ await api('/api/auth/logout', 'POST', {}); renderLogin(); return; }
  if(action === 'new-activity'){
    modal('建立新投資競賽', `<form data-form="activity" class="stack">${field('活動名稱', 'name', 'text', '', 'required placeholder="2026 夏季投資挑戰營"')}${field('活動代碼（僅限英數字）', 'code', 'text', '', 'required placeholder="CAMP2026"')}${field('每隊初始資金', 'initial_cash', 'number', '1000000', 'min="1" step="0.01" required')}<div style="margin-top:8px"><button class="btn primary block">確認建立活動</button></div></form>`);
    return;
  }
  if(action === 'delete-activity'){
    modal('確認永久刪除活動', `<form data-form="delete-activity" class="stack"><div class="notice red">此操作將永久銷毀「${escapeHtml(a.name)}」的所有隊伍、持股、歷史委託、情報劇本與快照。</div><label>請輸入活動代碼 <strong>${escapeHtml(a.code)}</strong> 確認刪除：<input name="code" type="text" autocomplete="off" required placeholder="${escapeHtml(a.code)}"></label><div style="margin-top:8px"><button class="btn danger block">確認永久刪除</button></div></form>`);
    return;
  }
  if(action === 'open-presenter'){ window.open('/presenter/' + encodeURIComponent(a.code), '_blank', 'noopener'); return; }
  if(action === 'duplicate'){
    confirmAction('複製此活動設定', '系統將完整複製股票、回合、價格、隊伍名稱及情報劇本設定，新活動將重設為第一回合。', 'confirm-duplicate');
    return;
  }
  if(action === 'confirm-duplicate'){
    const r = await api(`/api/admin/activity/${aid}/duplicate`, 'POST', {});
    state.aid = r.id;
    closeModal();
    toast('活動已成功複製');
    await loadAdmin();
    return;
  }
  if(action === 'go-rounds'){ state.adminTab = 'rounds'; renderAdmin(); return; }
  if(action === 'go-snapshots'){ state.adminTab = 'snapshots'; renderAdmin(); return; }
  if(action === 'back-market'){ state.teamTab = 'market'; history.pushState(null, '', '/team/market'); renderTeam(); return; }
  if(action === 'show-performance'){
    state.teamTab = 'performance';
    history.pushState(null, '', '/team/performance');
    replaceTeamContent(await renderPerformance());
    return;
  }
  if(action === 'open-review'){
    state.teamTab = 'review';
    history.pushState(null, '', '/team/review');
    renderTeam();
    return;
  }
  if(action.startsWith('regen-')){
    const id = Number(action.slice(6));
    confirmAction('重新產生隊伍專屬連結', '舊的連結與該隊現有的已登入裝置將立即失效。', 'confirm-regen-' + id);
    return;
  }
  if(action.startsWith('confirm-regen-')){
    const id = Number(action.slice(14));
    const r = await api(`/api/admin/activity/${aid}/teams/${id}/token`, 'POST', {});
    closeModal();
    showTeamLink(r);
    return;
  }
  if(action.startsWith('edit-stock-')){
    const s = a.stocks.find(x => x.id === Number(action.slice(11)));
    modal('編輯股票標的檔案', `<form data-form="edit-stock" class="formgrid"><input type="hidden" name="id" value="${s.id}">${field('公司名稱', 'name', 'text', s.name, 'required')}${field('產業分類', 'industry', 'text', s.industry)}${field('Logo 網址', 'logo', 'url', s.logo, 'class="wide"')}<label class="wide">公司背景說明<textarea name="description">${escapeHtml(s.description)}</textarea></label><label class="wide">財務狀況數據<textarea name="financials">${escapeHtml(s.financials)}</textarea></label><label class="wide">自訂詳細欄位<textarea name="fields">${escapeHtml(fieldsText(s.fields))}</textarea></label><div class="wide" style="margin-top:8px"><button class="btn primary">儲存股票檔案</button></div></form>`);
    return;
  }
  if(action.startsWith('edit-news-')){
    const n = a.news.find(x => x.id === Number(action.slice(10)));
    const released = n.assignments.some(x => x.released);
    modal('編輯情報內容', `<form data-form="edit-news" class="formgrid"><input type="hidden" name="id" value="${n.id}">${field('情報標題', 'title', 'text', n.title, 'required')}${field('分類', 'category', 'text', n.category)}<label>可見度類型<select name="type">${['PRIVATE','GROUP','PUBLIC'].map(x => `<option ${n.type===x?'selected':''}>${x}</option>`).join('')}</select></label>${field('附圖網址', 'image', 'url', n.image)}<label class="wide">情報內文<textarea name="content" required>${escapeHtml(n.content)}</textarea></label>${released ? `<div class="notice gold wide">已發送的情報不可更動接收隊伍。若需更正請另建補充情報。</div>` : `<div class="wide"><label>指定接收隊伍</label>${teamChecks(a, n.assignments.map(x => x.team_id))}</div>`}<div class="wide" style="margin-top:8px"><button class="btn primary">儲存變更</button></div></form>`);
    if(released) $('form[data-form=edit-news]').dataset.released = '1';
    return;
  }
  if(action.startsWith('public-news-')){
    const id = Number(action.slice(12));
    confirmAction('公開此則情報', '公開後，所有隊伍及大螢幕投影頁面皆可立即看到此情報。', 'confirm-public-' + id);
    return;
  }
  if(action.startsWith('confirm-public-')){
    const id = Number(action.slice(15));
    await api(`/api/admin/activity/${aid}/news/${id}`, 'POST', {type: 'PUBLIC'});
    closeModal();
    toast('情報已成功改為公開');
    await loadAdmin();
    return;
  }
  if(action === 'preview-release'){
    const preview = await api(`/api/admin/activity/${aid}/release-preview`);
    modal(`Round ${a.current_round} 情報發布預覽`, `<div class="modal-list">${preview.map(x => `<div class="item"><strong>${escapeHtml(x.team_name)}</strong><p>${x.news.length ? x.news.map(n => escapeHtml(n.title)).join('、') : '本次無待發布情報'}</p></div>`).join('')}</div><div class="notice gold">請核對各小隊分配的情報無誤。確認發布後不可撤回。</div>`, `${btn('取消', 'close-modal', 'ghost')} ${btn('確認發布情報', 'confirm-release', 'primary')}`);
    return;
  }
  if(action === 'confirm-release'){
    await api(`/api/admin/activity/${aid}/release`, 'POST', {});
    closeModal();
    toast('隊伍機密情報已成功推送發布');
    await loadAdmin();
    return;
  }
  if(action === 'random-assign'){
    const roundId = getRound()?.id;
    if(!roundId) throw Error('請先開啟或建立回合');
    modal('隨機分配情報池', `<p>將目前回合尚未發布的私人與群組情報作為新聞池，為每小隊隨機抽取指定數量。既有未發布分配將被覆蓋。</p><label>每隊抽取則數<input id="random-count" type="number" min="1" value="1"></label>`, `${btn('取消', 'close-modal', 'ghost')} ${btn('開始隨機分配', 'confirm-random', 'primary')}`);
    return;
  }
  if(action === 'confirm-random'){
    const count = Number($('#random-count').value);
    await api(`/api/admin/activity/${aid}/random-assign`, 'POST', {round_id: getRound().id, count});
    closeModal();
    toast('已完成隨機分配，請預覽確認後發布');
    await loadAdmin();
    return;
  }
  if(action === 'next-round'){
    confirmAction('進入下一回合', `系統將結算並鎖定 Round ${a.current_round}，並套用 Round ${a.current_round + 1} 的固定價格。請先確認下一回合股票價格已設定完畢。`, 'confirm-next');
    return;
  }
  if(action === 'confirm-next'){
    const r = await api(`/api/admin/activity/${aid}/next`, 'POST', {});
    closeModal();
    toast(`已成功進入 Round ${r.round}`);
    await loadAdmin();
    return;
  }
  if(action.startsWith('stage-') || action.startsWith('setstage-')){
    const stage = action.split('-').at(-1).toUpperCase();
    if(stage === 'TRADING' || stage === 'CLOSED'){
      confirmAction(stage === 'TRADING' ? '開放即時下單' : '結束本輪交易', stage === 'TRADING' ? '各隊伍手機端將立即解鎖下單按鈕，並可按本回合固定價格買賣。' : '隊伍將立即無法送出新訂單。', 'confirm-stage-' + stage);
      return;
    }
    await api(`/api/admin/activity/${aid}/stage`, 'POST', {stage});
    toast('階段已更新為 ' + stageName[stage]);
    await loadAdmin();
    return;
  }
  if(action.startsWith('confirm-stage-')){
    await api(`/api/admin/activity/${aid}/stage`, 'POST', {stage: action.slice(14)});
    closeModal();
    toast('交易階段已成功更新');
    await loadAdmin();
    return;
  }
  if(action === 'quick-snapshot'){ state.adminTab = 'snapshots'; renderAdmin(); return; }
  if(action === 'confirm-final-snapshot'){
    await api(`/api/admin/activity/${aid}/snapshots`, 'POST', state.pendingSnapshot);
    closeModal();
    toast('最終競賽成績已鎖定（請公布以推播給學員）');
    await loadAdmin();
    return;
  }
  if(action.startsWith('publish-')){
    const id = Number(action.slice(8));
    confirmAction('公布光榮排行榜', `公布快照 #${id} 後，大螢幕投影及各隊手機將同步更新榜單。`, 'confirm-publish-' + id);
    return;
  }
  if(action.startsWith('view-snapshot-')){
    const id = Number(action.slice(14));
    const detail = await api(`/api/admin/activity/${aid}/snapshots/${id}`);
    modal(`快照 #${id} 完整名次明細`, `<div class="tablewrap"><table><thead><tr><th>名次</th><th>隊伍名稱</th><th>現金餘額</th><th>持股市值</th><th>總資產</th><th>投資報酬率</th></tr></thead><tbody>${detail.entries.map((x, idx) => `<tr><td><strong class="rank podium-${idx+1}">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + x.rank}</strong></td><td><strong>${escapeHtml(x.team_name)}</strong></td><td class="mono">${dollars(x.cash)}</td><td class="mono">${dollars(x.stock_value)}</td><td class="mono"><strong>${dollars(x.total_asset)}</strong></td><td class="mono ${Number(x.return_rate)>=0?'gain':'loss'}">${signed(x.return_rate)}</td></tr>`).join('')}</tbody></table></div>`);
    return;
  }
  if(action.startsWith('confirm-publish-')){
    const id = Number(action.slice(16));
    await api(`/api/admin/activity/${aid}/snapshots/${id}/publish`, 'POST', {});
    closeModal();
    toast('光榮榜單已成功公布');
    await loadAdmin();
    return;
  }
  if(action.startsWith('timer-')){
    const op = action.slice(6);
    const minutes = Number($('#timer-minutes')?.value || 0);
    await api(`/api/admin/activity/${aid}/timer`, 'POST', {action: op, seconds: Math.round(minutes * 60)});
    await loadAdmin();
    return;
  }
}

function showTeamLink(r){
  const url = location.origin + r.join_url;
  modal('隊伍專屬加入連結', `<p>請將此專屬連結或 QR Code 提供給指定隊伍。此視窗關閉後，可隨時在隊伍清單重新產生。</p><div class="linkbox" id="team-link">${escapeHtml(url)}</div><div id="qr-target" style="text-align:center;margin-top:20px;display:flex;justify-content:center"></div>`, `${btn('複製專屬連結', 'copy-team-link', 'primary block')}`);
  state.link = url;
  renderQr(url);
}

async function renderQr(url){
  const target = $('#qr-target');
  if(!target) return;
  target.innerHTML = '<p class="muted tiny">QR Code 產生中…</p>';
  try{
    const svg = await api('/api/qr?text=' + encodeURIComponent(url));
    target.innerHTML = svg.svg;
  }catch{
    target.innerHTML = '<p class="muted tiny">請直接複製連結傳送給隊伍。</p>';
  }
}

document.addEventListener('click', async e => {
  if(e.target.closest('[data-action=copy-team-link]')){
    await navigator.clipboard.writeText(state.link);
    toast('隊伍專屬連結已複製到剪貼簿');
  }
});

init();
