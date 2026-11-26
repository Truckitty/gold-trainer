/* NQ K-line Trainer v1.0 (CME Nasdaq-100 Futures: MNQ / NQ, 1-minute replay, 2018-10 to 2026-11).
   Features:
   - 8 timeframes (1m-4h), EMA 30/60/70/80/200, BOLL(20,2), MACD(12,26,9), ICT Killzones + OB + FVG (kz.js), PDH/PDL/PC overlay.
   - Two locked modes with isolated accounts & statistics:
       Discipline Mode (fixed size) and Combat Mode (Topstep-style scaling 1..maxQty, add/reduce, keep-risk pyramiding).
   - High-ergonomics interaction: Quick SL (E-multiples) & TP (R-multiples) chips, one-tap Chart Click-to-Order mode,
     draggable Order/SL/TP lines with live P&L labels (incl. slippage & fees), right-click / long-press order menu, '?' shortcut modal.
   - Quantitative evaluation: shadow opposite-direction "Direction Value" (95% CI & t-stat), skip counterfactual tracking,
     deterministic non-repeating 500-question decks (weighted sessions, FOMC/NFP/CPI news filter), multi-profile save slots.
   - Fully isolated nqkt_* localStorage & cache namespace so it coexists safely alongside gold-trainer on GitHub Pages. */
(function () {
  'use strict';
  var LW = window.LightweightCharts;
  var CTX_DAYS = 60;
  var TFS = [1, 3, 5, 10, 15, 30, 60, 240];
  var TF_CN = { 1: '1\u5206', 3: '3\u5206', 5: '5\u5206', 10: '10\u5206', 15: '15\u5206', 30: '30\u5206', 60: '1\u65f6', 240: '4\u65f6' };
  var EMA_P = [30, 60, 70, 80, 200];
  var SESS = { asia: [0, 540], london: [540, 870], ny: [870, 1320] }; // minutes from 18:00 ET
  var QWIN = { asia: [120, 540], london: [540, 870], ny: [870, 1270] };
  var ROUND = 10;
  var tick = 0.25;
  var CT = {
    MNQ: { tickVal: 0.5, fee: 0.4, ptVal: 2 },
    NQ:  { tickVal: 5.0, fee: 1.4, ptVal: 20 }
  };
  var MODE_CN = { fixed: '\u7eaa\u5f8b\u6a21\u5f0f', open: '\u5b9e\u6218\u6a21\u5f0f' };
  var MODE_SUB = { fixed: '\u56fa\u5b9a\u4ed3\u4f4d', open: '\u5f00\u653e\u4ed3\u4f4d \u00b7 \u4eff Topstep \u8003\u6838' };
  var SHAPE = {
    fixed: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.2" y="4.2" width="11.6" height="11.6" rx="1.5" transform="rotate(45 10 10)" fill="currentColor"/></svg>',
    open:  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.2 L18.6 17.4 Q19 18 18.2 18 L1.8 18 Q1 18 1.4 17.4 Z" fill="currentColor"/></svg>'
  };

  // Official US macro calendar (FOMC / NFP / CPI)
  var NEWS_FOMC = ['2018-01-31','2018-03-21','2018-05-02','2018-06-13','2018-08-01','2018-09-26','2018-11-08','2018-12-19','2019-01-30','2019-03-20','2019-05-01','2019-06-19','2019-07-31','2019-09-18','2019-10-30','2019-12-11','2020-01-29','2020-04-29','2020-06-10','2020-07-29','2020-09-16','2020-11-05','2020-12-16','2021-01-27','2021-03-17','2021-04-28','2021-06-16','2021-07-28','2021-09-22','2021-11-03','2021-12-15','2022-01-26','2022-03-16','2022-05-04','2022-06-15','2022-07-27','2022-09-21','2022-11-02','2022-12-14','2023-02-01','2023-03-22','2023-05-03','2023-06-14','2023-07-26','2023-09-20','2023-11-01','2023-12-13','2024-01-31','2024-03-20','2024-05-01','2024-06-12','2024-07-31','2024-09-18','2024-11-07','2024-12-18','2025-01-29','2025-03-19','2025-05-07','2025-06-18','2025-07-30','2025-09-17','2025-10-29','2025-12-10','2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-10-28'];
  var NEWS_NFP  = ['2018-02-02','2018-03-09','2018-04-06','2018-05-04','2018-06-01','2018-07-06','2018-08-03','2018-09-07','2018-10-05','2018-11-02','2018-12-07','2019-01-04','2019-02-01','2019-03-08','2019-04-05','2019-05-03','2019-06-07','2019-07-05','2019-08-02','2019-09-06','2019-10-04','2019-11-01','2019-12-06','2020-01-10','2020-02-07','2020-03-06','2020-04-03','2020-05-08','2020-06-05','2020-07-02','2020-08-07','2020-09-04','2020-10-02','2020-11-06','2020-12-04','2021-01-08','2021-02-05','2021-03-05','2021-04-02','2021-05-07','2021-06-04','2021-07-02','2021-08-06','2021-09-03','2021-10-08','2021-11-05','2021-12-03','2022-01-07','2022-02-04','2022-03-04','2022-04-01','2022-05-06','2022-06-03','2022-07-08','2022-08-05','2022-09-02','2022-10-07','2022-11-04','2022-12-02','2023-01-06','2023-02-03','2023-03-10','2023-04-07','2023-05-05','2023-06-02','2023-07-07','2023-08-04','2023-09-01','2023-10-06','2023-11-03','2023-12-08','2024-01-05','2024-02-02','2024-03-08','2024-04-05','2024-05-03','2024-06-07','2024-07-05','2024-08-02','2024-09-06','2024-10-04','2024-11-01','2024-12-06','2025-01-10','2025-02-07','2025-03-07','2025-04-04','2025-05-02','2025-06-06','2025-07-03','2025-08-01','2025-09-05','2025-11-20','2025-12-16','2026-01-09','2026-02-11','2026-03-06','2026-04-03','2026-05-08','2026-06-05','2026-07-02','2026-08-07','2026-09-04','2026-10-02'];
  var NEWS_CPI  = ['2018-02-14','2018-03-13','2018-04-11','2018-05-10','2018-06-12','2018-07-12','2018-08-10','2018-09-13','2018-10-11','2018-11-14','2018-12-12','2019-01-11','2019-02-13','2019-03-12','2019-04-10','2019-05-10','2019-06-12','2019-07-11','2019-08-13','2019-09-12','2019-10-10','2019-11-13','2019-12-11','2020-01-14','2020-02-13','2020-03-11','2020-04-10','2020-05-12','2020-06-10','2020-07-14','2020-08-12','2020-09-11','2020-10-13','2020-11-12','2020-12-10','2021-01-13','2021-02-10','2021-03-10','2021-04-13','2021-05-12','2021-06-10','2021-07-13','2021-08-11','2021-09-14','2021-10-13','2021-11-10','2021-12-10','2022-01-12','2022-02-10','2022-03-10','2022-04-12','2022-05-11','2022-06-10','2022-07-13','2022-08-10','2022-09-13','2022-10-13','2022-11-10','2022-12-13','2023-01-12','2023-02-14','2023-03-14','2023-04-12','2023-05-10','2023-06-13','2023-07-12','2023-08-10','2023-09-13','2023-10-12','2023-11-14','2023-12-12','2024-01-11','2024-02-13','2024-03-12','2024-04-10','2024-05-15','2024-06-12','2024-07-11','2024-08-14','2024-09-11','2024-10-10','2024-11-13','2024-12-11','2025-01-15','2025-02-12','2025-03-12','2025-04-10','2025-05-13','2025-06-11','2025-07-15','2025-08-12','2025-09-11','2025-10-24','2025-12-18','2026-01-13','2026-02-13','2026-03-11','2026-04-10','2026-05-12','2026-06-10','2026-07-14','2026-08-12','2026-09-11','2026-10-14'];
  var NEWS = {};
  [[NEWS_FOMC, 'FOMC'], [NEWS_NFP, '\u975e\u519c'], [NEWS_CPI, 'CPI']].forEach(function (x) {
    x[0].forEach(function (d) { NEWS[d] = NEWS[d] ? NEWS[d] + '/' + x[1] : x[1]; });
  });

  // ---------------- settings (isolated nqkt_* keys) ----------------
  var APP_VER = '1.0';
  var JOURNAL_VER = '1.0';
  var SPEEDS = [1, 3, 5, 10, 30];
  var DEF = {
    ver: 1, av: JOURNAL_VER, tz: 'bj', startMode: 'weighted', sessW: { asia: 4, london: 3, ny: 3 },
    yearFrom: 2018, yearTo: 2026, hide: true, tf: 1,
    stopMult: 1.0, tgtMult: 0, tpR: 0, timeExit: false, slip: 1, speed: 3,
    experiment: false, autoNext: false, ema: true, macd: true, boll: true, bollN: 20, bollK: 2,
    pdhl: true, noNews: true, axis: 'right', mode: 'fixed', slPts: null, tpPts: null, tkMode: 'mkt', tkQty: 2,
    fixed: { contract: 'MNQ', qty: 3, acctStart: 50000, maxLoss: 2000, trail: true, target: 3000 },
    open:  { contract: 'MNQ', maxQty: 10, acctStart: 50000, maxLoss: 2000, trail: true, target: 3000 },
    kz: { on: true, tz: 'utc5', boxes: true, lines: true, labels: true, extend: true, mean: false, ob: true, fvg: true }
  };
  function load(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v ? Object.assign({}, d, v) : JSON.parse(JSON.stringify(d)); }
    catch (e) { return JSON.parse(JSON.stringify(d)); }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function loadArr(k) { try { var v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  var CFG = load('nqkt_cfg', DEF);
  if (SPEEDS.indexOf(+CFG.speed) < 0) CFG.speed = 3;
  if (CFG.axis !== 'left') CFG.axis = 'right';
  if (['bj', 'ny', 'utc', 'ldn'].indexOf(CFG.tz) < 0) CFG.tz = 'bj';
  CFG.sessW = Object.assign({}, DEF.sessW, CFG.sessW || {});
  CFG.kz = Object.assign({}, DEF.kz, CFG.kz || {});
  CFG.fixed = Object.assign({}, DEF.fixed, CFG.fixed || {});
  CFG.open = Object.assign({}, DEF.open, CFG.open || {});
  if (!CT[CFG.fixed.contract]) CFG.fixed.contract = 'MNQ';
  if (!CT[CFG.open.contract]) CFG.open.contract = 'MNQ';
  if (TFS.indexOf(+CFG.tf) < 0) CFG.tf = 1;
  if (CFG.mode !== 'fixed' && CFG.mode !== 'open') CFG.mode = 'fixed';
  CFG.av = JOURNAL_VER;
  save('nqkt_cfg', CFG);

  // ---------------- state ----------------
  var S = {
    idx: null, bundles: {}, B: null, days: [], dd: null, S0: 0, date: null, cur: -1, A: null,
    pos: null, order: null, pairs: [], drill: null, playing: false, timer: null,
    trades: [], accts: [], acct: null, skips: [], decks: [], deck: null, q: null, loading: false,
    dayNo: 0, posLines: [], refLines: [], tradeMarks: [], hb: 10000, store: 'local',
    roundShownAt: {}, viewMode: null, kzData: null, sess: null, lastSum: null,
    intro: true, profiles: [], homeTab: 'profiles', pickOrder: false
  };

  // ---------------- profiles (save slots) ----------------
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pfVer(p) { return !!p && typeof p.id === 'string' && p.av === JOURNAL_VER; }
  function liveProfiles() { return S.profiles.filter(function (p) { return !p.deleted; }); }
  function newestUsed(list) { return list.slice().sort(function (x, y) { return (x.usedAt || '') < (y.usedAt || '') ? 1 : -1; })[0] || null; }
  function pfOf(id) { return S.profiles.filter(function (p) { return p.id === id; })[0] || null; }
  function curProfile() { return pfOf(PF); }
  function mkProfile(name, auto) {
    var t = new Date().toISOString();
    return { id: uid('p'), name: name, auto: !!auto, createdAt: t, usedAt: t, upd: t, deleted: false, n: 0, usd: 0, skips: 0, lastAt: null, av: JOURNAL_VER };
  }
  function nextProfileName() {
    var used = {}; liveProfiles().forEach(function (p) { used[p.name] = 1; });
    var k = liveProfiles().length + 1; while (used['NQ \u6863\u6848 ' + k]) k++; return 'NQ \u6863\u6848 ' + k;
  }
  S.profiles = loadArr('nqkt_profiles').filter(pfVer);
  var PF = null, PF_NEW = null;
  (function () {
    var want = null; try { want = localStorage.getItem('nqkt_pf'); } catch (e) { }
    var live = liveProfiles(), p = live.filter(function (x) { return x.id === want; })[0] || newestUsed(live);
    if (!p) { p = PF_NEW = mkProfile(nextProfileName(), true); S.profiles.push(p); }
    PF = p.id; try { localStorage.setItem('nqkt_pf', PF); } catch (e) { }
  })();
  function lk(k) { return k + '@' + PF; }
  function getCur(k) { var v = null; try { v = localStorage.getItem(k); if (v && v.charAt(0) === '"') v = JSON.parse(v); } catch (e) { v = null; } return v; }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  try { S.sess = JSON.parse(localStorage.getItem(lk('nqkt_sess'))) || null; } catch (e) { S.sess = null; }
  if (S.sess && S.sess.mode !== 'fixed' && S.sess.mode !== 'open') S.sess = null;
  var $ = function (id) { return document.getElementById(id); };

  // ---------------- data loading ----------------
  window.__index = function (x) { S.idx = x; };
  window.__bundle = function (ym, days) { S.bundles[ym] = days; };
  function loadScript(src) {
    if (window.__nqEmbedded) { var emb = window.__nqEmbedded(src); if (emb) return emb; }
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadBundle(ym) {
    if (S.bundles[ym]) return Promise.resolve(S.bundles[ym]);
    return loadScript('data/nq/m_' + ym.replace('-', '') + '.js').then(function () { return S.bundles[ym]; });
  }
  function decode(rec) {
    var b = rec.b, n = b.length / 6, m = new Int32Array(n), o = new Int32Array(n), h = new Int32Array(n),
      l = new Int32Array(n), c = new Int32Array(n), v = new Float64Array(n), mm = 0, pc = rec.p0;
    for (var i = 0; i < n; i++) {
      var k = 6 * i; mm += b[k]; var oo = pc + b[k + 1], cc = oo + b[k + 4];
      m[i] = mm; o[i] = oo; c[i] = cc; h[i] = Math.max(oo, cc) + b[k + 2]; l[i] = Math.min(oo, cc) - b[k + 3]; v[i] = b[k + 5]; pc = cc;
    }
    var E = rec.E.slice(), nz = E.filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    var med = nz.length ? nz[Math.floor(nz.length / 2)] : 120;
    for (var j = 0; j < E.length; j++) if (!E[j]) E[j] = med;
    return {
      n: n, m: m, o: o, h: h, l: l, c: c, v: v, E: E, p0: rec.p0, wd: rec.wd,
      pdh: rec.pdh == null ? null : rec.p0 + rec.pdh,
      pdl: rec.pdl == null ? null : rec.p0 + rec.pdl,
      pc:  rec.pc  == null ? null : rec.p0 + rec.pc
    };
  }
  function build(list) {
    var decs = [], N = 0;
    list.forEach(function (d) {
      var r = S.bundles[d.slice(0, 7)] && S.bundles[d.slice(0, 7)][d];
      if (r) { var D = decode(r); decs.push({ date: d, D: D }); N += D.n; }
    });
    var B = { T: new Float64Array(N), m: new Int32Array(N), dI: new Int32Array(N), o: new Int32Array(N), h: new Int32Array(N),
      l: new Int32Array(N), c: new Int32Array(N), v: new Float64Array(N), n: 0 };
    var k = 0, lastT = -Infinity, days = [];
    decs.forEach(function (x) {
      var p = x.date.split('-').map(Number), t0 = Date.UTC(p[0], p[1] - 1, p[2]) / 1000 - 6 * 3600, D = x.D, start = k;
      for (var i = 0; i < D.n; i++) {
        var t = t0 + D.m[i] * 60; if (t <= lastT) continue;
        B.T[k] = t; B.m[k] = D.m[i]; B.dI[k] = days.length; B.o[k] = D.o[i]; B.h[k] = D.h[i]; B.l[k] = D.l[i]; B.c[k] = D.c[i]; B.v[k] = D.v[i];
        lastT = t; k++;
      }
      if (k > start) days.push({ date: x.date, t0: t0, start: start, end: k - 1, p0: D.p0, E: D.E, pdh: D.pdh, pdl: D.pdl, pc: D.pc, wd: D.wd });
    });
    B.n = k; S.B = B; S.days = days; S.dd = days[days.length - 1]; S.S0 = S.dd.start;
    var lo = Infinity; for (var j = 0; j < k; j++) if (B.l[j] < lo) lo = B.l[j];
    S.hb = Math.max(10000, Math.ceil((2000 + (S.dd.p0 - lo) * tick) / 500) * 500);
  }

  // ---------------- helpers ----------------
  function px(t) { return CFG.hide ? (t - S.dd.p0) * tick + S.hb : t * tick; }
  function toTicks(p) { return CFG.hide ? Math.round((p - S.hb) / tick + S.dd.p0) : Math.round(p / tick); }
  function fmt(x, d) { if (x == null || isNaN(x)) return '-'; var s = Number(x).toFixed(d == null ? 2 : d); return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s; }
  function usd(x) { if (x == null || isNaN(x)) return '-'; var s = Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (x < 0 ? '-$' : '$') + s; }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function clockOf(m) { var t = (m + 1080) % 1440; return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function sessOf(m) { for (var k in SESS) if (m >= SESS[k][0] && m < SESS[k][1]) return k; return 'late'; }
  var SESS_CN = { asia: '\u4e9a\u76d8', london: '\u6b27\u76d8', ny: '\u7ebd\u7ea6', late: '\u5c3e\u76d8' };
  var WD_CN = ['\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d', '\u5468\u65e5'];
  function wdOfT(t) { return WD_CN[(new Date(t * 1000).getUTCDay() + 6) % 7]; }
  function hmOfT(t) { var d = new Date(t * 1000); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
  function ymdOfT(t) { var d = new Date(t * 1000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function usDst(y, mo, d) {
    function nthSunday(yy, mon, n) { var f = new Date(Date.UTC(yy, mon, 1)).getUTCDay(); return 1 + ((7 - f) % 7) + 7 * (n - 1); }
    if (mo < 2 || mo > 10) return false; if (mo > 2 && mo < 10) return true;
    if (mo === 2) return d >= nthSunday(y, 2, 2); return d < nthSunday(y, 10, 1);
  }
  function ukDst(y, mo, d) {
    function lastSunday(yy, mon) { var last = new Date(Date.UTC(yy, mon + 1, 0)); return last.getUTCDate() - last.getUTCDay(); }
    if (mo < 2 || mo > 9) return false; if (mo > 2 && mo < 9) return true;
    if (mo === 2) return d >= lastSunday(y, 2); return d < lastSunday(y, 9);
  }
  var TZ_CN = { bj: '\u5317\u4eac', ny: '\u7f8e\u4e1c', utc: 'UTC', ldn: '\u4f26\u6566' };
  function tzOff(tz, y, mo, d) { if (tz === 'bj') return 8; if (tz === 'utc') return 0; if (tz === 'ldn') return ukDst(y, mo, d) ? 1 : 0; return usDst(y, mo, d) ? -4 : -5; }
  var shiftCache = {};
  function zoneShift(t) {
    var tz = CFG.tz; if (tz === 'ny') return 0;
    var day = Math.floor(t / 86400), k = tz + day;
    if (shiftCache[k] === undefined) {
      var dd = new Date(day * 86400000);
      shiftCache[k] = (tzOff(tz, dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate()) - tzOff('ny', dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate())) * 3600;
    }
    return shiftCache[k];
  }
  function dispT(t) { return t + zoneShift(t); }
  function zoneClock(m, day, tz) {
    tz = tz || CFG.tz;
    var p = day.split('-').map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    if (m < 360) dt = new Date(dt.getTime() - 86400000);
    var off = tzOff(tz, dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()) - tzOff('ny', dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
    var t = (((m + 1080) % 1440 + off * 60) % 1440 + 1440) % 1440; return pad(Math.floor(t / 60)) + ':' + pad(t % 60);
  }
  function winTxt(k) {
    var now = new Date(), off = (tzOff(CFG.tz, now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - tzOff('ny', now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) * 60;
    var f = function (m) { var t = (((m + 1080) % 1440 + off) % 1440 + 1440) % 1440; return pad(Math.floor(t / 60)) + ':' + pad(t % 60); };
    return TZ_CN[CFG.tz] + ' ' + f(QWIN[k][0]) + '\u2013' + f(QWIN[k][1]);
  }
  function eAt(m) { return S.dd.E[Math.min(95, Math.max(0, Math.floor(m / 15)))]; }
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = 'none'; }, ms || 2200);
  }
  function ask(text, yes) {
    $('dlgIn').style.display = 'none'; $('dlgIn').onkeydown = null;
    $('dlgText').textContent = text; $('dlg').style.display = 'block'; $('mask').style.display = 'block';
    requestAnimationFrame(function () { $('mask').classList.add('show'); });
    $('dlgYes').onclick = function () { $('dlg').style.display = 'none'; $('mask').style.display = 'none'; $('mask').classList.remove('show'); yes(); };
    $('dlgNo').onclick = function () { $('dlg').style.display = 'none'; $('mask').style.display = 'none'; $('mask').classList.remove('show'); };
  }
  function askText(text, def, yes) {
    var inp = $('dlgIn');
    $('dlgText').textContent = text; inp.value = def || ''; inp.style.display = 'block';
    $('dlg').style.display = 'block'; $('mask').style.display = 'block';
    requestAnimationFrame(function () { $('mask').classList.add('show'); });
    setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 30);
    var close = function () { $('dlg').style.display = 'none'; $('mask').style.display = 'none'; $('mask').classList.remove('show'); inp.style.display = 'none'; inp.onkeydown = null; };
    var ok = function () { var v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 20); if (!v) { inp.focus(); return; } close(); yes(v); };
    $('dlgYes').onclick = ok; $('dlgNo').onclick = close;
    inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); ok(); } else if (e.key === 'Escape') close(); };
  }
  function kzOn() { if (S.drill && S.drill.cond === 'off') return false; if (S.drill && S.drill.cond === 'on') return true; return !!CFG.kz.on; }
  function localHM(iso) { if (!iso) return '-'; var d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function localMD(iso) { if (!iso) return '-'; var d = new Date(iso); return (d.getMonth() + 1) + '\u6708' + d.getDate() + '\u65e5'; }
  function isOpen() { return CFG.mode === 'open'; }
  function modeOf(x) { return x.mode || 'fixed'; }
  function inPos() { return !!(S.pos && !S.pos.closed); }

  // ---------------- chart ----------------
  var COL = { ema30: '#a855f7', emaY: '#fbbf24', ema200: '#f472b6', macd: '#38bdf8', sig: '#fb923c', bollMid: '#f59e0b', bollBand: '#3b82f6', order: '#38bdf8', liq: '#991b1b', pdh: '#64748b', pc: '#475569' };
  var VIVID = { green: '#10b981', red: '#f43f5e', yellow: '#f59e0b', cyan: '#38bdf8', white: '#edf2f7', blue: '#38bdf8' };
  function AX() { return CFG.axis === 'left' ? 'left' : 'right'; }
  var scaleOpt = function (vis) { return { visible: vis, borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.06 } }; };
  var chart = LW.createChart($('chart'), {
    autoSize: true,
    layout: { background: { type: 'solid', color: '#0b0f17' }, textColor: '#9fb0c7', fontSize: 12, attributionLogo: true,
      panes: { separatorColor: '#222e42', enableResize: true } },
    grid: { vertLines: { color: '#131a26' }, horzLines: { color: '#131a26' } },
    rightPriceScale: scaleOpt(AX() === 'right'), leftPriceScale: scaleOpt(AX() === 'left'),
    timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6,
      tickMarkFormatter: function (t, type) { if (type <= 2) return CFG.hide ? wdOfT(t) : ymdOfT(t).slice(5); return hmOfT(t); } },
    localization: { timeFormatter: function (t) { return (CFG.hide ? wdOfT(t) : ymdOfT(t) + ' ' + wdOfT(t)) + ' ' + hmOfT(t); },
      priceFormatter: function (p) { return p.toFixed(2); } },
    crosshair: { mode: LW.CrosshairMode.Normal, vertLine: { color: '#475569', labelBackgroundColor: '#1e293b' }, horzLine: { color: '#475569', labelBackgroundColor: '#1e293b' } }
  });
  var candles = chart.addSeries(LW.CandlestickSeries, {
    priceScaleId: AX(), upColor: '#10b981', downColor: '#f43f5e', borderVisible: false,
    wickUpColor: '#10b981', wickDownColor: '#f43f5e', priceFormat: { type: 'price', precision: 2, minMove: 0.25 }
  });
  candles.applyOptions({ autoscaleInfoProvider: function (orig) {
    var r = orig(); if (!r || !r.priceRange) return r;
    S.posLines.forEach(function (x) {
      if (x.kind && x.kind !== 'liq') {
        var v = x.line.options().price;
        if (v < r.priceRange.minValue) r.priceRange.minValue = v;
        if (v > r.priceRange.maxValue) r.priceRange.maxValue = v;
      }
    });
    return r;
  } });
  var kzPrim = new window.KZ.Primitive(); candles.attachPrimitive(kzPrim); window.__kzPrim = kzPrim;
  var lineOpt = function (color, w) { return { priceScaleId: AX(), color: color, lineWidth: w || 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false }; };
  var emaS = EMA_P.map(function (n) { return chart.addSeries(LW.LineSeries, lineOpt(n === 30 ? COL.ema30 : (n === 200 ? COL.ema200 : COL.emaY), n === 200 ? 2 : 1)); });
  var bollS = { up: chart.addSeries(LW.LineSeries, lineOpt(COL.bollBand)), mid: chart.addSeries(LW.LineSeries, lineOpt(COL.bollMid)), lo: chart.addSeries(LW.LineSeries, lineOpt(COL.bollBand)) };
  var BOLL_K = ['up', 'mid', 'lo'];
  var markers = LW.createSeriesMarkers(candles, []);
  var macdS = null;
  function ensureMacd() {
    if (CFG.macd && !macdS) {
      var fmtP = { type: 'price', precision: 2, minMove: 0.01 };
      macdS = {
        hist: chart.addSeries(LW.HistogramSeries, { priceScaleId: AX(), priceFormat: fmtP, lastValueVisible: false, priceLineVisible: false }, 1),
        macd: chart.addSeries(LW.LineSeries, Object.assign(lineOpt(COL.macd), { priceFormat: fmtP }), 1),
        sig:  chart.addSeries(LW.LineSeries, Object.assign(lineOpt(COL.sig),  { priceFormat: fmtP }), 1)
      };
      try { var ps = chart.panes(); ps[0].setStretchFactor(3); ps[1].setStretchFactor(1); } catch (e) { }
    } else if (!CFG.macd && macdS) {
      chart.removeSeries(macdS.hist); chart.removeSeries(macdS.macd); chart.removeSeries(macdS.sig); macdS = null;
      try { if (chart.panes().length > 1) chart.removePane(1); } catch (e) { }
    }
  }
  ensureMacd();
  function resetScales() {
    for (var pi = 0; pi < 2; pi++) ['left', 'right'].forEach(function (k) { try { chart.priceScale(k, pi).applyOptions({ autoScale: true }); } catch (e) { } });
  }
  function setAxis(side) {
    CFG.axis = side === 'left' ? 'left' : 'right'; save('nqkt_cfg', CFG);
    chart.applyOptions({ rightPriceScale: scaleOpt(AX() === 'right'), leftPriceScale: scaleOpt(AX() === 'left') });
    [candles].concat(emaS, [bollS.up, bollS.mid, bollS.lo], macdS ? [macdS.hist, macdS.macd, macdS.sig] : []).forEach(function (sr) { sr.applyOptions({ priceScaleId: AX() }); });
    resetScales();
    toast('\u4ef7\u683c\u8f74\u5df2\u5207\u6362\u5230' + (AX() === 'left' ? '\u5de6\u4fa7' : '\u53f3\u4fa7'));
  }

  // ---------------- aggregation + indicators ----------------
  function keyOf(i, tf) { tf = tf || S.A.tf; return S.days[S.B.dI[i]].t0 + Math.floor(S.B.m[i] / tf) * tf * 60; }
  function newEma(n, k0) { return { n: n, k0: k0 || 0, a: 2 / (n + 1), v: [] }; }
  function emaAt(e, src, k) {
    if (k < e.k0 + e.n - 1) return null;
    if (k === e.k0 + e.n - 1) { var s = 0; for (var j = e.k0; j <= k; j++) s += src[j]; return s / e.n; }
    return e.a * src[k] + (1 - e.a) * e.v[k - 1];
  }
  function bollN() { return Math.max(2, Math.min(200, Math.round(+CFG.bollN) || 20)); }
  function bollK() { var k = +CFG.bollK; return k > 0 && k <= 10 ? k : 2; }
  function bollAt(A, q) {
    var n = A.bN, b = A.boll;
    if (q < n - 1) { b.up[q] = b.mid[q] = b.lo[q] = null; return; }
    var s = 0, j; for (j = q - n + 1; j <= q; j++) s += A.c[j];
    var m = s / n, v = 0; for (j = q - n + 1; j <= q; j++) v += (A.c[j] - m) * (A.c[j] - m);
    var d = A.bK * Math.sqrt(v / n); b.mid[q] = m; b.up[q] = m + d; b.lo[q] = m - d;
  }
  function aggReset() {
    S.A = { tf: CFG.tf, key: [], first: [], last: [], o: [], h: [], l: [], c: [],
      ema: EMA_P.map(function (n) { return newEma(n); }), f12: newEma(12), s26: newEma(26),
      macd: [], sig: newEma(9, 25), hist: [], bN: bollN(), bK: bollK(), boll: { up: [], mid: [], lo: [] } };
    for (var i = 0; i <= S.cur; i++) aggAdd(i);
  }
  function aggAdd(i) {
    var A = S.A, B = S.B, key = keyOf(i), n = A.key.length, q;
    if (n && A.key[n - 1] === key) { q = n - 1; if (B.h[i] > A.h[q]) A.h[q] = B.h[i]; if (B.l[i] < A.l[q]) A.l[q] = B.l[i]; A.c[q] = B.c[i]; A.last[q] = i; }
    else { q = n; A.key.push(key); A.first.push(i); A.last.push(i); A.o.push(B.o[i]); A.h.push(B.h[i]); A.l.push(B.l[i]); A.c.push(B.c[i]); }
    A.ema.forEach(function (e) { e.v[q] = emaAt(e, A.c, q); });
    A.f12.v[q] = emaAt(A.f12, A.c, q); A.s26.v[q] = emaAt(A.s26, A.c, q);
    A.macd[q] = A.s26.v[q] == null ? null : A.f12.v[q] - A.s26.v[q];
    A.sig.v[q] = emaAt(A.sig, A.macd, q);
    A.hist[q] = A.sig.v[q] == null ? null : A.macd[q] - A.sig.v[q];
    bollAt(A, q);
  }
  function ptC(q) { var A = S.A; return { time: dispT(A.key[q]), open: px(A.o[q]), high: px(A.h[q]), low: px(A.l[q]), close: px(A.c[q]) }; }
  function ptL(v, q, f) { var t = dispT(S.A.key[q]); return v == null ? { time: t } : { time: t, value: f(v) }; }
  var pts = function (v) { return v * tick; };
  function histPt(q) {
    var v = S.A.hist[q], t = dispT(S.A.key[q]); if (v == null) return { time: t };
    var p = S.A.hist[q - 1], up = v >= 0, grow = p == null || Math.abs(v) >= Math.abs(p);
    return { time: t, value: v * tick, color: up ? (grow ? '#10b981' : '#6ee7b7') : (grow ? '#f43f5e' : '#fda4af') };
  }
  var DISP_MAX = 12000;
  function drawRefLines() {
    clearLines(S.refLines);
    if (!S.dd || !CFG.pdhl) return;
    if (S.dd.pdh != null) addLine(S.refLines, px(S.dd.pdh), COL.pdh, '\u524d\u9ad8 PDH', LW.LineStyle.Dotted, null);
    if (S.dd.pdl != null) addLine(S.refLines, px(S.dd.pdl), COL.pdh, '\u524d\u4f4e PDL', LW.LineStyle.Dotted, null);
    if (S.dd.pc  != null) addLine(S.refLines, px(S.dd.pc),  COL.pc,  '\u524d\u6536 PC',  LW.LineStyle.Dotted, null);
  }
  function renderAll() {
    if (!S.B) return;
    var A = S.A, n = A.key.length, idx = []; S.vis0 = Math.max(0, n - DISP_MAX); for (var q = S.vis0; q < n; q++) idx.push(q);
    candles.setData(idx.map(ptC));
    emaS.forEach(function (s, k) { s.setData(CFG.ema ? idx.map(function (q) { return ptL(A.ema[k].v[q], q, px); }) : []); });
    BOLL_K.forEach(function (k) { bollS[k].setData(CFG.boll ? idx.map(function (q) { return ptL(A.boll[k][q], q, px); }) : []); });
    ensureMacd();
    if (macdS) {
      macdS.hist.setData(idx.map(histPt));
      macdS.macd.setData(idx.map(function (q) { return ptL(A.macd[q], q, pts); }));
      macdS.sig.setData(idx.map(function (q) { return ptL(A.sig.v[q], q, pts); }));
    }
    resetScales();
    var w = $('chart').clientWidth || 390, show = Math.max(90, Math.floor(w / 5)), nv = n - S.vis0;
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, nv - show), to: nv + 6 });
    refreshKZ(); drawRefLines(); renderMarks(); drawTradeLines(); renderHeader(); renderTfBar(); renderTools();
  }
  function renderStep(from) {
    var A = S.A, n = A.key.length;
    for (var q = from; q < n; q++) {
      candles.update(ptC(q));
      if (CFG.ema) emaS.forEach(function (s, k) { s.update(ptL(A.ema[k].v[q], q, px)); });
      if (CFG.boll) BOLL_K.forEach(function (k) { bollS[k].update(ptL(A.boll[k][q], q, px)); });
      if (macdS) { macdS.hist.update(histPt(q)); macdS.macd.update(ptL(A.macd[q], q, pts)); macdS.sig.update(ptL(A.sig.v[q], q, pts)); }
    }
    refreshKZ(); renderMarks(); renderHeader();
  }

  // ---------------- top command strip ----------------
  function renderTfBar() {
    var el = $('tfbar');
    if (!el.firstChild) {
      var add = function (html) { var d = document.createElement('div'); d.innerHTML = html; while (d.firstChild) el.appendChild(d.firstChild); };
      add('<button class="mode" id="iMode" title="\u6a21\u5f0f\u5df2\u9501\u5b9a\uff1a\u70b9\u9000\u51fa\u540e\u56de\u9996\u9875\u5207\u6362\u6a21\u5f0f"></button><button class="symbtn" id="tSym" title="\u70b9\u51fb\u67e5\u770b\u5f53\u524d\u8d26\u6237\u8be6\u60c5">MNQ<small>$2/\u70b9</small></button><a class="swlink" href="../" title="\u5207\u6362\u5230\u9ec4\u91d1 GC K\u7ebf\u8bad\u7ec3\u5668">GC \u2197</a>');
      TFS.forEach(function (tf) { var b = document.createElement('button'); b.className = 'tfbtn'; b.textContent = TF_CN[tf]; b.dataset.tf = tf; b.onclick = function () { setTf(tf); }; el.appendChild(b); });
      add('<span class="sep"></span>' +
        '<button class="tog" id="iEma" title="EMA 30/60/70/80/200">EMA</button>' +
        '<button class="tog" id="iBoll" title="\u5e03\u6797\u5e26 BOLL(20, 2)">BOLL</button>' +
        '<button class="tog" id="iMacd" title="MACD(12, 26, 9)">MACD</button>' +
        '<button class="tog" id="iKz" title="ICT Killzones (15\u5206\u949f\u53ca\u4ee5\u4e0b\u663e\u793a)">KZ</button>' +
        '<button class="tog" id="iPdhl" title="\u524d\u4e00\u65e5\u9ad8\u4f4e\u70b9\u4e0e\u6536\u76d8\u4ef7 (PDH/PDL/PC)">PDH/L</button>' +
        '<span class="sep dsk"></span><span id="tbReplay" style="display:contents"></span>' +
        '<button class="dsk repbtn" id="bNext15" title="\u524d\u8fdb 15 \u6839 (\u4e0b\u65b9\u5411\u952e)">\u25b6 15</button>' +
        '<button class="dsk" id="iSpd" title="\u70b9\u51fb\u5207\u6362\u64ad\u653e\u901f\u5ea6"></button>' +
        '<span class="grow"></span><span id="tbNav" style="display:contents"></span>' +
        '<button class="dsk" id="nKeys" title="\u5feb\u6377\u952e\u901f\u67e5 (?)">?</button>');
      $('iMode').onclick = function () { toast('\u6a21\u5f0f\u5df2\u9501\u5b9a\u3002\u5982\u9700\u5207\u6362\u6a21\u5f0f\uff0c\u8bf7\u70b9\u201c\u9000\u51fa\u201d\u56de\u5230\u9996\u9875\u91cd\u65b0\u9009\u62e9\u3002', 2800); };
      $('tSym').onclick = function () { openSheet('sheetAcct', function () { renderAcct(false); }); };
      $('iEma').onclick = function () { CFG.ema = !CFG.ema; save('nqkt_cfg', CFG); if (S.B) renderAll(); renderTfBar(); };
      $('iBoll').onclick = function () { CFG.boll = !CFG.boll; save('nqkt_cfg', CFG); if (S.B) renderAll(); renderTfBar(); };
      $('iMacd').onclick = function () { CFG.macd = !CFG.macd; save('nqkt_cfg', CFG); if (S.B) renderAll(); else ensureMacd(); renderTfBar(); };
      $('iKz').onclick = function () {
        CFG.kz.on = !CFG.kz.on; save('nqkt_cfg', CFG); refreshKZ(); renderTfBar();
        if (S.drill && S.drill.cond !== 'manual') toast('\u5b9e\u9a8c\u6a21\u5f0f\u4e0b KZ \u7531\u7cfb\u7edf\u968f\u673a\u5f00\u5173');
        else if (CFG.kz.on && CFG.tf > 15) toast('Killzones \u4ec5\u5728 15 \u5206\u949f\u53ca\u4ee5\u4e0b\u5468\u671f\u663e\u793a');
      };
      $('iPdhl').onclick = function () { CFG.pdhl = !CFG.pdhl; save('nqkt_cfg', CFG); drawRefLines(); renderTfBar(); };
      $('bNext15').onclick = function () { step(15); };
      $('iSpd').onclick = function () { var k = SPEEDS.indexOf(+CFG.speed); CFG.speed = SPEEDS[(k + 1) % SPEEDS.length]; save('nqkt_cfg', CFG); renderTfBar(); if (S.playing) { stopPlay(); play(); } };
      $('nKeys').onclick = function () { openSheet('sheetKeys', renderKeys); };
    }
    Array.prototype.forEach.call(el.querySelectorAll('button[data-tf]'), function (b) { b.classList.toggle('on', +b.dataset.tf === +CFG.tf); });
    $('iEma').classList.toggle('on', !!CFG.ema);
    $('iBoll').classList.toggle('on', !!CFG.boll);
    $('iMacd').classList.toggle('on', !!CFG.macd);
    $('iKz').classList.toggle('on', !!CFG.kz.on);
    $('iPdhl').classList.toggle('on', !!CFG.pdhl);
    $('iSpd').textContent = CFG.speed + 'x';
    $('iMode').innerHTML = SHAPE[CFG.mode] + MODE_CN[CFG.mode];
    $('iMode').className = 'mode ' + CFG.mode;
    if (S.acct) {
      var ct = CT[S.acct.contract] || CT.MNQ;
      $('tSym').innerHTML = S.acct.contract + '<small>$' + ct.ptVal + '/\u70b9</small>';
    }
  }
  function setTf(tf) { CFG.tf = tf; save('nqkt_cfg', CFG); if (S.B) { aggReset(); renderAll(); } else renderTfBar(); }

  // ---------------- ICT Killzones ----------------
  var KZ_WINDOW = 5000, dstCache = {};
  function isDstT(t) { var k = Math.floor(t / 86400); if (dstCache[k] === undefined) { var d = new Date(k * 86400000); dstCache[k] = usDst(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); } return dstCache[k]; }
  function refreshKZ() {
    if (!S.A) return;
    if (!kzOn() || S.A.tf > 15) { S.kzData = null; kzPrim.set({ boxes: [], lines: [], labels: [] }, px); return; }
    var A = S.A, n = A.key.length, from = Math.max(0, n - KZ_WINDOW), utc5 = CFG.kz.tz === 'utc5';
    var bars = { n: n - from, o: A.o.slice(from), h: A.h.slice(from), l: A.l.slice(from), c: A.c.slice(from),
      minute: function (q) { var t = A.key[q + from]; if (utc5 && isDstT(t)) t -= 3600; return Math.floor((((t % 86400) + 86400) % 86400) / 60); } };
    var k = CFG.kz, r = window.KZ.compute(bars, { boxes: k.boxes, lines: k.lines, labels: k.labels, extend: k.extend, mean: k.mean, ob: k.ob, fvg: k.fvg });
    r.boxes.forEach(function (b) { b.q1 += from; b.q2 += from; });
    r.lines.forEach(function (l) { l.q1 += from; l.q2 += from; });
    r.labels.forEach(function (l) { l.q += from; });
    S.kzData = r; kzPrim.set(r, px, S.vis0 || 0);
  }

  // ---------------- markers + telemetry ribbon ----------------
  var marksKey = '';
  function renderMarks() {
    var j = S.cur, mk = [];
    S.tradeMarks.forEach(function (t) { if (t.i <= j) mk.push(Object.assign({}, t.mk, { time: dispT(keyOf(t.i)) })); });
    mk.sort(function (a, b) { return a.time - b.time; });
    var key = S.dayNo + '|' + S.A.tf + '|' + CFG.tz + '|' + mk.map(function (m) { return m.time + m.text; }).join(',');
    if (key === marksKey) return; marksKey = key;
    markers.setMarkers(mk);
  }
  function heatNow() {
    var B = S.B, j = S.cur, m0 = B.m[j] - 59, hi = -1e9, lo = 1e9;
    for (var i = j; i >= S.S0 && B.m[i] >= m0; i--) { if (B.h[i] > hi) hi = B.h[i]; if (B.l[i] < lo) lo = B.l[i]; }
    var ePrev = S.dd.E[Math.max(0, Math.floor((B.m[j] - 60) / 15))];
    return (hi > -1e9 && ePrev) ? (hi - lo) / ePrev : null;
  }
  function posPnl(p, price) {
    var ct = CT[S.acct.contract], u = p.realized - 2 * ct.fee * p.opened;
    p.lots.forEach(function (l) { u += l.q * p.side * (price - l.e) * ct.tickVal; });
    return u;
  }
  function sUsd(x) { return (x > 0 ? '+' : '') + usd(x); }
  function stopUsd(p) { return p.stop == null ? null : posPnl(p, p.stop - p.side * CFG.slip); }
  function targetUsd(p) { return p.target == null ? null : posPnl(p, p.target); }
  function stopPastLiq(p) { return p.stop != null && p.liq != null && p.side * (p.stop - p.liq) <= 0; }
  function ordUsd(o, ticks, loss) {
    var ct = CT[S.acct.contract], f = 2 * ct.fee * o.qty;
    return loss ? -(o.qty * (ticks + CFG.slip) * ct.tickVal + f) : o.qty * ticks * ct.tickVal - f;
  }
  function renderHeader() {
    var B = S.B, j = S.cur, m = B.m[j], sessKey = sessOf(m);
    $('hDay').textContent = (S.q ? '\u7b2c ' + S.q.no + '/' + S.q.size + ' \u9898 \u00b7 ' : '') + (CFG.hide ? '\u76f2\u6d4b\u6a21\u5f0f' : S.date) + ' \u00b7 ' + WD_CN[S.dd.wd];
    $('hSess').textContent = SESS_CN[sessKey];
    $('hSess').className = 'pill s-' + sessKey;
    var tr = !!(S.q && S.q.traded);
    $('nNew').textContent = tr ? '\u4e0b\u4e00\u9898' : '\u8df3\u8fc7\u8fd9\u4e00\u9898';
    $('nNew').className = tr ? 'nextq' : 'skipq';
    $('nNew').title = tr ? '\u8fdb\u5165\u4e0b\u4e00\u9898 (N)' : '\u7a7a\u4ed3\u8df3\u8fc7\u8fd9\u4e00\u9898 (N)';
    var condEl = $('hCond');
    if (S.drill && S.drill.cond !== 'manual') {
      condEl.style.display = 'inline-flex';
      condEl.textContent = '\u5b9e\u9a8c\u7ec4 KZ ' + (S.drill.cond === 'on' ? '\u5f00' : '\u5173');
    } else condEl.style.display = 'none';
    $('hClock').textContent = (CFG.tz === 'ny' ? '\u7f8e\u4e1c ' + clockOf(m) + ' \u00b7 \u5317\u4eac ' + zoneClock(m, S.date, 'bj') : TZ_CN[CFG.tz] + ' ' + zoneClock(m, S.date) + ' \u00b7 \u7f8e\u4e1c ' + clockOf(m));
    $('hPrice').textContent = fmt(px(B.c[j]));
    var h = heatNow();
    $('hE').textContent = '\u9884\u671f60\u5206\u632f\u5e45 ' + fmt(eAt(m) * tick, 1) + ' \u70b9';
    $('hHeat').textContent = '\u51b7\u70ed ' + (h == null ? '-' : fmt(h, 2) + 'x');
    $('hHeat').className = 'pill' + (h != null ? (h >= 1.3 ? ' hot' : (h <= 0.7 ? ' cold' : '')) : '');

    var p = S.pos, o = S.order, st = acctState(), a = S.acct, posTxt;
    $('posSec').classList.toggle('pos-active', inPos() || !!o);
    if (inPos()) {
      var fl = posPnl(p, B.c[j]), flR = fl / p.R0;
      var pend = p.pend.reduce(function (s, x) { return s + (x.type === 'add' ? x.n : -x.n); }, 0);
      posTxt = '<b class="' + (p.side > 0 ? 'good' : 'bad') + '">' + (p.side > 0 ? '\u591a\u5934' : '\u7a7a\u5934') + ' \u00d7' + p.qty + '</b>' +
        (pend ? ' (\u5f85' + (pend > 0 ? '+' : '') + pend + ')' : '') + ' @' + fmt(px(avgE(p))) +
        '<br>\u6d6e\u76c8 <b class="' + cls(fl) + '">' + sUsd(fl) + ' (' + (flR > 0 ? '+' : '') + fmt(flR, 2) + 'R)</b>' +
        (p.stop != null ? '<br>\u6b62\u635f <span class="' + cls(stopUsd(p)) + '">' + sUsd(stopUsd(p)) + '</span>' + (stopPastLiq(p) ? ' <span class="bad">(\u4f1a\u5148\u7206\u4ed3!)</span>' : '') : '') +
        (p.target != null ? ' \u00b7 \u6b62\u76c8 <span class="good">' + sUsd(targetUsd(p)) + '</span>' : '');
    } else if (o) {
      posTxt = '<b class="' + (o.side > 0 ? 'good' : 'bad') + '">' + (o.side > 0 ? '\u4e70\u5165' : '\u5356\u51fa') + ' \u00d7' + o.qty + '</b> ' +
        (o.type === 'mkt' ? '\u5e02\u4ef7 \u00b7 \u4e0b\u6839\u5f00\u76d8\u6210\u4ea4' : (o.type === 'lmt' ? '\u9650\u4ef7 ' : '\u7a81\u7834 ') + fmt(px(o.price)) + ' \u6302\u5355\u4e2d');
    } else {
      posTxt = '<span class="muted">\u5f53\u524d\u7a7a\u4ed3 \u00b7 \u53ef\u76f4\u63a5\u4e0b\u5355\u6216\u5728\u56fe\u4e0a\u70b9\u9009\u6302\u5355</span>';
    }
    $('pos').innerHTML = inPos() ? ((p.side > 0 ? '<span class="good">\u591a</span>' : '<span class="bad">\u7a7a</span>') + '\u00d7' + p.qty + ' <span class="' + cls(posPnl(p, B.c[j])) + '">' + sUsd(posPnl(p, B.c[j])) + '</span>') : (o ? '\u6302\u5355\u4e2d' : '');
    $('sPos').innerHTML = posTxt;

    var streak = winStreak();
    $('hAcct').innerHTML = (st.blown ? '<span class="bad">\u5df2\u7206\u4ed3</span>' : ('<span data-bal>' + usd(st.bal) + '</span> \u00b7 \u4f59\u91cf ' + usd(st.bal - st.line))) +
      (streak >= 2 ? ' <span class="streak">\u8fde\u80dc\u00d7' + streak + '</span>' : '');
    tweenBal(st.bal);
    $('sRoom').textContent = usd(st.bal - st.line);
    $('sRoom').className = (st.bal - st.line) <= a.maxLoss * 0.25 ? 'bad' : '';
    $('sLine').textContent = usd(st.line);
    $('sQty').textContent = modeOf(a) === 'open' ? (a.contract + ' 1\u2013' + a.maxQty + '\u624b') : (a.contract + ' \u00d7' + a.qty);
    $('sStat').innerHTML = (st.blown ? '<span class="bad">\u5df2\u7206\u4ed3</span>' : (st.passed ? '<span class="good">\u5df2\u8fbe\u6807</span>' : '\u8fdb\u884c\u4e2d (' + st.n + '\u7b14)')) + (streak >= 2 ? ' <span class="streak">\u00d7' + streak + '</span>' : '');
    $('sMode').textContent = MODE_CN[modeOf(a)] + ' \u00b7 ' + MODE_SUB[modeOf(a)];
    var hp = Math.max(0, Math.min(1, (st.bal - st.line) / a.maxLoss)), tg = a.target > 0 ? Math.max(0, Math.min(1, (st.bal - a.start) / a.target)) : 0;
    ['hpBar', 'mHp'].forEach(function (id) { var e = $(id); e.style.width = (hp * 100).toFixed(1) + '%'; e.style.background = hpColor(hp); });
    ['tgBar', 'mTg'].forEach(function (id) { $(id).style.width = (tg * 100).toFixed(1) + '%'; });
    $('hpTxt').textContent = usd(st.bal - st.line) + ' / ' + usd(a.maxLoss);
    $('tgTxt').textContent = a.target > 0 ? usd(st.bal - a.start) + ' / ' + usd(a.target) : '\u672a\u8bbe';

    var dis = mobileButtons();
    $('bAct').textContent = o ? '\u64a4\u5355' : (inPos() ? '\u5e73\u4ed3' : '\u6302\u5355');
    $('bSell').disabled = dis.sell; $('bBuy').disabled = dis.buy;
    $('bSellP').textContent = dis.sellTxt; $('bBuyP').textContent = dis.buyTxt;
    ticketUpdate();
    renderRoundNav();
  }
  function mobileButtons() {
    var c = S.B.c[S.cur], st = acctState(), end = S.cur >= S.B.n - 2, r = { buy: true, sell: true, buyTxt: fmt(px(c)), sellTxt: fmt(px(c)) };
    if (st.blown || end || S.order) return r;
    if (!inPos()) { r.buy = r.sell = false; if (isOpen()) { r.buyTxt += ' \u00d7' + tkQty(); r.sellTxt += ' \u00d7' + tkQty(); } return r; }
    if (!isOpen()) return r;
    var p = S.pos, n = tkQty(), room = S.acct.maxQty - p.qty - pendAdds(p);
    if (p.side > 0) { r.buy = room <= 0; r.buyTxt = '\u52a0\u4ed3 +' + Math.min(n, Math.max(room, 0)); r.sell = false; r.sellTxt = '\u51cf\u4ed3 -' + Math.min(n, p.qty); }
    else { r.sell = room <= 0; r.sellTxt = '\u52a0\u4ed3 +' + Math.min(n, Math.max(room, 0)); r.buy = false; r.buyTxt = '\u51cf\u4ed3 -' + Math.min(n, p.qty); }
    return r;
  }
  function hpColor(hp) { return hp > 0.5 ? VIVID.cyan : (hp > 0.25 ? VIVID.yellow : VIVID.red); }

  // ---------------- subtle visual feedback ----------------
  var balShown = null, balAnim = null;
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function tweenBal(target) {
    var els = [$('sBal')].concat(Array.prototype.slice.call(document.querySelectorAll('[data-bal]')));
    var paint = function (v) { els.forEach(function (e) { if (e) e.innerHTML = '<span class="' + cls(v - S.acct.start) + '">' + usd(v) + '</span>'; }); };
    if (reduced() || balShown == null || Math.abs(target - balShown) < 0.5) { balShown = target; cancelAnimationFrame(balAnim); paint(target); return; }
    var from = balShown, t0 = performance.now(); balShown = target; cancelAnimationFrame(balAnim);
    (function frame(t) { var k = Math.min(1, (t - t0) / 620), v = from + (target - from) * (1 - Math.pow(1 - k, 3)); paint(v); if (k < 1) balAnim = requestAnimationFrame(frame); })(t0);
  }
  function fxFloat(text, color, big) {
    if (reduced()) return;
    var d = document.createElement('div'), live = $('chartWrap').querySelectorAll('.floater').length;
    d.className = 'floater' + (big ? ' big' : ''); d.textContent = text; d.style.color = color; d.style.marginTop = (live * 38) + 'px';
    $('chartWrap').appendChild(d); setTimeout(function () { d.remove(); }, 1500);
  }
  function fxFlash(good) {
    if (reduced()) return;
    var w = $('chartWrap'); w.classList.remove('flashG', 'flashR'); void w.offsetWidth; w.classList.add(good ? 'flashG' : 'flashR');
  }
  function fxShake() { if (reduced()) return; var b = document.body; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); setTimeout(function () { b.classList.remove('shake'); }, 450); }
  function fxConfetti() {
    if (reduced()) return;
    var box = document.createElement('div'), cols = [VIVID.cyan, VIVID.white, VIVID.green]; box.className = 'confetti';
    for (var i = 0; i < 28; i++) {
      var e = document.createElement('i'), ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 180;
      e.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px'); e.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 60) + 'px');
      e.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg'); e.style.background = cols[i % cols.length]; e.style.animationDelay = (Math.random() * 0.12) + 's';
      box.appendChild(e);
    }
    $('chartWrap').appendChild(box); setTimeout(function () { box.remove(); }, 1550);
  }
  function winStreak() { var T = sorted(CFG.mode), k = 0; for (var i = T.length - 1; i >= 0 && T[i].usd > 0; i--) k++; return k; }

  // ---------------- account (Topstep trailing drawdown) ----------------
  function acctState(a) {
    a = a || S.acct; if (!a) return { bal: 0, line: 0, peak: 0, n: 0, blown: false, passed: false, wins: 0, T: [] };
    var T = S.trades.filter(function (t) { return t.acct === a.id; }).sort(function (x, y) { return x.at < y.at ? -1 : (x.at > y.at ? 1 : 0); });
    var bal = a.start, peak = a.start, line = a.start - a.maxLoss, blown = false, passed = false, wins = 0;
    T.forEach(function (t) {
      bal += t.usd; if (t.usd > 0) wins++;
      if (a.trail) { if (bal > peak) peak = bal; line = Math.min(peak - a.maxLoss, a.start); }
      if (t.reason === 'liquidation' || bal <= line + 1e-9) blown = true;
      if (a.target > 0 && bal >= a.start + a.target) passed = true;
    });
    return { bal: bal, peak: peak, line: line, blown: blown, passed: passed, n: T.length, wins: wins, T: T };
  }
  function curKey(mode) { return lk('nqkt_acct_cur_' + mode); }
  function newAccount(auto, mode) {
    mode = mode || CFG.mode; var c = CFG[mode];
    var a = { id: uid('a'), mode: mode, auto: !!auto, createdAt: new Date().toISOString(), start: +c.acctStart, maxLoss: +c.maxLoss, trail: !!c.trail,
      target: +c.target, contract: CT[c.contract] ? c.contract : 'MNQ',
      qty: mode === 'fixed' ? Math.max(1, Math.round(+c.qty)) : 1,
      maxQty: mode === 'open' ? Math.max(1, Math.round(+c.maxQty)) : null };
    S.accts.push(a); save(curKey(mode), a.id);
    if (mode === CFG.mode) { S.acct = a; balShown = null; }
    upsert('accounts', a);
    if (S.B) { renderHeader(); renderTfBar(); }
    return a;
  }
  function newestOf(list) { return list.slice().sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; })[0]; }
  function pickAccount() {
    var cur = getCur(curKey(CFG.mode));
    var list = S.accts.filter(function (x) { return modeOf(x) === CFG.mode; });
    var a = list.filter(function (x) { return x.id === cur; })[0] || newestOf(list);
    if (a) { S.acct = a; save(curKey(CFG.mode), a.id); } else newAccount(true);
    balShown = null;
  }
  function applyMode(m) {
    CFG.mode = m; save('nqkt_cfg', CFG); S.viewMode = m; pickAccount();
    document.body.className = 'game m-' + CFG.mode;
    renderTicket($('sTicket'), false); renderTfBar(); renderTools(); if (S.B) renderHeader();
  }

  // ---------------- sessions ----------------
  function sessRecs(id) {
    var by = function (a, b) { return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0); };
    return { T: S.trades.filter(function (t) { return t.sess === id; }).sort(by), K: S.skips.filter(function (t) { return t.sess === id; }).sort(by) };
  }
  function sessSummary(id, mode, at, end) {
    var r = sessRecs(id), s = summ(r.T), q = {};
    r.T.forEach(function (t) { if (t.qid) q[t.qid] = 1; }); r.K.forEach(function (t) { if (t.qid) q[t.qid] = 1; });
    var all = r.T.concat(r.K).map(function (t) { return t.at; }).sort();
    var sk = r.K.filter(function (x) { return x.longR != null && x.shortR != null; });
    return {
      id: id, mode: mode || (r.T[0] && modeOf(r.T[0])) || (r.K[0] && modeOf(r.K[0])) || CFG.mode,
      at: at || all[0] || null, end: end || all[all.length - 1] || null,
      q: Object.keys(q).length, n: r.T.length, skips: r.K.length, win: s.win, usd: s.usd, sum: s.sum, mean: s.mean, dv: s.dv, dvN: s.dvN, best: s.best, worst: s.worst, pf: s.pf,
      R: r.T.map(function (t) { return t.R; }),
      adds: r.T.reduce(function (a, t) { return a + (t.adds || 0); }, 0),
      addsWin: r.T.reduce(function (a, t) { return a + (t.addsWin || 0); }, 0),
      qtyMax: r.T.reduce(function (a, t) { return Math.max(a, t.qtyMax || t.qty || 0); }, 0),
      widen: r.T.reduce(function (a, t) { return a + (t.widen || 0); }, 0),
      skipRand: sk.length ? sk.reduce(function (a, x) { return a + (x.longR + x.shortR) / 2; }, 0) / sk.length : null
    };
  }
  function sessionList() {
    var ids = {};
    S.trades.concat(S.skips).forEach(function (t) { if (t.sess && !ids[t.sess]) ids[t.sess] = { mode: modeOf(t) }; });
    return Object.keys(ids).map(function (id) { return sessSummary(id, ids[id].mode); }).sort(function (a, b) { return (a.end || '') < (b.end || '') ? 1 : -1; });
  }
  function saveSess() { try { if (S.sess) localStorage.setItem(lk('nqkt_sess'), JSON.stringify(S.sess)); else localStorage.removeItem(lk('nqkt_sess')); } catch (e) { } }
  function closeSession() {
    if (!S.sess) return null;
    var x = S.sess, sum = sessSummary(x.id, x.mode, x.at, new Date().toISOString()); S.sess = null; saveSess(); touchProfile(); return sum;
  }
  function enterMode(m, quiet) {
    if (m !== 'fixed' && m !== 'open') return;
    var go = function () {
      if (S.sess && S.sess.mode !== m) closeSession();
      applyMode(m);
      var resumed = !!S.sess;
      if (!S.sess) { S.sess = { id: uid('e'), mode: m, at: new Date().toISOString() }; saveSess(); }
      S.lastSum = null; setPickOrder(false); hideIntro();
      if (S.B) renderAll();
      if (!quiet) toast((resumed ? '\u7ee7\u7eed' : '\u8fdb\u5165') + MODE_CN[m] + ' (' + S.acct.contract + ') \u00b7 \u6863\u6848\u300c' + (curProfile() ? curProfile().name : '') + '\u300d', 2600);
    };
    if (S.sess && S.sess.mode !== m && !quiet) {
      var n = sessRecs(S.sess.id).T.length;
      ask('\u4e0a\u6b21\u7684' + MODE_CN[S.sess.mode] + '\u5c1a\u672a\u9000\u51fa\uff08\u672c\u6bb5 ' + n + ' \u7b14\uff09\u3002\u8fdb\u5165' + MODE_CN[m] + '\u4f1a\u5148\u7ed3\u7b97\u4e0a\u4e00\u6bb5\u3002\u7ee7\u7eed\u5417\uff1f', go);
    } else go();
  }
  function exitMode(force) {
    if (!S.sess) { showIntro(); return; }
    var busy = inPos() || !!S.order;
    var go = function () {
      stopPlay(); setPickOrder(false); closeSheets();
      var traded = !!(S.q && S.q.traded);
      if (S.B && (busy || traded)) { endDrill(); drawTradeLines(); if (S.B) renderHeader(); }
      S.lastSum = closeSession();
      if (traded && S.deck) { S.deck.idx++; upsert('decks', S.deck); skipDone(); loadQ(); }
      clearTimeout(toast._t); $('toast').style.display = 'none';
      showIntro(); try { $('intro').scrollTop = 0; } catch (e) { }
    };
    if (force) go();
    else ask(busy ? '\u5f53\u524d\u6709\u6301\u4ed3\u6216\u6302\u5355\u3002\u9000\u51fa\u4f1a\u6309\u73b0\u4ef7\u5e73\u4ed3\u5e76\u64a4\u5355\uff0c\u7136\u540e\u56de\u5230\u9996\u9875\u7edf\u8ba1\u672c\u6bb5\u6210\u7ee9\u3002\u786e\u5b9a\u9000\u51fa\u5417\uff1f' : '\u9000\u51fa' + MODE_CN[S.sess.mode] + '\uff0c\u56de\u5230\u9996\u9875\u67e5\u770b\u672c\u6bb5\u7ed3\u7b97\uff1f', go);
  }
  function showIntro() { S.intro = true; renderIntro(); var el = $('intro'); el.style.display = 'block'; requestAnimationFrame(function () { el.classList.remove('hide'); }); }
  function hideIntro() { S.intro = false; var el = $('intro'); el.classList.add('hide'); setTimeout(function () { if (!S.intro) el.style.display = 'none'; }, reduced() ? 0 : 210); }
  var introTimer = null;
  function introDirty() { if (!S.intro) return; clearTimeout(introTimer); introTimer = setTimeout(renderIntro, 100); }

  function renderAcct(blownNow) {
    var el = $('sheetAcct'), a = S.acct, st = acctState(a), ct = CT[a.contract] || CT.MNQ;
    var h = '<h3>' + (blownNow ? '\u8d26\u6237\u7206\u4ed3' : MODE_CN[modeOf(a)] + ' \u00b7 \u8d26\u6237\u8be6\u60c5') + '<button class="x" data-close>\u00d7</button></h3>';
    if (blownNow) h += '<p class="big bad">' + usd(st.bal - a.start) + '</p>';
    h += '<div class="kpi"><div><span>\u4f59\u989d</span><strong class="' + cls(st.bal - a.start) + '">' + usd(st.bal) + '</strong></div>' +
      '<div><span>\u6700\u9ad8\u4f59\u989d</span><strong>' + usd(st.peak) + '</strong></div>' +
      '<div><span>\u7206\u4ed3\u7ebf</span><strong>' + usd(st.line) + '</strong></div>' +
      '<div><span>\u7b14\u6570</span><strong>' + st.n + '</strong></div>' +
      '<div><span>\u80dc\u7387</span><strong>' + (st.n ? fmt(st.wins / st.n * 100, 0) + '%' : '-') + '</strong></div>' +
      '<div><span>\u72b6\u6001</span><strong class="' + (st.blown ? 'bad' : (st.passed ? 'good' : '')) + '">' + (st.blown ? '\u5df2\u7206\u4ed3' : (st.passed ? '\u5df2\u8fbe\u6807' : '\u8fdb\u884c\u4e2d')) + '</strong></div></div>';
    h += '<p class="note">\u672c\u8d26\u6237\uff1a\u521d\u59cb ' + usd(a.start) + '\uff0c\u6700\u5927\u4e8f\u635f ' + usd(a.maxLoss) + (a.trail ? '\uff08\u52a8\u6001\u8ffd\u8e2a\uff1a\u968f\u5e73\u4ed3\u6700\u9ad8\u4f59\u989d\u4e0a\u79fb\uff0c\u6700\u9ad8\u9501\u81f3\u521d\u59cb\u8d44\u91d1\uff09' : '\uff08\u56fa\u5b9a\uff09') +
      (a.target > 0 ? '\uff0c\u76c8\u5229\u76ee\u6807 ' + usd(a.target) : '') + '\uff1b' + (modeOf(a) === 'open' ? a.contract + ' \u6bcf\u5355 1\u2013' + a.maxQty + ' \u624b\uff0c\u53ef\u52a0\u51cf\u4ed3' : '\u56fa\u5b9a ' + a.contract + ' \u00d7 ' + a.qty + ' \u624b') +
      '\uff08\u6bcf\u624b\u6bcf\u70b9 $' + ct.ptVal + '\uff0c\u6bcf\u8df3 $' + fmt(ct.tickVal, 2) + '\uff0c\u5355\u8fb9\u624b\u7eed\u8d39 $' + fmt(ct.fee, 2) + '\uff09\u3002</p>';
    h += '<div class="btnrow"><button class="main" id="acctNew">' + (st.blown ? '\u5f00\u65b0\u8d26\u6237' : '\u7ed3\u675f\u672c\u8d26\u6237\uff0c\u5f00\u65b0\u8d26\u6237') + '</button></div>';
    var hist = S.accts.filter(function (x) { return modeOf(x) === modeOf(a); }).sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; }).slice(0, 30);
    if (hist.length > 1 || st.n) {
      h += '<h4>' + MODE_CN[modeOf(a)] + ' \u5386\u53f2\u8d26\u6237</h4><table><tr><th>\u5f00\u6237</th><th>\u4ed3\u4f4d</th><th>\u7b14\u6570</th><th>\u6700\u7ec8\u4f59\u989d</th><th>\u72b6\u6001</th></tr>' + hist.map(function (x) {
        var s = acctState(x); return '<tr><td>' + x.createdAt.slice(5, 10) + (x.id === a.id ? ' (\u5f53\u524d)' : '') + '</td><td>' + x.contract + (modeOf(x) === 'open' ? ' \u2264' + x.maxQty : ' \u00d7' + x.qty) + '</td><td>' + s.n + '</td><td class="' + cls(s.bal - x.start) + '">' + usd(s.bal) + '</td><td>' + (s.blown ? '\u7206\u4ed3' : (s.passed ? '\u8fbe\u6807' : '\u2014')) + '</td></tr>';
      }).join('') + '</table>';
    }
    var c = CFG[modeOf(a)];
    h += '<p class="note">\u65b0\u8d26\u6237\u6309\u201c\u8bbe\u7f6e \u2192 \u8d26\u6237\u201d\u53c2\u6570\u521b\u5efa\uff08\u5f53\u524d\u8bbe\u5b9a\uff1a' + usd(c.acctStart) + '\uff0c\u6700\u5927\u4e8f\u635f ' + usd(c.maxLoss) + '\uff0c' + c.contract + (modeOf(a) === 'open' ? ' \u6700\u591a ' + c.maxQty + ' \u624b' : ' \u00d7 ' + c.qty + ' \u624b') + '\uff09\u3002</p>';
    el.innerHTML = h;
    el.querySelector('[data-close]').onclick = closeSheets;
    $('acctNew').onclick = function () {
      var go = function () { newAccount(false); closeSheets(); toast('\u65b0\u8d26\u6237\u5df2\u5f00\uff1a' + usd(S.acct.start) + '\uff0c' + S.acct.contract + (isOpen() ? ' \u6700\u591a ' + S.acct.maxQty + ' \u624b' : ' \u00d7 ' + S.acct.qty)); };
      if (st.blown) go(); else ask('\u7ed3\u675f\u5f53\u524d\u8d26\u6237\uff08\u4f59\u989d ' + usd(st.bal) + '\uff09\u5e76\u5f00\u542f\u4e00\u4e2a\u65b0\u8d26\u6237\uff1f', go);
    };
  }

  // ---------------- Fast-launch Home Hub ----------------
  function acctOfMode(m) {
    var cur = getCur(curKey(m));
    var list = S.accts.filter(function (x) { return modeOf(x) === m; });
    return list.filter(function (x) { return x.id === cur; })[0] || newestOf(list) || null;
  }
  function tileHtml(m) {
    var a = acctOfMode(m), c = CFG[m], st = a ? acctState(a) : null, T = sorted(m), sm = summ(T), live = S.sess && S.sess.mode === m;
    var start = a ? a.start : +c.acctStart, maxLoss = a ? a.maxLoss : +c.maxLoss, bal = st ? st.bal : start, line = st ? st.line : start - maxLoss;
    var hp = Math.max(0, Math.min(1, (bal - line) / maxLoss));
    var ctr = a ? a.contract : c.contract, ptVal = (CT[ctr] || CT.MNQ).ptVal;
    var size = m === 'open' ? (ctr + ' ($' + ptVal + '/\u70b9) \u00b7 1\u2013' + (a ? a.maxQty : c.maxQty) + ' \u624b') : (ctr + ' ($' + ptVal + '/\u70b9) \u00d7 ' + (a ? a.qty : c.qty) + ' \u624b');
    var desc = m === 'fixed'
      ? '\u6bcf\u7b14\u56fa\u5b9a\u624b\u6570\u3001\u6301\u4ed3\u4e2d\u4e0d\u53ef\u52a0\u4ed3\uff0c\u7ed3\u679c\u7eaf\u7cb9\u53cd\u6620\u5165\u573a\u65b9\u5411\u4e0e\u6b62\u635f\u7eaa\u5f8b\uff0c\u662f\u9a8c\u8bc1\u8bfb\u56fe\u65b9\u5411\u4ef7\u503c\u6700\u5e72\u51c0\u7684\u6a21\u5f0f\u3002'
      : '\u4eff Topstep \u8003\u6838\uff1a\u6bcf\u5355\u81ea\u7531\u9009 1\u2013' + (a ? a.maxQty : c.maxQty) + ' \u624b\uff0c\u652f\u6301\u6d6e\u76c8\u987a\u52bf\u52a0\u4ed3\uff08\u81ea\u52a8\u9501\u98ce\u9669\uff09\u4e0e\u5206\u6279\u51cf\u4ed3\uff0c\u91cd\u70b9\u8bad\u7ec3\u4ed3\u4f4d\u7ba1\u7406\u3002';
    var sgn = function (v) { return v == null || isNaN(v) ? '-' : (v > 0 ? '+' : '') + fmt(v, 2); };
    return '<div class="mcard t-' + m + '">' +
      '<div class="mtop">' + SHAPE[m] + '<span>' + (m === 'fixed' ? '\u56fa\u5b9a\u4ed3\u4f4d' : '\u5f00\u653e\u4ed3\u4f4d') + ' \u00b7 ' + size + '</span>' +
      (live ? '<span class="badge">\u8fdb\u884c\u4e2d \u00b7 \u672c\u6bb5 ' + sessRecs(S.sess.id).T.length + ' \u7b14</span>' : (st && st.blown ? '<span class="badge blown">\u5df2\u7206\u4ed3</span>' : '')) + '</div>' +
      '<h2>' + MODE_CN[m] + '</h2><p>' + desc + '</p>' +
      '<div class="tstats"><div><span>\u8d26\u6237\u4f59\u989d</span><strong>' + usd(bal) + '</strong></div><div><span>\u603b\u7b14\u6570</span><strong>' + T.length + '</strong></div>' +
      '<div><span>\u80dc\u7387</span><strong>' + (T.length ? fmt(sm.win * 100, 0) + '%' : '-') + '</strong></div><div><span>\u5e73\u5747 R</span><strong>' + (T.length ? sgn(sm.mean) : '-') + '</strong></div></div>' +
      '<div class="life"><span>\u751f\u547d\u503c</span><div class="hud"><div style="width:' + (hp * 100).toFixed(1) + '%;background:' + hpColor(hp) + '"></div></div><strong>' + usd(bal - line) + '</strong></div>' +
      '<button class="btn ' + (m === 'open' ? 'c-open' : 'c-fixed') + ' go" data-enter="' + m + '">' + (live ? '\u7ee7\u7eed' : '\u8fdb\u5165') + MODE_CN[m] + '</button></div>';
  }
  function sumHtml(x) {
    var maxAbs = Math.max(0.25, Math.min(4, x.R.reduce(function (a, r) { return Math.max(a, Math.abs(r)); }, 0)));
    var bars = x.R.map(function (r) { var hgt = Math.max(2, Math.min(24, Math.abs(r) / maxAbs * 24)); return '<i style="height:' + hgt.toFixed(1) + 'px;transform:translateY(' + (r >= 0 ? -hgt / 2 : hgt / 2).toFixed(1) + 'px);background:' + (r > 0 ? VIVID.green : VIVID.red) + '"></i>'; }).join('');
    var mins = x.at && x.end ? Math.max(1, Math.round((new Date(x.end) - new Date(x.at)) / 60000)) : null;
    var tile = function (c, label, v) { return '<div class="st"><div class="h">' + label + '</div><div class="v ' + c + '">' + v + '</div></div>'; };
    return '<section class="sumcard"><div><div class="note" style="font-weight:700;color:var(--acc)">\u672c\u6bb5\u7ed3\u7b97 \u00b7 ' + MODE_CN[x.mode] + ' \u00b7 ' + localMD(x.at) + ' ' + localHM(x.at) + '\u2013' + localHM(x.end) + (mins ? ' (' + mins + '\u5206\u949f)' : '') + '</div>' +
      '<div class="huge ' + cls(x.usd) + '">' + (x.n ? sUsd(x.usd) : '$0') + '</div>' +
      '<div class="note">' + x.q + ' \u9898 \u00b7 ' + x.n + ' \u7b14\u4ea4\u6613 \u00b7 \u8df3\u8fc7 ' + x.skips + ' \u9898</div>' +
      (x.n ? '<div class="rbars">' + bars + '</div>' : '<p class="note">\u672c\u6bb5\u672a\u5f00\u4ed3\u3002</p>') + '</div>' +
      '<div><div class="stiles">' +
      tile('', '\u80dc\u7387', x.n ? fmt(x.win * 100, 0) + '%' : '-') +
      tile(cls(x.sum), '\u603b R', x.n ? (x.sum > 0 ? '+' : '') + fmt(x.sum, 2) : '-') +
      tile(cls(x.mean), '\u5e73\u5747 R', x.n ? (x.mean > 0 ? '+' : '') + fmt(x.mean, 2) : '-') +
      tile(cls(x.dv), '\u65b9\u5411\u4ef7\u503c', x.dv == null ? '-' : (x.dv > 0 ? '+' : '') + fmt(x.dv, 3)) +
      tile('', '\u6700\u597d/\u6700\u5dee R', x.n ? fmt(x.best, 1) + ' / ' + fmt(x.worst, 1) : '-') +
      tile('', '\u76c8\u4e8f\u6bd4', x.pf == null ? '-' : fmt(x.pf, 2)) +
      '</div><div class="btnrow" style="margin-top:12px;margin-bottom:0"><button class="btn c-' + x.mode + '" data-enter="' + x.mode + '">\u518d\u6765\u4e00\u6bb5' + MODE_CN[x.mode] + '</button><button class="btn c-ghost" data-open="stats" data-vm="' + x.mode + '">\u5b8c\u6574\u7edf\u8ba1</button></div></div></section>';
  }
  function renderIntro() {
    var el = $('introBody'); if (!el) return;
    var nd = S.idx ? S.idx.days.length : null, dq = S.deck && S.idx ? deckQs(S.deck).length : null, c = CFG.fixed;
    var live = liveProfiles().sort(function (x, y) { return (x.createdAt || '') < (y.createdAt || '') ? -1 : 1; });
    var pfOpts = live.map(function (p) { return '<option value="' + p.id + '"' + (p.id === PF ? ' selected' : '') + '>' + escH(p.name) + ' (' + (p.id === PF ? S.trades.length : (p.n || 0)) + '\u7b14)</option>'; }).join('');
    var metaLine = (S.idx ? 'CME NQ/MNQ \u00b7 ' + S.idx.first.slice(0, 7) + '\u2014' + S.idx.last.slice(0, 7) + ' \u00b7 ' + nd + ' \u4ea4\u6613\u65e5' : '\u6570\u636e\u52a0\u8f7d\u4e2d\u2026') +
      (dq ? ' \u00b7 \u9898\u5e93 ' + Math.min(S.deck.idx + 1, dq) + '/' + dq : '') + ' \u00b7 v' + APP_VER;

    var h = '<header class="topbar-home"><div class="brand"><div class="brand-mark">NQ</div><div><h1>\u7eb3\u6307 NQ K\u7ebf\u8bad\u7ec3\u5668</h1><div class="sub">' + metaLine + '</div></div></div>' +
      '<div class="pf-bar"><a class="sw-gc" href="../">\u2190 \u9ec4\u91d1 GC \u7248</a><a class="sw-hub" href="../hub.html">\u603b\u89c8</a><select id="homePfSel" title="\u5207\u6362\u7ec3\u4e60\u6863\u6848">' + pfOpts + '</select>' +
      '<button class="btn c-ghost" data-pf="new">+ \u65b0\u5efa\u6863\u6848</button>' +
      '<button class="btn c-ghost" data-open="stats">\u7edf\u8ba1</button>' +
      '<button class="btn c-ghost" data-open="set">\u8bbe\u7f6e</button></div></header>';

    if (S.lastSum) h += sumHtml(S.lastSum);
    h += '<section class="mode-grid">' + tileHtml('fixed') + tileHtml('open') + '</section>';

    var tabs = [['profiles', '\u6863\u6848\u7ba1\u7406'], ['recent', '\u6700\u8fd1\u51e0\u6bb5'], ['rules', '\u89c4\u5219\u4e0e NQ \u5408\u7ea6'], ['how', '\u4ea4\u4e92\u901f\u89c8']];
    h += '<div class="htabs">' + tabs.map(function (t) { return '<button data-htab="' + t[0] + '" class="' + (S.homeTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';

    h += '<div class="hpanel">';
    if (S.homeTab === 'profiles') {
      h += '<div class="pfhead"><span>\u6863\u6848\u540d\u79f0</span><span>\u4ea4\u6613</span><span>\u76c8\u4e8f</span><span class="opt">\u6700\u8fd1\u6d3b\u52a8</span><span>\u64cd\u4f5c</span></div>' +
        live.map(function (p) {
          var me = p.id === PF, n = me ? S.trades.length : (p.n || 0), u = me ? sumUsd(S.trades) : (p.usd || 0), last = me ? lastOf(S.trades.concat(S.skips)) : p.lastAt;
          var act = me
            ? '<button data-pf="ren" data-id="' + p.id + '">\u91cd\u547d\u540d</button><button data-pf="reset" data-id="' + p.id + '">\u6e05\u7a7a\u91cd\u6765</button><button class="warn" data-pf="del" data-id="' + p.id + '">\u5220\u9664</button>'
            : '<button class="use" data-pf="use" data-id="' + p.id + '">\u5207\u6362</button><button class="warn" data-pf="del" data-id="' + p.id + '">\u5220\u9664</button>';
          return '<div class="pfrow' + (me ? ' cur' : '') + '"><div class="pfname">' + escH(p.name) + (me ? '<span class="pftag">\u5f53\u524d</span>' : '') + '</div>' +
            '<div class="mono">' + n + ' \u7b14</div><div class="mono ' + cls(u) + '">' + (n ? usd(u) : '-') + '</div><div class="opt">' + (last ? localMD(last) : '\u2014') + '</div><div class="pfact">' + act + '</div></div>';
        }).join('') +
        '<p class="note" style="margin-top:10px;margin-bottom:0">\u6bcf\u4e2a\u6863\u6848\u62e5\u6709\u72ec\u7acb\u7684\u8d26\u6237\u3001\u9898\u5e93\u4e0e\u7edf\u8ba1\uff0c\u66f4\u65b0\u7248\u672c\u4e0d\u4f1a\u6e05\u7a7a\u8bb0\u5f55\u3002\u5f53\u524d\u5b58\u50a8\u4f4d\u7f6e\uff1a<b>' + ({ server: '\u672c\u673a\u7535\u8111 journal \u6587\u4ef6\u5939', local: '\u5f53\u524d\u8bbe\u5907\u6d4f\u89c8\u5668 (\u72ec\u7acb nqkt \u7a7a\u95f4\uff0c\u4e0e\u9ec4\u91d1\u7248\u4e92\u4e0d\u5e72\u6270)' })[S.store] + '</b>\u3002</p>';
    } else if (S.homeTab === 'recent') {
      var list = sessionList().slice(0, 10);
      h += list.length
        ? '<table class="itable"><tr><th>\u65f6\u95f4</th><th>\u6a21\u5f0f</th><th>\u9898\u6570</th><th>\u7b14\u6570</th><th class="opt">\u80dc\u7387</th><th>\u76c8\u4e8f</th><th>\u603b R</th></tr>' + list.map(function (x) {
            var lv = S.sess && S.sess.id === x.id;
            return '<tr><td>' + localMD(x.at) + ' ' + localHM(x.at) + (lv ? ' <span class="acc-c">\u8fdb\u884c\u4e2d</span>' : '') + '</td><td><i class="dot ' + x.mode + '"></i>' + MODE_CN[x.mode] + '</td><td>' + x.q + '</td><td>' + x.n + '</td><td class="opt">' + (x.n ? fmt(x.win * 100, 0) + '%' : '-') +
              '</td><td class="' + cls(x.usd) + '">' + (x.n ? usd(x.usd) : '-') + '</td><td class="' + cls(x.sum) + '">' + (x.n ? fmt(x.sum, 2) : '-') + '</td></tr>';
          }).join('') + '</table>'
        : '<p class="note" style="margin:0">\u6682\u65e0\u5206\u6bb5\u8bb0\u5f55\u3002\u4e0a\u65b9\u9009\u62e9\u4efb\u610f\u6a21\u5f0f\u5f00\u59cb\u8bad\u7ec3\uff0c\u70b9\u201c\u9000\u51fa\u201d\u540e\u4f1a\u81ea\u52a8\u751f\u6210\u5206\u6bb5\u7ed3\u7b97\u3002</p>';
    } else if (S.homeTab === 'rules') {
      var rules = [
        ['NQ / MNQ \u5408\u7ea6\u89c4\u683c', '\u6700\u5c0f\u53d8\u52a8\u4ef7\u4f4d 0.25 \u70b9\u3002\u5fae\u578b MNQ \u6bcf\u70b9 $2\uff08\u6bcf\u8df3 $0.50\uff0c\u5355\u8fb9\u8d39 $0.40\uff09\uff1b\u6807\u51c6 NQ \u6bcf\u70b9 $20\uff08\u6bcf\u8df3 $5.00\uff0c\u5355\u8fb9\u8d39 $1.40\uff09\u3002\u56e0 2025\u20132026 \u7ebd\u7ea6\u76d8 60 \u5206\u949f\u5e38\u89c4\u632f\u5e45\u5df2\u8fbe 85\u2013111 \u70b9\uff0c\u9ed8\u8ba4\u4f7f\u7528 MNQ \u4ee5\u4fbf\u7cbe\u7ec6\u63a7\u98ce\uff0c\u53ef\u5728\u8bbe\u7f6e\u5185\u968f\u65f6\u5207\u6807\u51c6 NQ\u3002'],
        ['Topstep \u7c7b\u98ce\u63a7', '\u521d\u59cb ' + usd(c.acctStart) + '\uff0c\u6700\u5927\u52a8\u6001\u56de\u64a4 ' + usd(c.maxLoss) + '\uff08\u7206\u4ed3\u7ebf\u968f\u5e73\u4ed3\u6700\u9ad8\u4f59\u989d\u4e0a\u79fb\uff0c\u6700\u9ad8\u9501\u81f3\u521d\u59cb\u672c\u91d1\uff09\uff0c\u76c8\u5229\u76ee\u6807 ' + usd(c.target) + '\u3002\u76d8\u4e2d\u6743\u76ca\u89e6\u53ca\u7206\u4ed3\u4ef7\u7acb\u5373\u5f3a\u5e73\u3002'],
        ['\u4fdd\u5b88\u6210\u4ea4\u6a21\u62df', '\u5e02\u4ef7\u5355\u5728\u4e0b\u4e00\u6839 1m \u5f00\u76d8\u4ef7 + 1 \u8df3\u6ed1\u70b9\u6210\u4ea4\uff1b\u9650\u4ef7\u5355\u9700\u591a\u7a7f\u900f 1 \u8df3\uff080.25 \u70b9\uff09\u6210\u4ea4\uff1b\u7a81\u7834\u5355\u89e6\u53ca\u5373\u6309\u6302\u5355\u4ef7 + \u6ed1\u70b9\u6210\u4ea4\uff1b\u540c\u6839 K \u7ebf\u5185\u5148\u5224\u6b62\u635f\u3001\u518d\u5224\u6b62\u76c8\u3002'],
        ['\u65b9\u5411\u4ef7\u503c (DV)', '\u6bcf\u5f00\u4e00\u5355\uff0c\u7cfb\u7edf\u540c\u6b65\u5728\u540e\u53f0\u5f00\u4e00\u7b14\u201c\u53cd\u5411\u5f71\u5b50\u5355\u201d\uff0c\u65b9\u5411\u4ef7\u503c = (\u9996\u624b R \u2212 \u53cd\u5411 R) \u00f7 2\u3002\u957f\u671f 95% \u7f6e\u4fe1\u533a\u95f4\u6574\u4f53\u5927\u4e8e 0 \u624d\u8bf4\u660e\u62e9\u65f6\u65b9\u5411\u5177\u5907\u7edf\u8ba1\u4f18\u52bf\u3002'],
        ['\u9898\u5e93\u4e0e\u65b0\u95fb\u65e5\u8fc7\u6ee4', '\u6bcf\u5957\u6700\u591a 500 \u9898\u4e0d\u91cd\u590d\uff0c\u9ed8\u8ba4\u6309\u65f6\u6bb5\u6743\u91cd\uff08' + wTxt(CFG.sessW) + '\uff09\u968f\u673a\u62bd\u9898\uff0c\u5e76\u9ed8\u8ba4\u6392\u9664 FOMC / \u975e\u519c / CPI \u65b0\u95fb\u65e5\uff0c\u5e26\u524d\u7ea6 60 \u4e2a\u4ea4\u6613\u65e5\u4e0a\u4e0b\u6587\u3002'],
        ['\u76f2\u6d4b\u9632\u4f5c\u5f0a', '\u9ed8\u8ba4\u9690\u85cf\u771f\u5b9e\u65e5\u671f\u5e76\u5c06\u4ef7\u683c\u5e73\u79fb\u91cd\u6807\uff0c\u9632\u6b62\u901a\u8fc7\u8bb0\u4f4f\u5386\u53f2\u70b9\u4f4d\u4f5c\u5f0a\uff1b\u53ef\u5728\u8bbe\u7f6e\u4e2d\u968f\u65f6\u5173\u95ed\u76f2\u6d4b\u67e5\u770b\u771f\u5b9e\u65e5\u671f\u4e0e\u4ef7\u683c\u3002']
      ];
      h += '<div class="rgrid">' + rules.map(function (r) { return '<div class="rcard"><h3>' + r[0] + '</h3><p>' + r[1] + '</p></div>'; }).join('') + '</div>';
    } else {
      var hows = [
        ['1. \u5feb\u6377\u6b62\u635f\u6b62\u76c8\u9884\u8bbe', '\u4e0b\u5355\u9762\u677f\u76f4\u63a5\u5185\u7f6e 0.5E\u20132E \u6b62\u635f\u82af\u7247\u548c 1R\u20133R \u6b62\u76c8\u82af\u7247\uff0c\u4e00\u952e\u70b9\u51fb\u5373\u53ef\u81ea\u52a8\u6309\u5f53\u524d\u65f6\u6bb5 60 \u5206\u949f\u9884\u671f\u632f\u5e45\u6362\u7b97\u70b9\u6570\u4e0e\u7f8e\u5143\u98ce\u9669\uff0c\u65e0\u9700\u624b\u7b97\u3002'],
        ['2. \u56fe\u4e0a\u70b9\u9009\u6302\u5355 (G)', '\u4e0d\u7528\u6b7b\u8bb0\u53f3\u952e\u6216\u957f\u6309\uff1a\u70b9\u51fb\u201c\u56fe\u4e0a\u70b9\u9009\u6302\u5355\u201d\u6309\u94ae\uff08\u6216\u6309 G \u952e\uff09\uff0c\u5728\u56fe\u8868\u4efb\u610f\u4ef7\u4f4d\u5355\u51fb/\u8f7b\u70b9\uff0c\u76f4\u63a5\u5f39\u51fa\u8be5\u4ef7\u4f4d\u7684\u9650\u4ef7/\u7a81\u7834\u6302\u5355\u9009\u9879\uff1b\u4e0b\u5355\u540e\u6240\u6709\u7ebf\u5747\u53ef\u4e0a\u4e0b\u62d6\u52a8\u3002'],
        ['3. \u6301\u4ed3\u4e00\u952e\u6307\u6325\u6761', '\u6301\u4ed3\u540e\u81ea\u52a8\u9ad8\u4eae\u663e\u793a\u6d6e\u52a8\u76c8\u4e8f\uff08$ \u4e0e R \u53cc\u663e\u793a\uff09\uff0c\u4e00\u952e\u5b8c\u6210\u201c\u5feb\u8fdb\u5e73\u4ed3 / \u79fb\u81f3\u4fdd\u672c / \u987a\u52bf\u52a0\u4ed3 / \u51cf\u534a / \u6253\u5f62\u6001\u6807\u7b7e\uff08\u542b ORB\uff09\u201d\u3002'],
        ['4. \u591a\u5468\u671f\u4e0e\u7ed3\u6784\u53e0\u52a0', '\u9876\u90e8\u4e00\u952e\u5207\u6362 1m\u20134h \u5468\u671f\u4e0e EMA / BOLL / MACD / ICT Killzones (OB & FVG) / \u524d\u9ad8\u524d\u4f4e (PDH/PDL/PC)\u3002PC \u7aef\u6309 ? \u952e\u968f\u65f6\u547c\u51fa\u5feb\u6377\u952e\u9762\u677f\u3002']
      ];
      h += '<div class="rgrid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + hows.map(function (r) { return '<div class="rcard"><h3>' + r[0] + '</h3><p>' + r[1] + '</p></div>'; }).join('') + '</div>';
    }
    h += '</div>';

    h += '<footer class="ifoot"><div>\u4ec5\u7528\u4e8e\u4ea4\u6613\u8bad\u7ec3\uff0c\u4e0d\u6784\u6210\u6295\u8d44\u5efa\u8bae\u3002\u56fe\u8868\uff1aTradingView Lightweight Charts\u2122 (Apache-2.0)\uff1bKillzones \u79fb\u690d\u81ea LuxAlgo "ICT Killzones Toolkit" (<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>\uff0c\u975e\u5546\u7528)\u3002</div>' +
      '<div><button class="btn c-ghost" style="padding:6px 11px;font-size:12px" data-open="find">\u4f7f\u7528\u63d0\u793a\u4e0e NQ \u6570\u636e\u7279\u5f81</button></div></footer>';

    el.innerHTML = h;
    $('homePfSel').onchange = function () { if (this.value && this.value !== PF) switchProfile(this.value); };
    Array.prototype.forEach.call(el.querySelectorAll('[data-enter]'), function (b) { b.onclick = function () { enterMode(b.dataset.enter); }; });
    Array.prototype.forEach.call(el.querySelectorAll('[data-htab]'), function (b) { b.onclick = function () { S.homeTab = b.dataset.htab; renderIntro(); }; });
    Array.prototype.forEach.call(el.querySelectorAll('[data-pf]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.pf, id = b.dataset.id;
        if (k === 'new') createProfile(); else if (k === 'use') switchProfile(id); else if (k === 'ren') renameProfile(id);
        else if (k === 'reset') resetProfile(); else if (k === 'del') deleteProfile(id);
      };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-open]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.open;
        if (k === 'stats') { refreshServer(); S.viewMode = b.dataset.vm || CFG.mode; openSheet('sheetStats', renderStats); }
        else if (k === 'find') openSheet('sheetFind', renderFindings);
        else openSheet('sheetSet', renderSettings);
      };
    });
  }

  // ---------------- profiles actions ----------------
  function sumUsd(T) { return T.reduce(function (a, t) { return a + (t.usd || 0); }, 0); }
  function lastOf(list) { return list.reduce(function (a, t) { return t.at && t.at > a ? t.at : a; }, '') || null; }
  function saveProfile(p) { p.upd = new Date().toISOString(); upsert('profiles', p); }
  function touchProfile() {
    var p = curProfile(); if (!p) return;
    var n = S.trades.length, u = +sumUsd(S.trades).toFixed(2), k = S.skips.length, last = lastOf(S.trades.concat(S.skips));
    if (p.n === n && p.usd === u && p.skips === k && (p.lastAt || null) === last) return;
    p.n = n; p.usd = u; p.skips = k; p.lastAt = last; saveProfile(p);
  }
  function dropKeys(id) {
    try {
      var ks = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('nqkt_') === 0 && k.slice(-(id.length + 1)) === '@' + id) ks.push(k); }
      ks.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { }
  }
  function reloadTo(id, auto) {
    try { localStorage.setItem('nqkt_pf', id); } catch (e) { }
    if (auto) {
      var g = { t: 0, n: 0 }; try { g = JSON.parse(sessionStorage.getItem('nqkt_pfr')) || g; } catch (e) { }
      if (Date.now() - g.t < 8000 && g.n >= 2) return false;
      try { sessionStorage.setItem('nqkt_pfr', JSON.stringify({ t: Date.now(), n: Date.now() - g.t < 8000 ? g.n + 1 : 1 })); } catch (e) { }
    }
    S.reloading = true; stopPlay();
    var go = function () { location.reload(); };
    Promise.race([upsert.q || Promise.resolve(), new Promise(function (r) { setTimeout(r, 2000); })]).then(go, go);
  }
  function busyGuard() { if (inPos() || S.order) { toast('\u8bf7\u5148\u5e73\u4ed3\u5e76\u64a4\u5355'); return true; } return false; }
  function withSessionEnded(go) {
    if (!S.sess) { go(); return; }
    ask('\u5f53\u524d\u6863\u6848\u8fd8\u6709\u672a\u9000\u51fa\u7684' + MODE_CN[S.sess.mode] + '\uff08\u672c\u6bb5 ' + sessRecs(S.sess.id).T.length + ' \u7b14\uff09\u3002\u5148\u7ed3\u675f\u672c\u6bb5\u5e76\u4fdd\u5b58\u6210\u7ee9\u518d\u7ee7\u7eed\uff1f', function () { closeSession(); go(); });
  }
  function createProfile() {
    if (busyGuard()) return;
    askText('\u65b0\u5efa NQ \u7ec3\u4e60\u6863\u6848\uff1a\u8d77\u4e00\u4e2a\u540d\u5b57\u3002\u65b0\u6863\u6848\u7684\u8d26\u6237\u3001\u9898\u5e93\u548c\u7edf\u8ba1\u4ece\u96f6\u5f00\u59cb\uff0c\u65e7\u6863\u6848\u4fdd\u7559\u968f\u65f6\u53ef\u5207\u56de\u3002', nextProfileName(), function (name) {
      withSessionEnded(function () { touchProfile(); var p = mkProfile(name, false); saveProfile(p); reloadTo(p.id); });
    });
  }
  function switchProfile(id) {
    var p = pfOf(id); if (!p || p.deleted || id === PF || busyGuard()) return;
    withSessionEnded(function () { touchProfile(); p = pfOf(id); p.usedAt = new Date().toISOString(); saveProfile(p); reloadTo(id); });
  }
  function renameProfile(id) {
    var p = pfOf(id); if (!p) return;
    askText('\u91cd\u547d\u540d\u6863\u6848', p.name, function (name) { p = pfOf(id); p.name = name; p.auto = false; saveProfile(p); renderIntro(); toast('\u6863\u6848\u5df2\u6539\u540d\u4e3a\u300c' + name + '\u300d'); });
  }
  function countTxt(p) {
    if (p.id === PF) return S.trades.length + ' \u7b14\u4ea4\u6613\u3001' + S.skips.length + ' \u6b21\u8df3\u8fc7\u3001' + S.accts.length + ' \u4e2a\u8d26\u6237';
    return (p.n || 0) + ' \u7b14\u4ea4\u6613\u3001' + (p.skips || 0) + ' \u6b21\u8df3\u8fc7';
  }
  function purgeProfile(p, then) {
    var fin = function () { var q = pfOf(p.id); if (q) { q.deleted = true; q.deletedAt = new Date().toISOString(); saveProfile(q); } dropKeys(p.id); then(); };
    if (S.store !== 'server') { fin(); return; }
    (upsert.q || Promise.resolve()).then(function () {
      return fetch('api/purge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pf: p.id }) });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || '\u670d\u52a1\u5668\u62d2\u7edd');
      fin();
    }).catch(function (e) { toast('\u5220\u9664\u5931\u8d25\uff1a' + (e && e.message ? e.message : e), 5000); });
  }
  function resetProfile() {
    var p = curProfile(); if (!p || busyGuard()) return;
    ask('\u6e05\u7a7a\u6863\u6848\u300c' + p.name + '\u300d\u7684 ' + countTxt(p) + '\uff0c\u5e76\u7528\u540c\u4e00\u540d\u5b57\u4ece\u96f6\u5f00\u59cb\uff1f' + (S.store === 'server' ? '\uff08\u7535\u8111 journal/backup \u4f1a\u81ea\u52a8\u7559\u5b58\u5907\u4efd\uff09' : '\uff08\u6e05\u7a7a\u540e\u65e0\u6cd5\u6062\u590d\uff09'), function () {
      if (S.sess) closeSession();
      purgeProfile(p, function () { var np = mkProfile(p.name, false); saveProfile(np); reloadTo(np.id); });
    });
  }
  function deleteProfile(id) {
    var p = pfOf(id); if (!p || p.deleted || busyGuard()) return;
    var isCur = id === PF;
    ask('\u5220\u9664\u6863\u6848\u300c' + p.name + '\u300d\uff08' + countTxt(p) + '\uff09\uff1f' + (isCur ? (liveProfiles().length > 1 ? ' \u5220\u9664\u540e\u5c06\u5207\u6362\u5230\u6700\u8fd1\u4f7f\u7528\u7684\u53e6\u4e00\u4e2a\u6863\u6848\u3002' : ' \u5220\u9664\u540e\u4f1a\u81ea\u52a8\u65b0\u5efa\u4e00\u4e2a\u7a7a\u767d\u6863\u6848\u3002') : ''), function () {
      if (isCur && S.sess) closeSession();
      purgeProfile(p, function () {
        if (!isCur) { renderIntro(); toast('\u5df2\u5220\u9664\u6863\u6848\u300c' + p.name + '\u300d'); return; }
        var next = newestUsed(liveProfiles());
        if (!next) { next = mkProfile(nextProfileName(), false); S.profiles.push(next); }
        next.usedAt = new Date().toISOString(); saveProfile(next); reloadTo(next.id);
      });
    });
  }
  function syncProfiles(remote) {
    remote = (remote || []).filter(pfVer);
    var rid = {}; remote.forEach(function (p) { rid[p.id] = p; });
    var cur = curProfile();
    if (cur && cur.auto && !rid[cur.id] && remote.some(function (p) { return !p.deleted; }) && !S.trades.length && !S.skips.length) {
      dropKeys(cur.id); S.profiles = S.profiles.filter(function (p) { return p.id !== cur.id; });
    }
    var map = {}, up = [];
    remote.forEach(function (p) { map[p.id] = JSON.parse(JSON.stringify(p)); });
    S.profiles.forEach(function (p) {
      var r = map[p.id];
      if (!r || (p.deleted && !r.deleted) || (!r.deleted && (p.upd || '') > (r.upd || ''))) { map[p.id] = p; up.push(p); }
    });
    S.profiles = Object.keys(map).map(function (k) { return map[k]; }).sort(function (x, y) { return (x.createdAt || '') < (y.createdAt || '') ? -1 : 1; });
    saveLocal('profiles');
    up.forEach(function (p) { upsert('profiles', p); });
    S.profiles.forEach(function (p) { if (p.deleted) dropKeys(p.id); });
    var active = newestUsed(liveProfiles());
    if (!active) { active = mkProfile(nextProfileName(), true); S.profiles.push(active); saveProfile(active); }
    if (active.id !== PF && reloadTo(active.id, true) !== false) return true;
    introDirty(); return false;
  }

  // ---------------- trading engine (1-minute resolution, 0.25 tick) ----------------
  var REASON_CN = { manual: '\u624b\u52a8\u5e73\u4ed3', time: '60\u5206\u949f\u5230\u65f6', stop: '\u6b62\u635f', stop_gap: '\u8df3\u7a7a\u6b62\u635f', target: '\u6b62\u76c8', eod: '\u6536\u76d8', drill_end: '\u6362\u9898', liquidation: '\u7206\u4ed3\u5f3a\u5e73' };
  function canTrade() {
    if (!S.B || inPos() || S.order || S.cur >= S.B.n - 2) return false;
    if (acctState().blown) { toast('\u8d26\u6237\u5df2\u7206\u4ed3\uff0c\u8bf7\u5148\u5f00\u65b0\u8d26\u6237'); openSheet('sheetAcct', function () { renderAcct(false); }); return false; }
    return true;
  }
  function tkQty() { return isOpen() ? Math.max(1, Math.min(S.acct.maxQty, Math.round(+CFG.tkQty || 1))) : S.acct.qty; }
  function bracket() {
    var e = eAt(S.B.m[Math.min(S.cur + 1, S.B.n - 1)]);
    var sl = CFG.slPts != null ? Math.round(CFG.slPts / tick) : (CFG.stopMult > 0 ? Math.max(8, Math.ceil(CFG.stopMult * e - 1e-9)) : 0);
    var tp = 0;
    if (CFG.tpPts != null) tp = Math.round(CFG.tpPts / tick);
    else if (CFG.tpR > 0) tp = Math.ceil(CFG.tpR * (sl > 0 ? sl : e) - 1e-9);
    else if (CFG.tgtMult > 0) tp = Math.ceil(CFG.tgtMult * e - 1e-9);
    return { E: e, sl: sl, tp: tp };
  }
  function setPickOrder(on) {
    S.pickOrder = !!(on && S.B && !inPos() && !S.order);
    $('chartWrap').classList.toggle('picking', S.pickOrder);
    $('pickBanner').style.display = S.pickOrder ? 'flex' : 'none';
    var pb = document.querySelector('[data-f="pick"]'); if (pb) pb.classList.toggle('on', S.pickOrder);
  }
  function placeOrder(o) {
    setPickOrder(false);
    if (!o.qty) o.qty = tkQty();
    o.placedIdx = S.cur; o.id = uid('o'); S.order = o;
    o.drill = S.drill; o.tf = CFG.tf; o.kz = kzOn();
    drawTradeLines(); renderHeader(); renderTools();
    if (o.type === 'mkt') toast((o.side > 0 ? '\u4e70\u5165' : '\u5356\u51fa') + ' \u00d7' + o.qty + '\uff1a\u4e0b\u6839\u5f00\u76d8\u6210\u4ea4\uff0c\u6b62\u635f ' + (o.sl ? fmt(o.sl * tick, 2) + ' \u70b9' : '\u4e0d\u8bbe'));
    else toast((o.side > 0 ? '\u4e70\u5165' : '\u5356\u51fa') + (o.type === 'lmt' ? '\u9650\u4ef7' : '\u7a81\u7834') + '\u6302\u5355 \u00d7' + o.qty + ' @' + fmt(px(o.price)) + '\uff08\u53ef\u5728\u56fe\u4e0a\u62d6\u52a8\uff09');
  }
  function market(side) { if (!canTrade()) return; var b = bracket(); placeOrder({ side: side, type: 'mkt', price: null, sl: b.sl, tp: b.tp }); }
  function pending(side, P) { if (!canTrade()) return; if (!(P > 0)) { toast('\u4ef7\u683c\u65e0\u6548'); return; } var b = bracket(); placeOrder({ side: side, type: orderType(side, P), price: P, sl: b.sl, tp: b.tp }); }
  function tradeClick(side) {
    if (isOpen() && inPos()) { if (side === S.pos.side) queueAdd(tkQty(), false); else queueReduce(tkQty()); return; }
    market(side);
  }
  function orderType(side, price) { return side * (price - S.B.c[S.cur]) < 0 ? 'lmt' : 'stp'; }
  function tryFill(o, j) {
    var B = S.B, s = o.side, sl = CFG.slip, P = o.price;
    if (o.type === 'mkt') return { base: B.o[j], slip: sl, mid: false };
    if (o.type === 'lmt') {
      if (s * (B.o[j] - P) <= 0) return { base: B.o[j], slip: 0, mid: false };
      if (s > 0 ? B.l[j] <= P - 1 : B.h[j] >= P + 1) return { base: P, slip: 0, mid: true };
      return null;
    }
    if (s * (B.o[j] - P) >= 0) return { base: B.o[j], slip: sl, mid: false };
    if (s > 0 ? B.h[j] >= P : B.l[j] <= P) return { base: P, slip: sl, mid: true };
    return null;
  }
  function avgE(p) { var s = 0, q = 0; p.lots.forEach(function (l) { s += l.q * l.e; q += l.q; }); return q ? s / q : p.e0; }
  function mkPos(side, f, j, o, E, user) {
    var a = S.acct, ct = CT[a.contract], q0 = user ? o.qty : 1, entry = f.base + side * f.slip, riskT = o.sl > 0 ? o.sl : E;
    var perCt = riskT * ct.tickVal + 2 * ct.fee + 2 * CFG.slip * ct.tickVal;
    var p = {
      side: side, lots: [{ q: q0, e: entry }], qty: q0, opened: q0, realized: 0, e0: entry, entryIdx: j,
      stop: o.sl > 0 ? entry - side * o.sl : null, target: o.tp > 0 ? entry + side * o.tp : null,
      sl0: o.sl, tp0: o.tp, riskT: riskT, E: E, mid: f.mid, closed: false, deadlineM: S.B.m[j] + 60,
      timeExit: CFG.timeExit, closeReq: null, tags: [], type: o.type, perCt: perCt, R0: perCt * q0,
      liq: null, pend: [], adds: 0, addsWin: 0, addsLose: 0, reduces: 0, maxQty: q0, widen: 0, user: !!user
    };
    if (user) { var st = acctState(); p.bal0 = st.bal; p.line0 = st.line; recalcLiq(p); }
    return p;
  }
  function recalcLiq(p) {
    if (p.bal0 == null || !p.qty) return;
    var ct = CT[S.acct.contract], room = p.bal0 + p.realized - 2 * ct.fee * p.opened - p.line0;
    var x = avgE(p) - p.side * room / (ct.tickVal * p.qty);
    p.liq = p.side > 0 ? Math.floor(x + 1e-9) : Math.ceil(x - 1e-9);
  }
  function closeAll(p, price, j, reason) {
    var ct = CT[S.acct.contract];
    p.lots.forEach(function (l) { p.realized += l.q * p.side * (price - l.e) * ct.tickVal; });
    p.lots = []; p.qty = 0; p.pend = [];
    p.exit = price; p.exitIdx = j; p.reason = reason; p.closed = true;
    p.usd = p.realized - 2 * ct.fee * p.opened; p.R = p.usd / p.R0;
    p.R1 = (p.side * (price - p.e0) * ct.tickVal - 2 * ct.fee) / p.perCt;
  }
  function reduceP(p, n, price, j) {
    var ct = CT[S.acct.contract]; n = Math.min(n, p.qty);
    while (n > 0 && p.lots.length) {
      var l = p.lots[0], k = Math.min(n, l.q);
      p.realized += k * p.side * (price - l.e) * ct.tickVal;
      l.q -= k; n -= k; p.qty -= k; if (!l.q) p.lots.shift();
    }
    p.reduces++;
    if (!p.qty) { closeAll(p, price, j, 'manual'); return; }
    recalcLiq(p);
    S.tradeMarks.push({ i: j, mk: { position: p.side > 0 ? 'aboveBar' : 'belowBar', color: VIVID.yellow, shape: 'circle', text: '\u51cf\u4ed3' } });
    if (S.pos === p) fxFloat('\u51cf\u4ed3 \u00b7 \u5269 ' + p.qty + ' \u624b', VIVID.yellow);
  }
  function keepRiskStop(p, extraQ, extraE) {
    var ct = CT[S.acct.contract], Q = p.qty + extraQ, sumE = 0;
    p.lots.forEach(function (l) { sumE += l.q * l.e; }); sumE += extraQ * extraE;
    var budget = p.R0 + p.realized - 2 * ct.fee * (p.opened + extraQ), x = sumE / Q + p.side * CFG.slip - p.side * budget / (ct.tickVal * Q);
    var s = p.side > 0 ? Math.ceil(x - 1e-9) : Math.floor(x + 1e-9);
    if (p.stop != null) s = p.side > 0 ? Math.max(s, p.stop) : Math.min(s, p.stop);
    return s;
  }
  function addP(p, n, price, j, keepRisk) {
    n = Math.min(n, S.acct.maxQty - p.qty); if (n <= 0) return;
    var avg0 = avgE(p), ns = null;
    if (keepRisk) {
      ns = keepRiskStop(p, n, price);
      if (p.side * (price - ns) <= 0) { toast('\u4ef7\u683c\u56de\u843d\uff0c\u987a\u52bf\u52a0\u4ed3\u5df2\u53d6\u6d88\uff08\u6b62\u635f\u4f1a\u8d8a\u8fc7\u73b0\u4ef7\uff09', 2800); return; }
    }
    p.lots.push({ q: n, e: price }); p.qty += n; p.opened += n; p.adds++; if (p.qty > p.maxQty) p.maxQty = p.qty;
    if (p.side * (price - avg0) > 0) p.addsWin++; else p.addsLose++;
    if (ns != null) p.stop = ns;
    recalcLiq(p);
    S.tradeMarks.push({ i: j, mk: { position: p.side > 0 ? 'belowBar' : 'aboveBar', color: '#38bdf8', shape: p.side > 0 ? 'arrowUp' : 'arrowDown', text: '+' + n } });
    if (S.pos === p) { fxFloat('\u52a0\u4ed3 +' + n, VIVID.cyan); toast('\u52a0\u4ed3 +' + n + ' @' + fmt(px(price)) + '\uff0c\u5171 ' + p.qty + ' \u624b' + (keepRisk ? '\uff0c\u6b62\u635f\u5df2\u4e0a\u79fb\u81f3 ' + fmt(px(p.stop)) : '')); }
  }
  function exitCheck(p, j, fillBar) {
    var B = S.B, sl = CFG.slip, s = p.side;
    if (!fillBar) {
      if (p.closeReq != null && j >= p.closeReq) return closeAll(p, B.o[j] - s * sl, j, 'manual');
      if (p.timeExit && B.m[j] >= p.deadlineM) return closeAll(p, B.o[j] - s * sl, j, 'time');
      if (p.stop != null && s * (B.o[j] - p.stop) <= 0) return closeAll(p, B.o[j] - s * sl, j, 'stop_gap');
      if (p.liq != null && s * (B.o[j] - p.liq) <= 0) return closeAll(p, B.o[j] - s * sl, j, 'liquidation');
      if (p.pend.length) {
        var q = p.pend; p.pend = [];
        for (var k = 0; k < q.length && !p.closed; k++) {
          if (q[k].type === 'reduce') reduceP(p, q[k].n, B.o[j] - s * sl, j);
          else addP(p, q[k].n, B.o[j] + s * sl, j, q[k].keepRisk);
        }
        if (p.closed) return;
      }
    }
    var adv = s > 0 ? B.l[j] : B.h[j], lvl = null, why = null;
    if (p.stop != null && s * (adv - p.stop) <= 0) { lvl = p.stop; why = 'stop'; }
    if (p.liq != null && s * (adv - p.liq) <= 0 && (lvl == null || s * (p.liq - lvl) > 0)) { lvl = p.liq; why = 'liquidation'; }
    if (lvl != null) return closeAll(p, lvl - s * sl, j, why);
    if (p.target != null && !(fillBar && p.mid)) { var fav = s > 0 ? B.h[j] : B.l[j]; if (s * (fav - p.target) >= 1) return closeAll(p, p.target, j, 'target'); }
    if (j === B.n - 1) closeAll(p, B.c[j] - s * sl, j, 'eod');
  }
  function pendAdds(p) { return p.pend.reduce(function (a, x) { return a + (x.type === 'add' ? x.n : 0); }, 0); }
  function queueAdd(n, keepRisk) {
    var p = S.pos; if (!inPos() || !isOpen()) return;
    var room = S.acct.maxQty - p.qty - pendAdds(p); n = Math.min(n, room);
    if (n <= 0) { toast('\u5df2\u8fbe\u4e0a\u9650 ' + S.acct.maxQty + ' \u624b'); return; }
    if (keepRisk) {
      var est = S.B.c[S.cur] + p.side * CFG.slip, ns = keepRiskStop(p, n, est);
      if (p.side * (S.B.c[S.cur] - ns) <= 0) { toast('\u5f53\u524d\u6d6e\u76c8\u4e0d\u8db3\uff1a\u987a\u52bf\u52a0\u4ed3\u540e\u6b62\u635f\u4f1a\u8d8a\u8fc7\u73b0\u4ef7'); return; }
    }
    p.pend.push({ type: 'add', n: n, keepRisk: !!keepRisk });
    toast((keepRisk ? '\u987a\u52bf\u52a0\u4ed3' : '\u52a0\u4ed3') + ' +' + n + '\uff1a\u4e0b\u6839\u5f00\u76d8\u6210\u4ea4'); renderHeader(); renderTools();
  }
  function queueReduce(n) {
    var p = S.pos; if (!inPos()) return;
    var left = p.qty - p.pend.reduce(function (a, x) { return a + (x.type === 'reduce' ? x.n : 0); }, 0);
    if (n >= left) { closeReq(); return; }
    p.pend.push({ type: 'reduce', n: n }); toast('\u51cf\u4ed3 -' + n + '\uff1a\u4e0b\u6839\u5f00\u76d8\u6210\u4ea4'); renderHeader();
  }
  function onNewBar(j) {
    S.pairs.forEach(function (pr) { if (!pr.p.closed && pr.p.entryIdx < j) exitCheck(pr.p, j, false); if (!pr.s.closed && pr.s.entryIdx < j) exitCheck(pr.s, j, false); });
    var o = S.order;
    if (o && j > o.placedIdx) {
      var f = tryFill(o, j);
      if (f) {
        var E = eAt(S.B.m[j]), p = mkPos(o.side, f, j, o, E, true), sh = mkPos(-o.side, { base: f.base, slip: f.slip, mid: f.mid }, j, o, E, false);
        p.drill = o.drill; p.tf = o.tf; p.kz = o.kz; p.orderType = o.type;
        S.order = null; S.pos = p; S.pairs.push({ p: p, s: sh }); if (S.q) S.q.traded = true;
        exitCheck(p, j, true); exitCheck(sh, j, true);
        S.tradeMarks.push({ i: j, mk: { position: p.side > 0 ? 'belowBar' : 'aboveBar', color: p.side > 0 ? '#10b981' : '#f43f5e', shape: p.side > 0 ? 'arrowUp' : 'arrowDown', text: (p.side > 0 ? '\u591a' : '\u7a7a') + '\u00d7' + p.opened } });
        if (o.type !== 'mkt') { if (S.playing) stopPlay(); toast('\u6302\u5355\u6210\u4ea4 @' + fmt(px(p.e0))); }
        fxFloat((p.side > 0 ? '\u4e70\u5165' : '\u5356\u51fa') + ' \u00d7' + p.opened, p.side > 0 ? VIVID.green : VIVID.red);
        renderTools();
      }
    }
    var u = S.pos;
    if (u && u.closed && !u.handled) {
      u.handled = true;
      S.tradeMarks.push({ i: u.exitIdx, mk: { position: 'inBar', color: u.usd >= 0 ? '#10b981' : '#f43f5e', shape: 'circle', text: usd(u.usd) } });
      renderTools();
      if (S.playing) stopPlay();
      recordOpen(u);
      toast((u.usd >= 0 ? '\u76c8\u5229 ' : '\u4e8f\u635f ') + usd(u.usd) + ' (' + fmt(u.R, 2) + 'R \u00b7 ' + REASON_CN[u.reason] + ')');
      fxFloat(sUsd(u.usd), u.usd >= 0 ? VIVID.green : VIVID.red, true); fxFlash(u.usd >= 0);
      if (u.R >= 2) fxConfetti();
      afterClose(false, u);
    }
    drawTradeLines();
    finalizeReady();
  }
  function finalizeReady() {
    S.pairs = S.pairs.filter(function (pr) {
      if (pr.p.closed && pr.s.closed) { finalize(pr.p, pr.s); return false; }
      return true;
    });
  }
  function drawTradeLines() {
    clearLines(S.posLines); if (!S.B) return;
    var p = S.pos, o = S.order;
    if (o && o.type !== 'mkt') {
      addLine(S.posLines, px(o.price), COL.order, (o.side > 0 ? '\u4e70' : '\u5356') + (o.type === 'lmt' ? '\u9650\u4ef7' : '\u7a81\u7834') + '\u00d7' + o.qty + ' \u21d5', LW.LineStyle.Solid, 'order');
      if (o.sl > 0) addLine(S.posLines, px(o.price - o.side * o.sl), '#f43f5e', '\u6b62\u635f ' + sUsd(ordUsd(o, o.sl, true)) + ' \u21d5', LW.LineStyle.Dashed, 'ostop');
      if (o.tp > 0) addLine(S.posLines, px(o.price + o.side * o.tp), '#10b981', '\u6b62\u76c8 ' + sUsd(ordUsd(o, o.tp, false)) + ' \u21d5', LW.LineStyle.Dashed, 'otarget');
    }
    if (inPos()) {
      var flp = posPnl(p, S.B.c[S.cur]);
      addLine(S.posLines, px(avgE(p)), flp >= 0 ? '#10b981' : '#f43f5e', (p.side > 0 ? '\u591a' : '\u7a7a') + '\u00d7' + p.qty + ' ' + sUsd(flp), LW.LineStyle.Solid, 'entry');
      if (p.stop != null) addLine(S.posLines, px(p.stop), '#f43f5e', '\u6b62\u635f ' + sUsd(stopUsd(p)) + (stopPastLiq(p) ? ' \u00b7 \u4f1a\u5148\u7206\u4ed3' : '') + ' \u21d5', LW.LineStyle.Solid, 'stop');
      if (p.target != null) addLine(S.posLines, px(p.target), '#10b981', '\u6b62\u76c8 ' + sUsd(targetUsd(p)) + ' \u21d5', LW.LineStyle.Solid, 'target');
      if (p.liq != null) addLine(S.posLines, px(p.liq), COL.liq, '\u7206\u4ed3\u4ef7', LW.LineStyle.Dotted, 'liq');
    }
  }
  var DRAG = { order: 1, ostop: 1, otarget: 1, stop: 1, target: 1 };
  function clearLines(arr) { while (arr.length) { try { candles.removePriceLine(arr.pop().line); } catch (e) { } } }
  function addLine(arr, price, color, title, style, kind) {
    var l = candles.createPriceLine({ price: price, color: color, lineWidth: DRAG[kind] ? 2 : 1, lineStyle: style == null ? LW.LineStyle.Dashed : style, axisLabelVisible: true, title: title });
    arr.push({ line: l, kind: kind || null }); return l;
  }
  function closeReq() {
    if (S.order) { S.order = null; drawTradeLines(); renderHeader(); renderTools(); toast('\u5df2\u64a4\u5355'); return; }
    var p = S.pos; if (!inPos()) return;
    p.closeReq = S.cur + 1; p.pend = []; S.pairs.forEach(function (pr) { if (pr.p === p && !pr.s.closed) pr.s.closeReq = S.cur + 1; });
    step(1);
  }
  function breakeven() {
    var p = S.pos; if (!inPos()) return;
    var be = p.side > 0 ? Math.ceil(avgE(p) - 1e-9) : Math.floor(avgE(p) + 1e-9);
    if (p.side * (S.B.c[S.cur] - be) <= 0) { toast('\u4ef7\u683c\u5c1a\u672a\u5230\u8fbe\u76c8\u5229\u4e00\u4fa7\uff0c\u6682\u4e0d\u80fd\u79fb\u81f3\u4fdd\u672c'); return; }
    p.stop = be; drawTradeLines(); renderHeader(); toast('\u6b62\u635f\u5df2\u79fb\u81f3\u5f00\u4ed3\u5747\u4ef7\uff08\u4fdd\u672c\uff09');
  }
  function endDrill() {
    var B = S.B; if (!B) return; var j = S.cur;
    S.order = null;
    S.pairs.forEach(function (pr) {
      [pr.p, pr.s].forEach(function (p) { if (!p.closed) closeAll(p, B.c[j] - p.side * CFG.slip, j, 'drill_end'); });
      if (!pr.p.handled) { pr.p.handled = true; recordOpen(pr.p); afterClose(true, pr.p); }
    });
    finalizeReady();
  }
  function afterClose(silent, p) {
    var st = acctState(), a = S.acct;
    if (st.blown && !a.blownShown) { a.blownShown = true; S.roundShownAt[CFG.mode] = sorted(CFG.mode).length; fxShake(); fxFlash(false); fxFloat('\u7206\u4ed3', VIVID.red, true); openSheet('sheetAcct', function () { renderAcct(true); }); return; }
    if (st.passed && !a.passedShown) { a.passedShown = true; fxConfetti(); fxFloat('\u8003\u6838\u901a\u8fc7!', VIVID.cyan, true); toast('\u8d26\u6237\u8fbe\u5230\u76c8\u5229\u76ee\u6807 ' + usd(a.target) + '!', 3500); }
    var n = sorted(CFG.mode).length;
    if (n > 0 && n % ROUND === 0 && S.roundShownAt[CFG.mode] !== n) { S.roundShownAt[CFG.mode] = n; S.viewMode = CFG.mode; openSheet('sheetRound', function () { renderRound(true); }); return; }
    if (CFG.autoNext && !silent) setTimeout(function () { if (!inPos() && !S.order) nextQuestion(); }, 1400);
  }

  // ---------------- Interactive Order Ticket (with Quick SL/TP/Qty Chips & Chart-Pick) ----------------
  function renderOrder(mode) {
    var el = $('sheetOrder'), B = S.B, c = B.c[S.cur], h;
    renderOrder.modify = mode === 'modify';
    if (mode === 'modify') {
      var p = S.pos; if (!inPos()) { closeSheets(); return; }
      h = '<h3>\u4fee\u6539\u6b62\u635f / \u6b62\u76c8<button class="x" data-close>\u00d7</button></h3>' +
        '<p class="note">\u5f00\u4ed3\u5747\u4ef7 ' + fmt(px(avgE(p))) + '\uff0c\u73b0\u4ef7 ' + fmt(px(c)) + '\u3002\u7559\u7a7a\u8868\u793a\u4e0d\u8bbe\u3002</p>' +
        '<label>\u6b62\u635f\u4ef7<input type="number" step="0.25" id="mStop" value="' + (p.stop == null ? '' : fmt(px(p.stop))) + '"></label>' +
        '<label>\u6b62\u76c8\u4ef7<input type="number" step="0.25" id="mTgt" value="' + (p.target == null ? '' : fmt(px(p.target))) + '"></label>' +
        '<div class="btnrow"><button id="mBe">\u6b62\u635f\u79fb\u81f3\u4fdd\u672c</button><button class="main" id="mGo">\u786e\u5b9a\u4fee\u6539</button></div>';
      el.innerHTML = h; el.querySelector('[data-close]').onclick = closeSheets;
      $('mBe').onclick = function () { breakeven(); closeSheets(); };
      $('mGo').onclick = function () {
        var vs = $('mStop').value.trim(), vt = $('mTgt').value.trim(), ns = vs === '' ? null : toTicks(+vs), nt = vt === '' ? null : toTicks(+vt);
        if (ns != null && p.side * (c - ns) <= 0) { toast('\u6b62\u635f\u5fc5\u987b\u5728\u73b0\u4ef7\u7684\u4e8f\u635f\u4e00\u4fa7'); return; }
        if (nt != null && p.side * (nt - c) <= 0) { toast('\u6b62\u76c8\u5fc5\u987b\u5728\u73b0\u4ef7\u7684\u76c8\u5229\u4e00\u4fa7'); return; }
        if (p.stop != null && ns != null && p.side * (ns - p.stop) < 0) p.widen++;
        p.stop = ns; p.target = nt; drawTradeLines(); renderHeader(); closeSheets(); toast('\u5df2\u66f4\u65b0\u6b62\u635f/\u6b62\u76c8');
      };
      return;
    }
    renderTicket(el, true);
  }
  function ticketHtml(sheet) {
    var mode = sheet ? 'pend' : CFG.tkMode, open = isOpen();
    var qtyPresets = [1, 2, 3, 5, 10].filter(function (v) { return v <= S.acct.maxQty; });
    if (qtyPresets.indexOf(S.acct.maxQty) < 0) qtyPresets.push(S.acct.maxQty);
    return (sheet ? '<h3>\u6302\u5355\u4e0b\u5355<button class="x" data-close>\u00d7</button></h3>' : '<h5>\u5feb\u6377\u4e0b\u5355 \u00b7 ' + MODE_CN[CFG.mode] + '</h5><div class="seg"><button data-m="mkt" class="' + (mode === 'mkt' ? 'on' : '') + '">\u5e02\u4ef7</button><button data-m="pend" class="' + (mode === 'pend' ? 'on' : '') + '">\u6302\u5355</button></div>') +
      (!sheet ? '<button class="btn c-ghost pickbtn' + (S.pickOrder ? ' on' : '') + '" data-f="pick">\uff0b \u56fe\u4e0a\u70b9\u9009\u6302\u5355 (G)</button>' : '') +
      (mode === 'pend' ? '<div class="field-row"><label>\u6302\u5355\u4ef7\u683c</label><input type="number" step="0.25" data-f="price"></div><div class="hint" data-f="ptype"></div>' : '') +
      (open ? '<div class="field-row"><label>\u4e0b\u5355\u624b\u6570 (1\u2013' + S.acct.maxQty + ')</label><input type="number" step="1" min="1" max="' + S.acct.maxQty + '" data-f="qty"></div>' +
        '<div class="chips" data-cg="qty">' + qtyPresets.map(function (v) { return '<button data-q="' + v + '">' + v + '\u624b</button>'; }).join('') + '</div>'
        : '<div class="kv"><span>\u56fa\u5b9a\u4ed3\u4f4d</span><strong class="mono" data-f="qtyTxt"></strong></div>') +
      '<div class="field-row"><label>\u6b62\u635f\u70b9\u6570 (\u7559\u7a7a\u6309 E)</label><input type="number" step="0.25" min="0" data-f="sl"></div>' +
      '<div class="chips" data-cg="sl"><button data-slm="0">\u4e0d\u8bbe</button><button data-slm="0.5">0.5E</button><button data-slm="1">1E</button><button data-slm="1.5">1.5E</button><button data-slm="2">2E</button></div>' +
      '<div class="field-row"><label>\u6b62\u76c8\u70b9\u6570 (\u7559\u7a7a\u6309 R)</label><input type="number" step="0.25" min="0" data-f="tp"></div>' +
      '<div class="chips" data-cg="tp"><button data-tpr="0">\u4e0d\u8bbe</button><button data-tpr="1">1R</button><button data-tpr="1.5">1.5R</button><button data-tpr="2">2R</button><button data-tpr="3">3R</button></div>' +
      '<div class="riskbox" data-f="rbox"></div>' +
      '<div class="bs"><button class="btn c-green buy" data-f="buy">\u4e70\u5165\u505a\u591a<small></small></button><button class="btn c-red sell" data-f="sell">\u5356\u51fa\u505a\u7a7a<small></small></button></div>' +
      (sheet ? '<p class="note" style="margin-top:8px">\u4f4e\u4e8e\u73b0\u4ef7\u4e70 / \u9ad8\u4e8e\u73b0\u4ef7\u5356\u4e3a\u9650\u4ef7\u5355\uff0c\u53cd\u4e4b\u4e3a\u7a81\u7834\u5355\u3002\u4e0b\u5355\u540e\u6240\u6709\u7ebf\u5747\u53ef\u76f4\u63a5\u5728\u56fe\u4e0a\u62d6\u52a8\u3002</p>'
        : '<div class="row2"><button class="btn c-ghost" data-f="flat">\u5e02\u4ef7\u5e73\u4ed3 (X)</button><button class="btn c-ghost" data-f="cancel">\u64a4\u9500\u6302\u5355</button></div>');
  }
  function renderTicket(el, sheet) {
    if (!S.acct) return;
    el.innerHTML = ticketHtml(sheet);
    var q = function (f) { return el.querySelector('[data-f="' + f + '"]'); };
    if (sheet) el.querySelector('[data-close]').onclick = closeSheets;
    Array.prototype.forEach.call(el.querySelectorAll('.seg button'), function (b) { b.onclick = function () { CFG.tkMode = b.dataset.m; save('nqkt_cfg', CFG); renderTicket(el, sheet); }; });
    if (q('pick')) q('pick').onclick = function () {
      if (inPos() || S.order) { toast('\u5df2\u6709\u6301\u4ed3\u6216\u6302\u5355\uff0c\u8bf7\u5148\u5904\u7406\u5f53\u524d\u5355\u5b50'); return; }
      setPickOrder(!S.pickOrder);
    };
    q('sl').value = CFG.slPts == null ? '' : CFG.slPts;
    q('tp').value = CFG.tpPts == null ? '' : CFG.tpPts;
    q('sl').oninput = function () { var v = this.value.trim(); CFG.slPts = v === '' ? null : Math.max(0, +v); save('nqkt_cfg', CFG); ticketUpdate(); };
    q('tp').oninput = function () { var v = this.value.trim(); CFG.tpPts = v === '' ? null : Math.max(0, +v); save('nqkt_cfg', CFG); ticketUpdate(); };
    Array.prototype.forEach.call(el.querySelectorAll('[data-slm]'), function (b) {
      b.onclick = function () { CFG.slPts = null; CFG.stopMult = +b.dataset.slm; q('sl').value = ''; save('nqkt_cfg', CFG); ticketUpdate(); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-tpr]'), function (b) {
      b.onclick = function () { CFG.tpPts = null; CFG.tpR = +b.dataset.tpr; CFG.tgtMult = 0; q('tp').value = ''; save('nqkt_cfg', CFG); ticketUpdate(); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-q]'), function (b) {
      b.onclick = function () { CFG.tkQty = Math.min(S.acct.maxQty, +b.dataset.q); save('nqkt_cfg', CFG); if (S.B) renderHeader(); renderTools(); };
    });
    if (q('qty')) { q('qty').value = tkQty(); q('qty').oninput = function () { var v = Math.round(+this.value); if (v >= 1) { CFG.tkQty = Math.min(S.acct.maxQty, v); save('nqkt_cfg', CFG); if (S.B) renderHeader(); renderTools(); } }; }
    if (q('price')) { q('price').value = S.B ? fmt(px(S.B.c[S.cur])) : ''; q('price').oninput = ticketUpdate; }
    var go = function (side) {
      if (q('price') && !inPos()) { var P = toTicks(+q('price').value); if (sheet) closeSheets(); pending(side, P); }
      else tradeClick(side);
    };
    q('sell').onclick = function () { go(-1); }; q('buy').onclick = function () { go(1); };
    if (q('flat')) { q('flat').onclick = function () { if (inPos()) closeReq(); }; q('cancel').onclick = function () { if (S.order) closeReq(); }; }
    ticketUpdate();
  }
  function ticketUpdate() {
    if (!S.B || !S.acct) return;
    var b = bracket(), a = S.acct, ct = CT[a.contract], c = S.B.c[S.cur], st = acctState(), n = tkQty(), room$ = st.bal - st.line;
    var dis = mobileButtons();
    [$('sTicket'), $('sheetOrder').style.display === 'block' && !renderOrder.modify ? $('sheetOrder') : null].forEach(function (el) {
      if (!el || !el.querySelector('[data-f="sell"]')) return;
      var q = function (f) { return el.querySelector('[data-f="' + f + '"]'); };
      var risk = n * ((b.sl > 0 ? b.sl : b.E) * ct.tickVal + 2 * ct.fee + 2 * CFG.slip * ct.tickVal);
      var rew = b.tp > 0 ? (n * (b.tp * ct.tickVal - 2 * ct.fee)) : 0;
      var rr = b.tp > 0 && (b.sl > 0 || b.E > 0) ? (b.tp / (b.sl > 0 ? b.sl : b.E)) : 0;
      q('sl').placeholder = CFG.stopMult > 0 ? fmt(b.sl * tick, 2) + ' \u70b9' : '\u4e0d\u8bbe';
      q('tp').placeholder = b.tp > 0 ? fmt(b.tp * tick, 2) + ' \u70b9' : '\u4e0d\u8bbe';

      Array.prototype.forEach.call(el.querySelectorAll('[data-slm]'), function (btn) { btn.classList.toggle('on', CFG.slPts == null && +btn.dataset.slm === +CFG.stopMult); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-tpr]'), function (btn) { btn.classList.toggle('on', CFG.tpPts == null && +btn.dataset.tpr === +CFG.tpR); });
      Array.prototype.forEach.call(el.querySelectorAll('[data-q]'),   function (btn) { btn.classList.toggle('on', +btn.dataset.q === n); });

      var pct = room$ > 0 ? risk / room$ * 100 : 999;
      var rbox = q('rbox');
      rbox.classList.toggle('danger', risk >= room$);
      rbox.innerHTML =
        '<div class="rline"><span>' + (b.sl ? '\u6b62\u635f\u98ce\u9669 (' + fmt(b.sl * tick, 2) + '\u70b9 \u00b7 ' + n + '\u624b)' : '\u672a\u8bbe\u6b62\u635f (\u6309 1E \u4f30)') + '</span><b class="bad">-' + usd(risk) + ' (' + fmt(pct, 0) + '%\u4f59\u91cf)</b></div>' +
        '<div class="rline"><span>' + (b.tp ? '\u6b62\u76c8\u76ee\u6807 (' + fmt(b.tp * tick, 2) + '\u70b9 \u00b7 1:' + fmt(rr, 1) + ')' : '\u6b62\u76c8\u76ee\u6807') + '</span><b class="' + (b.tp ? 'good' : 'muted') + '">' + (b.tp ? '+' + usd(rew) : '\u4e0d\u8bbe') + '</b></div>' +
        (risk >= room$ ? '<div class="bad" style="font-weight:700;margin-top:2px">\u26a0 \u6b62\u635f\u989d\u5df2\u8d85\u7206\u4ed3\u4f59\u91cf\uff0c\u5c06\u89e6\u53d1\u5f3a\u5e73\uff01</div>' : '');

      if (q('qtyTxt')) q('qtyTxt').textContent = a.contract + ' \u00d7 ' + a.qty + ' ($' + (ct.ptVal * a.qty) + '/\u70b9)';
      if (q('qty') && document.activeElement !== q('qty')) q('qty').value = n;
      var pr = q('price'), P = pr ? toTicks(+pr.value) : null, flat = !inPos();
      if (pr) q('ptype').textContent = '\u4e70=' + (orderType(1, P) === 'lmt' ? '\u9650\u4ef7' : '\u7a81\u7834') + ' \u00b7 \u5356=' + (orderType(-1, P) === 'lmt' ? '\u9650\u4ef7' : '\u7a81\u7834') + ' (\u73b0\u4ef7 ' + fmt(px(c)) + ')';
      if (pr && flat) {
        q('sell').querySelector('small').textContent = (orderType(-1, P) === 'lmt' ? '\u9650\u4ef7 ' : '\u7a81\u7834 ') + fmt(px(P)) + (isOpen() ? ' \u00d7' + n : '');
        q('buy').querySelector('small').textContent  = (orderType(1, P) === 'lmt' ? '\u9650\u4ef7 ' : '\u7a81\u7834 ') + fmt(px(P)) + (isOpen() ? ' \u00d7' + n : '');
      } else {
        q('sell').querySelector('small').textContent = flat ? '\u5e02\u4ef7 ' + dis.sellTxt : dis.sellTxt;
        q('buy').querySelector('small').textContent  = flat ? '\u5e02\u4ef7 ' + dis.buyTxt  : dis.buyTxt;
      }
      q('sell').disabled = dis.sell; q('buy').disabled = dis.buy;
      if (q('flat')) { q('flat').disabled = !inPos(); q('cancel').disabled = !S.order; }
    });
  }

  // ---------------- dragging order / stop / target lines ----------------
  var drag = null, wrap = $('chartWrap');
  function lineAt(y, tol) {
    var best = null;
    S.posLines.forEach(function (x) {
      if (!DRAG[x.kind]) return;
      var yy = candles.priceToCoordinate(x.line.options().price);
      if (yy != null && Math.abs(yy - y) <= tol && (!best || Math.abs(yy - y) < best.d)) best = { kind: x.kind, line: x.line, d: Math.abs(yy - y) };
    });
    return best;
  }
  function dragTo(price) {
    var p = S.pos, o = S.order, c = S.B.c[S.cur];
    if (drag.kind === 'stop' && p) { if (p.side * (c - price) <= 0) price = c - p.side; p.stop = price; }
    else if (drag.kind === 'target' && p) { if (p.side * (price - c) <= 0) price = c + p.side; p.target = price; }
    else if (drag.kind === 'order' && o) { o.price = price; o.type = orderType(o.side, price); }
    else if (drag.kind === 'ostop' && o) { o.sl = Math.max(1, o.side * (o.price - price)); }
    else if (drag.kind === 'otarget' && o) { o.tp = Math.max(1, o.side * (price - o.price)); }
  }
  wrap.addEventListener('pointerdown', function (e) {
    if (!S.B || $('mask').style.display === 'block') return;
    if (e.target.closest && (e.target.closest('#ctx') || e.target.closest('#pickBanner'))) return;
    // Chart Click-to-Order mode: single left click / tap places menu at exact price
    if (S.pickOrder && (e.pointerType !== 'mouse' || e.button === 0)) {
      var rp = wrap.getBoundingClientRect();
      showCtx(e.clientX - rp.left, e.clientY - rp.top, true);
      e.stopPropagation(); e.preventDefault();
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var r = wrap.getBoundingClientRect(), hit = lineAt(e.clientY - r.top, e.pointerType === 'touch' ? 24 : 10);
    if (!hit) return;
    drag = { kind: hit.kind, id: e.pointerId, top: r.top, stop0: S.pos && S.pos.stop };
    chart.applyOptions({ handleScroll: false, handleScale: false }); chart.priceScale(AX()).applyOptions({ autoScale: false });
    try { wrap.setPointerCapture(e.pointerId); } catch (x) { }
    e.stopPropagation(); e.preventDefault();
  }, true);
  ['mousedown', 'touchstart', 'touchmove'].forEach(function (t) {
    wrap.addEventListener(t, function (e) { if (drag) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); } }, { capture: true, passive: false });
  });
  wrap.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var pr = candles.coordinateToPrice(e.clientY - drag.top); if (pr == null) return;
    dragTo(toTicks(pr)); drawTradeLines(); renderHeader();
    e.stopPropagation(); e.preventDefault();
  }, true);
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var k = drag.kind, s0 = drag.stop0; drag = null;
    if (k === 'stop' && S.pos && s0 != null && S.pos.side * (S.pos.stop - s0) < 0) S.pos.widen++;
    chart.applyOptions({ handleScroll: true, handleScale: true }); chart.priceScale(AX()).applyOptions({ autoScale: true });
    toast({ stop: '\u6b62\u635f', target: '\u6b62\u76c8', order: '\u6302\u5355\u4ef7', ostop: '\u6b62\u635f', otarget: '\u6b62\u76c8' }[k] + '\u5df2\u8c03\u6574');
  }
  wrap.addEventListener('pointerup', endDrag, true);
  wrap.addEventListener('pointercancel', endDrag, true);

  // ---------------- journal (local server > localStorage) ----------------
  function tradeRec(p) {
    var B = S.B, m = B.m[p.entryIdx], a = S.acct;
    return {
      id: p.id, at: new Date().toISOString(), mode: modeOf(a), acct: a.id, day: S.date, hidden: !!CFG.hide, clock: clockOf(m), m: m, session: sessOf(m),
      side: p.side, tf: p.tf, cond: p.drill ? p.drill.cond : 'manual', kz: !!p.kz, orderType: p.orderType || 'mkt',
      sl0: +(p.sl0 * tick).toFixed(2), tp0: +(p.tp0 * tick).toFixed(2), timeExit: p.timeExit, contract: a.contract,
      qty: p.opened, qty0: null, qtyMax: p.maxQty, adds: p.adds, addsWin: p.addsWin, addsLose: p.addsLose, reduces: p.reduces, widen: p.widen,
      E: +(p.E * tick).toFixed(2), riskPts: +(p.riskT * tick).toFixed(2), risk0: +p.R0.toFixed(2),
      entry: +(p.e0 * tick).toFixed(2), exit: +(p.exit * tick).toFixed(2), R: +p.R.toFixed(4), R1: +p.R1.toFixed(4), usd: +p.usd.toFixed(2),
      reason: p.reason, holdMin: B.m[p.exitIdx] - m, tags: p.tags.slice(), flipR: null, dv: null, coin: null,
      ema: !!CFG.ema, macd: !!CFG.macd, boll: !!CFG.boll, pdhl: !!CFG.pdhl,
      qid: S.q ? S.q.id : null, qno: S.q ? S.q.no : null, deck: S.deck ? S.deck.id : null, sess: S.sess ? S.sess.id : null, v: 1
    };
  }
  function recordOpen(p) {
    if (p.recorded) return; p.recorded = true;
    p.id = uid('t'); p.rec = tradeRec(p); p.rec.qty0 = Math.round(p.R0 / p.perCt); upsert('trades', p.rec);
  }
  function finalize(p, s) {
    if (!p.rec) recordOpen(p);
    p.rec.flipR = +s.R1.toFixed(4); p.rec.dv = +((p.R1 - s.R1) / 2).toFixed(4); p.rec.coin = +((p.R1 + s.R1) / 2).toFixed(4);
    upsert('trades', p.rec);
  }
  var COLLS = ['accounts', 'decks', 'skips', 'trades'];
  var CKEY = { trades: 'trades', accounts: 'accts', skips: 'skips', decks: 'decks', profiles: 'profiles' };
  var CUR = { accounts: 'acct', decks: 'deck' };
  function curVer(r) { return !!r && r.av === JOURNAL_VER && r.pf === PF; }
  function listOf(coll) { return S[CKEY[coll]]; }
  function setList(coll, arr) { S[CKEY[coll]] = arr; }
  function curOf(coll) { return CUR[coll] ? S[CUR[coll]] : null; }
  function clean(t) { var c = Object.assign({}, t); delete c._pending; delete c.blownShown; delete c.passedShown; return c; }
  function remoteSave(coll, rec) {
    if (S.store === 'server') return fetch('api/' + coll, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean(rec)) }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
    return Promise.resolve();
  }
  function saveLocal(coll) { save(coll === 'profiles' ? 'nqkt_profiles' : lk('nqkt_' + coll), listOf(coll).map(clean)); }
  function upsert(coll, rec) {
    if (!rec.av) rec.av = JOURNAL_VER;
    if (coll !== 'profiles' && !rec.pf) rec.pf = PF;
    var L = listOf(coll), i = L.findIndex(function (t) { return t.id === rec.id; }), cur = curOf(coll);
    var copy = cur && cur.id === rec.id ? rec : JSON.parse(JSON.stringify(rec));
    if (S.store !== 'local') copy._pending = true;
    if (i >= 0) L[i] = copy; else L.push(copy);
    saveLocal(coll);
    if (S.store !== 'local') {
      upsert.q = (upsert.q || Promise.resolve()).then(function () { return remoteSave(coll, rec); }).then(function () {
        var k = listOf(coll).findIndex(function (t) { return t.id === rec.id; }); if (k >= 0) delete listOf(coll)[k]._pending;
      }).catch(function () { });
    }
    if (coll === 'trades' || coll === 'skips') { if ($('sheetStats').style.display === 'block') renderStats(); renderRoundNav(); }
    introDirty();
  }
  function mergeRemote(coll, remote) {
    remote = remote.filter(curVer);
    var cur = curOf(coll), seen = {}; remote.forEach(function (t) { seen[t.id] = 1; });
    var keep = listOf(coll).filter(function (t) { return !seen[t.id] && (t._pending || (cur && t.id === cur.id)); });
    var merged = remote.map(function (t) {
      var c = JSON.parse(JSON.stringify(t));
      if (cur && c.id === cur.id) { if (coll === 'decks') c.idx = Math.max(c.idx || 0, cur.idx || 0); return Object.assign(cur, c); }
      return c;
    }).concat(keep);
    setList(coll, merged); saveLocal(coll);
    if (coll === 'trades' || coll === 'skips') { renderRoundNav(); if ($('sheetStats').style.display === 'block') renderStats(); }
    if (S.B) renderHeader();
    introDirty();
  }
  function getJSON(url, ms) {
    return Promise.race([fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }),
      new Promise(function (res) { setTimeout(function () { res(null); }, ms || 1500); })]);
  }
  function initStore() {
    COLLS.forEach(function (c) { setList(c, loadArr(lk('nqkt_' + c)).filter(curVer)); });
    if (PF_NEW) upsert('profiles', PF_NEW);
    pickAccount(); pickDeck(); renderRoundNav();
    if (location.protocol === 'file:' || window.__NQKT_STATIC) { touchProfile(); return; }
    getJSON('api/ping', 2000).then(function (r) {
      if (r && r.ok && r.app === 'nqkt') connectServer(); else touchProfile();
    }, function () { touchProfile(); });
  }
  function adopt(coll, remote) {
    var key = CUR[coll], cur = key ? S[key] : null;
    if (!cur || !cur.auto || remote.some(function (a) { return a.id === cur.id; })) return;
    var cand = coll === 'accounts' ? remote.filter(function (a) { return modeOf(a) === modeOf(cur); }) : remote.filter(deckOk);
    if (!cand.length) return;
    var used = coll === 'accounts' ? S.trades.some(function (t) { return t.acct === cur.id; })
      : (S.trades.some(function (t) { return t.deck === cur.id; }) || S.skips.some(function (t) { return t.deck === cur.id; }));
    if (used) return;
    setList(coll, listOf(coll).filter(function (a) { return a.id !== cur.id; }));
    var newest = newestOf(cand);
    S[key] = JSON.parse(JSON.stringify(newest));
    if (coll === 'accounts') { save(curKey(modeOf(newest)), newest.id); balShown = null; } else save(lk('nqkt_deck_cur'), newest.id);
    if (coll === 'decks' && S.idx) { skipDone(); loadQ(); }
  }
  function syncColl(coll, remote) {
    remote = remote.filter(curVer);
    adopt(coll, remote);
    var ids = {}; remote.forEach(function (t) { ids[t.id] = 1; });
    var localOnly = listOf(coll).filter(function (t) { return t && t.id && !ids[t.id]; });
    var cur = curOf(coll), rc = cur ? remote.filter(function (t) { return t.id === cur.id; })[0] : null;
    mergeRemote(coll, remote);
    localOnly.forEach(function (t) { upsert(coll, cur && t.id === cur.id ? cur : t); });
    if (coll === 'decks' && cur && rc && (rc.idx || 0) < (cur.idx || 0)) upsert('decks', cur);
  }
  function afterSync() {
    touchProfile(); if (!S.idx || !S.deck) return;
    if (S.loading) { S.pendingSync = true; return; }
    skipDone();
    if (S.q && S.q.id !== qidOf(S.deck.idx) && !inPos() && !S.order) loadQ();
  }
  function connectServer() {
    Promise.all(['profiles'].concat(COLLS).map(function (c) { return getJSON('api/' + c, 10000); })).then(function (r) {
      if (r.some(function (x) { return !Array.isArray(x); })) return;
      S.store = 'server';
      if (syncProfiles(r[0])) return;
      COLLS.forEach(function (c, k) { syncColl(c, r[k + 1]); }); afterSync();
    }, function () { });
  }
  function refreshServer() {
    if (S.store !== 'server') return;
    COLLS.forEach(function (c) { getJSON('api/' + c, 4000).then(function (r) { if (Array.isArray(r)) mergeRemote(c, r); }); });
  }

  // ---------------- question bank ----------------
  var QMAX = 500, deckCache = {};
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function deckOk(d) { return d && d.v >= 1; }
  function wOf(v) { v = Math.round(+v); return isFinite(v) && v > 0 ? Math.min(v, 10) : 0; }
  function wTxt(w) { w = w || DEF.sessW; return '\u4e9a ' + wOf(w.asia) + ' / \u6b27 ' + wOf(w.london) + ' / \u7ebd ' + wOf(w.ny); }
  function newDeck(auto) {
    var d = { id: uid('k'), auto: !!auto, createdAt: new Date().toISOString(), seed: Math.floor(Math.random() * 2147483646) + 1,
      yearFrom: +CFG.yearFrom, yearTo: +CFG.yearTo, startMode: CFG.startMode, noNews: !!CFG.noNews, idx: 0, v: 1,
      w: { asia: wOf(CFG.sessW.asia), london: wOf(CFG.sessW.london), ny: wOf(CFG.sessW.ny) } };
    S.decks.push(d); S.deck = d; save(lk('nqkt_deck_cur'), d.id); upsert('decks', d);
    return d;
  }
  function pickDeck() {
    var cur = getCur(lk('nqkt_deck_cur'));
    var ok = S.decks.filter(deckOk), d = ok.filter(function (x) { return x.id === cur; })[0] || newestOf(ok);
    if (d) { S.deck = d; save(lk('nqkt_deck_cur'), d.id); } else newDeck(true);
  }
  function deckDays(d) {
    var days = S.idx.days.filter(function (x) { var y = +x.slice(0, 4); return y >= d.yearFrom && y <= d.yearTo; });
    if (!days.length) days = S.idx.days.slice();
    var all = days.length; if (d.noNews) days = days.filter(function (x) { return !NEWS[x]; });
    return { days: days, removed: all - days.length };
  }
  function deckQs(d) {
    if (deckCache[d.id]) return deckCache[d.id];
    var r = mulberry32(d.seed), days = deckDays(d).days.slice();
    for (var i = days.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = days[i]; days[i] = days[j]; days[j] = t; }
    var qs = [], W = d.w || DEF.sessW, tot = wOf(W.asia) + wOf(W.london) + wOf(W.ny);
    for (var k = 0; k < Math.min(QMAX, days.length); k++) {
      var u = r(), m;
      if (d.startMode === 'weighted' && tot > 0) {
        var x = r() * tot, ks = x < wOf(W.asia) ? 'asia' : (x < wOf(W.asia) + wOf(W.london) ? 'london' : 'ny');
        m = QWIN[ks][0] + Math.floor(u * (QWIN[ks][1] - QWIN[ks][0]));
      } else m = d.startMode === 'asia' ? 15 : (d.startMode === 'london' ? 540 : (d.startMode === 'nyopen' ? 930 : (d.startMode === 'ny' ? 870 : 120 + Math.floor(u * 1150))));
      qs.push({ d: days[k], m: m });
    }
    return (deckCache[d.id] = qs);
  }
  function qidOf(k) { return S.deck.id + '-' + k; }
  function qDone(k) { var id = qidOf(k); return S.trades.some(function (t) { return t.qid === id; }) || S.skips.some(function (t) { return t.qid === id; }); }
  function skipDone() { var n = deckQs(S.deck).length, moved = false; while (S.deck.idx < n && qDone(S.deck.idx)) { S.deck.idx++; moved = true; } if (moved) upsert('decks', S.deck); }
  var SM_CN = { weighted: '\u6309\u65f6\u6bb5\u6743\u91cd', random: '\u5b8c\u5168\u968f\u673a\u65f6\u523b', asia: '\u4e9a\u6d32\u5f00\u76d8 18:15 ET', london: '\u4f26\u6566 03:00 ET', ny: '\u7f8e\u56fd\u6570\u636e 08:30 ET', nyopen: '\u7f8e\u80a1\u5f00\u76d8 09:30 ET' };
  function loadQ() {
    if (!S.idx || !S.deck) return Promise.resolve();
    var qs = deckQs(S.deck);
    if (S.deck.idx >= qs.length) { newDeck(false); qs = deckQs(S.deck); toast('\u8fd9\u5957\u9898\u5df2\u505a\u5b8c\uff0c\u81ea\u52a8\u5207\u6362\u4e00\u5957\u65b0\u9898\u5e93', 3000); }
    var k = S.deck.idx, qq = qs[k], d = qq.d, i = S.idx.days.indexOf(d), list = S.idx.days.slice(Math.max(0, i - CTX_DAYS), i + 1);
    var months = []; list.forEach(function (x) { var ym = x.slice(0, 7); if (months.indexOf(ym) < 0) months.push(ym); });
    S.loading = true; stopPlay(); setPickOrder(false); closeSheets();
    var seq = (S.loadSeq = (S.loadSeq || 0) + 1), deck = S.deck;
    $('hDay').textContent = '\u7b2c ' + (k + 1) + ' \u9898\u52a0\u8f7d\u4e2d\u2026';
    return Promise.all(months.map(loadBundle)).then(function () {
      if (seq !== S.loadSeq || deck !== S.deck) return;
      build(list); S.date = d; S.dayNo++;
      var B = S.B, j = S.S0; while (j < B.n - 1 && B.m[j + 1] < qq.m) j++;
      S.cur = Math.max(S.S0, Math.min(j, B.n - 3));
      S.pos = null; S.order = null; S.pairs = []; S.tradeMarks = [];
      S.q = { id: deck.id + '-' + k, no: k + 1, size: qs.length, traded: false };
      S.drill = { id: 'd' + Date.now().toString(36), cond: CFG.experiment ? (Math.random() < 0.5 ? 'on' : 'off') : 'manual' };
      aggReset(); renderAll();
      S.loading = false;
      if (S.pendingSync) { S.pendingSync = false; setTimeout(afterSync, 0); }
      if (S.drill.cond !== 'manual') toast('\u672c\u9898\u5b9e\u9a8c\u7ec4\uff1aKillzones ' + (S.drill.cond === 'on' ? '\u5f00' : '\u5173'));
    }).catch(function (e) { if (seq !== S.loadSeq) return; S.loading = false; $('hDay').textContent = '\u6570\u636e\u52a0\u8f7d\u5931\u8d25\uff1a' + e.message; });
  }
  function hypo(side) {
    var B = S.B, j = S.cur + 1; if (j >= B.n) return null;
    var b = bracket(), p = mkPos(side, { base: B.o[j], slip: CFG.slip, mid: false }, j, { sl: b.sl > 0 ? b.sl : b.E, tp: 0, type: 'mkt' }, b.E, false);
    p.timeExit = true; exitCheck(p, j, true);
    for (var k = j + 1; !p.closed && k < B.n; k++) exitCheck(p, k, false);
    return p.closed ? +p.R1.toFixed(4) : null;
  }
  function recordSkip() {
    var B = S.B, j = S.cur, m = B.m[j], E = eAt(B.m[Math.min(j + 1, B.n - 1)]), hi = -1e9, lo = 1e9;
    for (var k = j + 1; k < B.n && B.m[k] < m + 61; k++) { if (B.h[k] > hi) hi = B.h[k]; if (B.l[k] < lo) lo = B.l[k]; }
    var rec = { id: uid('s'), at: new Date().toISOString(), mode: CFG.mode, qid: S.q.id, qno: S.q.no, deck: S.deck.id, acct: S.acct.id, day: S.date, hidden: !!CFG.hide,
      clock: clockOf(m), m: m, session: sessOf(m), tf: CFG.tf, E: +(E * tick).toFixed(2),
      upE: hi > -1e9 ? +((hi - B.c[j]) / E).toFixed(2) : null, dnE: lo < 1e9 ? +((B.c[j] - lo) / E).toFixed(2) : null,
      longR: hypo(1), shortR: hypo(-1), sess: S.sess ? S.sess.id : null, v: 1 };
    upsert('skips', rec); return rec;
  }
  function nextQuestion() {
    if (S.loading || !S.idx || !S.deck) return;
    var busy = inPos() || !!S.order;
    var go = function () {
      var sk = S.B && S.q && !S.q.traded ? recordSkip() : null;
      if (S.B) endDrill();
      S.deck.idx++; upsert('decks', S.deck); skipDone();
      loadQ().then(function () {
        if (sk && sk.longR != null) toast('\u4e0a\u9898\u5df2\u8df3\u8fc7\uff1a\u540e60\u5206\u6700\u591a\u6da8 ' + fmt(sk.upE, 1) + 'E\u3001\u8dcc ' + fmt(sk.dnE, 1) + 'E\uff1b\u505a\u591a ' + fmt(sk.longR, 2) + 'R\uff0c\u505a\u7a7a ' + fmt(sk.shortR, 2) + 'R', 4600);
      });
    };
    if (busy) ask('\u5f53\u524d\u6709\u6301\u4ed3\u6216\u6302\u5355\u3002\u6309\u73b0\u4ef7\u5e73\u4ed3/\u64a4\u5355\u5e76\u8fdb\u5165\u4e0b\u4e00\u9898\uff1f', go); else go();
  }

  // ---------------- replay ----------------
  function step(k, whilePlaying) {
    if (!S.B) return;
    var from = Math.max(0, S.A.key.length - 1);
    for (var i = 0; i < k; i++) {
      if (S.cur >= S.B.n - 1) { stopPlay(); endDrill(); drawTradeLines(); toast('\u672c\u9898\u884c\u60c5\u7ed3\u675f\uff0c\u70b9\u201c\u4e0b\u4e00\u9898\u201d\u7ee7\u7eed', 3000); break; }
      S.cur++; aggAdd(S.cur); onNewBar(S.cur);
      if (whilePlaying && !S.playing) break;
    }
    renderStep(from);
  }
  function play() {
    if (S.playing) { stopPlay(); return; }
    S.playing = true; $('bPlay').textContent = '\u6682\u505c'; $('bPlay').classList.add('playing');
    var t0 = performance.now(), done = 0, sp = +CFG.speed || 3;
    S.timer = setInterval(function () {
      var due = Math.floor((performance.now() - t0 + 8) * sp / 1000) - done;
      if (due <= 0) return;
      if (due > 10) { done += due - 10; due = 10; }
      done += due; step(due, true);
    }, Math.max(30, 1000 / sp));
  }
  function ffToClose() {
    if (!inPos()) return;
    stopPlay(); S.playing = true; $('bPlay').textContent = '\u6682\u505c'; $('bPlay').classList.add('playing');
    S.timer = setInterval(function () { step(3); if (!inPos()) stopPlay(); }, 25);
  }
  function stopPlay() { S.playing = false; clearInterval(S.timer); $('bPlay').textContent = '\u64ad\u653e'; $('bPlay').classList.remove('playing'); }

  // ---------------- position command strip & tags ----------------
  var TAGS = ['\u987a\u52bf', '\u9006\u52bf', '\u7a81\u7834', 'ORB', '\u533a\u95f4', '\u56de\u8c03', '\u76f4\u89c9', 'KZ', 'OB', 'FVG'];
  function canPyramid() {
    var p = S.pos; if (!inPos() || !isOpen()) return false;
    var n = Math.min(tkQty(), S.acct.maxQty - p.qty - pendAdds(p)); if (n <= 0) return false;
    var ns = keepRiskStop(p, n, S.B.c[S.cur] + p.side * CFG.slip); return p.side * (S.B.c[S.cur] - ns) > 0;
  }
  function renderTools() {
    var desk = deskMQ.matches, el = desk ? $('pTools') : $('tags'), other = desk ? $('tags') : $('pTools');
    other.innerHTML = ''; if (desk) $('tags').style.display = 'none';
    el.innerHTML = '';
    var p = S.pos, btn = function (txt, f, c, dis) { var b = document.createElement('button'); b.textContent = txt; if (c) b.className = c; b.disabled = !!dis; b.onclick = f; el.appendChild(b); return b; };
    if (!inPos()) {
      if (!desk) {
        if (isOpen() && S.acct) {
          var lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = '\u624b\u6570'; el.appendChild(lab);
          var qs = [1, 2, 3, 5, 10].filter(function (v) { return v <= S.acct.maxQty; });
          if (qs.indexOf(S.acct.maxQty) < 0) qs.push(S.acct.maxQty);
          qs.forEach(function (qq) { btn(String(qq), function () { CFG.tkQty = qq; save('nqkt_cfg', CFG); renderTools(); if (S.B) renderHeader(); }, 'qty' + (qq === tkQty() ? ' on' : '')); });
        }
        btn(S.pickOrder ? '\u9000\u51fa\u70b9\u9009' : '\u56fe\u4e0a\u6302\u5355', function () { setPickOrder(!S.pickOrder); renderTools(); }, S.pickOrder ? 'on' : 'ff');
        btn('SL:' + (CFG.slPts != null ? CFG.slPts + '\u70b9' : (CFG.stopMult > 0 ? CFG.stopMult + 'E' : '\u65e0')), function () {
          var seq = [0.5, 1, 1.5, 2, 0], idx = seq.indexOf(+CFG.stopMult);
          CFG.slPts = null; CFG.stopMult = seq[(idx + 1) % seq.length]; save('nqkt_cfg', CFG); renderTools(); ticketUpdate();
          toast('\u9ed8\u8ba4\u6b62\u635f\u5207\u6362\u4e3a ' + (CFG.stopMult ? CFG.stopMult + 'E' : '\u4e0d\u8bbe'));
        }, 'ff');
        el.style.display = 'flex';
      } else if (S.order) {
        btn('\u64a4\u9500\u6302\u5355', closeReq, 'ff danger');
      }
      return;
    }
    if (!desk) el.style.display = 'flex';
    btn('\u23e9 \u5feb\u8fdb\u5e73\u4ed3', ffToClose, 'ff primary');
    btn('\u4fdd\u672c (E)', breakeven, 'ff');
    btn('\u5e73\u4ed3 (X)', closeReq, 'ff danger');
    btn('\u6539\u6b62\u635f\u6b62\u76c8', function () { openSheet('sheetOrder', function () { renderOrder('modify'); }); }, 'ff');
    if (isOpen()) {
      var n = Math.min(tkQty(), S.acct.maxQty - p.qty - pendAdds(p));
      btn('\u987a\u52bf\u52a0\u4ed3 +' + Math.max(n, 0), function () { queueAdd(tkQty(), true); }, 'ff up', !canPyramid());
      if (p.qty >= 2) btn('\u51cf\u534a -' + Math.floor(p.qty / 2), function () { queueReduce(Math.floor(p.qty / 2)); }, 'ff');
      btn('\u51cf\u4ed3 -' + Math.min(tkQty(), p.qty), function () { queueReduce(tkQty()); }, 'ff');
    }
    if (desk) { var dv = document.createElement('div'); dv.className = 'divider'; el.appendChild(dv); }
    TAGS.forEach(function (t) {
      var b = btn(t, function () { var k = p.tags.indexOf(t); if (k >= 0) p.tags.splice(k, 1); else p.tags.push(t); b.classList.toggle('on'); if (p.rec) { p.rec.tags = p.tags.slice(); upsert('trades', p.rec); } });
      if (p.tags.indexOf(t) >= 0) b.classList.add('on');
    });
  }

  // ---------------- chart context menu & click-to-order ----------------
  var ctx = $('ctx'), lp = null;
  function onAxis(x) {
    var w = 0; try { w = chart.priceScale(AX()).width(); } catch (e) { }
    return AX() === 'left' ? x <= w : x >= wrap.clientWidth - w;
  }
  function showCtx(x, y, fromPick) {
    if (!S.B) return;
    var other = AX() === 'left' ? '\u53f3\u4fa7' : '\u5de6\u4fa7';
    var axBtn = '<button class="ax" data-ax="1">\u4ef7\u683c\u8f74\u79fb\u5230' + other + '</button><button class="ax" data-fit="1">\u6062\u590d\u4ef7\u683c\u81ea\u52a8\u7f29\u653e</button>', h = '';
    var P = null;
    if (!fromPick && onAxis(x)) {
      h = '<div class="cap">\u4ef7\u683c\u8f74</div>' + axBtn + '<button data-s="0">\u53d6\u6d88</button>';
    } else {
      var pr = candles.coordinateToPrice(y); P = pr == null ? null : toTicks(pr);
      if (P != null && !inPos() && !S.order) {
        var tB = orderType(1, P) === 'lmt' ? '\u9650\u4ef7' : '\u7a81\u7834', tS = orderType(-1, P) === 'lmt' ? '\u9650\u4ef7' : '\u7a81\u7834', n = tkQty();
        h = '<div class="cap">\u5728 ' + fmt(px(P)) + ' \u6302\u5355</div>' +
          '<button class="b" data-s="1">\u4e70\u5165\u6302\u5355 \u00d7' + n + ' @ ' + fmt(px(P)) + ' (' + tB + ')</button>' +
          '<button class="s" data-s="-1">\u5356\u51fa\u6302\u5355 \u00d7' + n + ' @ ' + fmt(px(P)) + ' (' + tS + ')</button><hr>';
      }
      if (!fromPick) h += axBtn;
      h += '<button data-s="0">\u53d6\u6d88</button>';
    }
    ctx.innerHTML = h;
    var w = wrap.clientWidth, hh = wrap.clientHeight;
    ctx.style.left = Math.max(6, Math.min(x, w - 250)) + 'px';
    ctx.style.top = Math.max(6, Math.min(y, hh - 180)) + 'px';
    ctx.style.display = 'block';
    Array.prototype.forEach.call(ctx.querySelectorAll('button'), function (b) {
      b.onclick = function (e) {
        e.stopPropagation(); ctx.style.display = 'none';
        if (b.dataset.ax) { setAxis(AX() === 'left' ? 'right' : 'left'); return; }
        if (b.dataset.fit) { resetScales(); toast('\u5df2\u6062\u590d\u81ea\u52a8\u7f29\u653e'); return; }
        var sd = +b.dataset.s;
        if (sd && P != null) pending(sd, P);
        else if (fromPick) setPickOrder(false);
      };
    });
  }
  wrap.addEventListener('contextmenu', function (e) { e.preventDefault(); var r = wrap.getBoundingClientRect(); showCtx(e.clientX - r.left, e.clientY - r.top, false); });
  wrap.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('#ctx')) return;
    ctx.style.display = 'none';
    if (e.pointerType !== 'touch' || drag || S.pickOrder) return;
    var r = wrap.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    clearTimeout(lp && lp.t); lp = { x: x0, y: y0, t: setTimeout(function () { if (lp && !drag) showCtx(x0 - r.left, y0 - r.top, false); lp = null; }, 550) };
  });
  wrap.addEventListener('pointermove', function (e) { if (lp && (Math.abs(e.clientX - lp.x) > 8 || Math.abs(e.clientY - lp.y) > 8)) { clearTimeout(lp.t); lp = null; } });
  ['pointerup', 'pointercancel'].forEach(function (t) { wrap.addEventListener(t, function () { if (lp) { clearTimeout(lp.t); lp = null; } }); });

  // ---------------- layout: desktop toolbar + right dock, mobile bottom docks ----------------
  var deskMQ = window.matchMedia('(min-width: 900px)');
  function applyLayout() {
    var desk = deskMQ.matches, rep = $('tbReplay'), navT = $('tbNav'), ctl = $('ctl'), nav = $('nav');
    var NAV = ['nNew', 'nRound', 'nStats', 'nFind', 'nSet', 'nExit'];
    if (desk) {
      ['bNext1', 'bNext5', 'bPlay'].forEach(function (id) { var b = $(id); b.className = 'repbtn' + (id === 'bPlay' && S.playing ? ' playing' : ''); rep.appendChild(b); });
      NAV.forEach(function (id) { navT.appendChild($(id)); });
    } else {
      ['bPlay', 'bNext5', 'bNext1'].forEach(function (id) { var b = $(id); b.className = 'btn c-ghost'; ctl.insertBefore(b, ctl.firstChild); });
      NAV.forEach(function (id) { nav.appendChild($(id)); });
    }
    renderTicket($('sTicket'), false); renderTools();
  }
  if (deskMQ.addEventListener) deskMQ.addEventListener('change', applyLayout); else if (deskMQ.addListener) deskMQ.addListener(applyLayout);

  // ---------------- stats ----------------
  function mstats(a) {
    var n = a.length; if (!n) return { n: 0 };
    var mu = a.reduce(function (s, x) { return s + x; }, 0) / n;
    var sd = n > 1 ? Math.sqrt(a.reduce(function (s, x) { return s + (x - mu) * (x - mu); }, 0) / (n - 1)) : 0;
    var se = n > 1 ? sd / Math.sqrt(n) : NaN;
    return { n: n, mean: mu, sd: sd, se: se, lo: mu - 1.96 * se, hi: mu + 1.96 * se, t: se > 0 ? mu / se : NaN };
  }
  function cls(x) { return x > 0 ? 'good' : (x < 0 ? 'bad' : ''); }
  function sorted(mode) { return S.trades.filter(function (t) { return !mode || modeOf(t) === mode; }).sort(function (a, b) { return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0); }); }
  function summ(a) {
    var R = a.map(function (t) { return t.R; }), w = R.filter(function (x) { return x > 0; }), l = R.filter(function (x) { return x <= 0; });
    var dv = a.filter(function (t) { return t.dv != null; }).map(function (t) { return t.dv; });
    var sum = R.reduce(function (s, x) { return s + x; }, 0), money = a.reduce(function (s, t) { return s + (t.usd || 0); }, 0);
    var aw = w.length ? w.reduce(function (s, x) { return s + x; }, 0) / w.length : null, al = l.length ? l.reduce(function (s, x) { return s + x; }, 0) / l.length : null;
    return { n: a.length, win: a.length ? a.filter(function (t) { return t.usd > 0; }).length / a.length : NaN, sum: sum, usd: money, mean: a.length ? sum / a.length : NaN,
      aw: aw, al: al, pf: (aw != null && al != null && al < 0) ? aw / -al : null, dv: dv.length ? dv.reduce(function (s, x) { return s + x; }, 0) / dv.length : null, dvN: dv.length,
      best: R.length ? Math.max.apply(null, R) : null, worst: R.length ? Math.min.apply(null, R) : null };
  }
  function rounds(mode) { var T = sorted(mode), out = []; for (var i = 0; i < T.length; i += ROUND) out.push(T.slice(i, i + ROUND)); return out; }
  function renderRoundNav() {
    var T = sorted(CFG.mode), n = T.length, k = n && n % ROUND === 0 ? ROUND : n % ROUND, cur = T.slice(n - k), pips = '';
    for (var i = 0; i < ROUND; i++) pips += '<i class="' + (i < cur.length ? (cur[i].usd > 0 ? 'w' : 'l') : '') + '"></i>';
    $('nRound').innerHTML = '\u672c\u8f6e ' + k + '/' + ROUND + '<span class="pips">' + pips + '</span>';
  }
  function rowOf(label, s) {
    return '<tr><td>' + label + '</td><td>' + s.n + '</td><td>' + fmt(s.win * 100, 0) + '%</td><td class="' + cls(s.usd) + '">' + usd(s.usd) + '</td><td class="' + cls(s.mean) + '">' + fmt(s.mean, 2) + '</td><td class="' + cls(s.dv) + '">' + (s.dv == null ? '-' : fmt(s.dv, 2)) + '</td></tr>';
  }
  var ROW_HEAD = '<tr><th></th><th>\u7b14\u6570</th><th>\u80dc\u7387</th><th>\u76c8\u4e8f</th><th>\u5e73\u5747 R</th><th>\u65b9\u5411\u4ef7\u503c</th></tr>';
  function modeSwitch(el, render) {
    var vm = S.viewMode || CFG.mode;
    var h = '<div class="seg">' + ['fixed', 'open'].map(function (m) { return '<button data-vm="' + m + '" class="' + (m === vm ? 'on' : '') + '">' + MODE_CN[m] + '</button>'; }).join('') + '</div>';
    return { html: h, wire: function () { Array.prototype.forEach.call(el.querySelectorAll('[data-vm]'), function (b) { b.onclick = function () { S.viewMode = b.dataset.vm; render(); }; }); } };
  }
  function openRound() { S.viewMode = CFG.mode; openSheet('sheetRound', function () { renderRound(false); }); }
  function sessBlock() {
    if (!S.sess) return '';
    var x = sessSummary(S.sess.id, S.sess.mode, S.sess.at), m = S.sess.mode;
    return '<div class="sessbox"><div class="t">\u672c\u6bb5\u8fdb\u884c\u4e2d \u00b7 ' + MODE_CN[m] + ' \u00b7 ' + localHM(S.sess.at) + ' \u5f00\u59cb</div>' +
      '<div class="v">' + x.q + ' \u9898 \u00b7 ' + x.n + ' \u7b14 \u00b7 \u8df3\u8fc7 ' + x.skips + ' \u00b7 <span class="' + cls(x.usd) + '">' + (x.n ? sUsd(x.usd) : '$0') + '</span>' + (x.n ? ' \u00b7 ' + fmt(x.sum, 2) + 'R' : '') + '</div></div>' +
      '<div class="btnrow"><button class="exit" id="exitMode">\u9000\u51fa' + MODE_CN[m] + '\u5e76\u56de\u9996\u9875\u7ed3\u7b97</button></div>';
  }
  function wireExit() { var b = $('exitMode'); if (b) b.onclick = function () { exitMode(false); }; }
  function renderRound(justFinished) {
    var el = $('sheetRound'), vm = S.viewMode || CFG.mode, rs = rounds(vm), h, sw = modeSwitch(el, function () { renderRound(false); });
    if (!rs.length) {
      el.innerHTML = '<h3>\u672c\u8f6e \u00b7 \u6bcf 10 \u7b14\u7ed3\u7b97<button class="x" data-close>\u00d7</button></h3>' + sessBlock() + sw.html + '<p class="note">' + MODE_CN[vm] + '\u6682\u65e0\u4ea4\u6613\u3002\u6bcf\u5e73\u4ed3 10 \u7b14\u4f1a\u81ea\u52a8\u5f39\u51fa\u672c\u8f6e\u7ed3\u7b97\u3002</p>';
      el.querySelector('[data-close]').onclick = closeSheets; sw.wire(); wireExit(); return;
    }
    var last = rs[rs.length - 1], full = last.length === ROUND, no = rs.length, s = summ(last);
    var prevFull = rs.filter(function (r) { return r.length === ROUND; }), prev = full ? prevFull[prevFull.length - 2] : prevFull[prevFull.length - 1];
    var ps = prev ? summ(prev) : null, all = summ([].concat.apply([], rs));
    h = '<h3>' + MODE_CN[vm] + ' \u00b7 ' + (full ? ('\u7b2c ' + no + ' \u8f6e\u7ed3\u7b97') : ('\u7b2c ' + no + ' \u8f6e (' + last.length + '/' + ROUND + ')')) + '<button class="x" data-close>\u00d7</button></h3>' + (justFinished ? '' : sessBlock()) + sw.html;
    h += '<div class="sqs">';
    for (var i = 0; i < ROUND; i++) { var t = last[i]; h += t ? '<div class="' + (t.usd > 0 ? 'w' : 'l') + '">' + fmt(t.R, 1) + '</div>' : '<div class="e">' + (i + 1) + '</div>'; }
    h += '</div>';
    h += '<div class="kpi"><div><span>\u672c\u8f6e\u80dc\u7387</span><strong>' + fmt(s.win * 100, 0) + '%</strong></div>' +
      '<div><span>\u672c\u8f6e\u76c8\u4e8f</span><strong class="' + cls(s.usd) + '">' + usd(s.usd) + '</strong></div>' +
      '<div><span>\u672c\u8f6e\u603b R</span><strong class="' + cls(s.sum) + '">' + fmt(s.sum, 2) + '</strong></div>' +
      '<div><span>\u76c8\u4e8f\u6bd4</span><strong>' + (s.pf == null ? '-' : fmt(s.pf, 2)) + '</strong></div>' +
      '<div><span>\u65b9\u5411\u4ef7\u503c</span><strong class="' + cls(s.dv) + '">' + (s.dv == null ? '-' : fmt(s.dv, 3)) + '</strong></div>' +
      '<div><span>\u6700\u597d/\u6700\u5dee R</span><strong>' + fmt(s.best, 1) + ' / ' + fmt(s.worst, 1) + '</strong></div></div>';
    h += '<table>' + ROW_HEAD + rowOf('\u672c\u8f6e', s) + (ps ? rowOf('\u4e0a\u4e00\u8f6e', ps) : '') + rowOf('\u5168\u90e8\u7d2f\u8ba1', all) + '</table>';
    h += '<p class="note" style="margin-top:8px">\u63d0\u793a\uff1a10 \u7b14\u4ee5\u5185\u968f\u673a\u6ce2\u52a8\u5f88\u5927\uff0c\u957f\u671f\u65b9\u5411\u4ef7\u503c (DV) \u4e0e\u7d2f\u8ba1\u591a\u8f6e\u5747\u503c\u624d\u66f4\u5177\u53c2\u8003\u610f\u4e49\u3002</p>';
    h += '<div class="btnrow"><button class="main" id="roundGo">' + (justFinished ? '\u7ee7\u7eed\u4e0b\u4e00\u8f6e' : '\u5173\u95ed') + '</button></div>';
    el.innerHTML = h; el.querySelector('[data-close]').onclick = closeSheets; sw.wire(); wireExit();
    $('roundGo').onclick = function () { closeSheets(); if (justFinished && CFG.autoNext && !inPos() && !S.order) nextQuestion(); };
  }
  function groupRows(list, keyFn, labelFn) {
    var g = {}; list.forEach(function (t) { var k = keyFn(t); (g[k] = g[k] || []).push(t); });
    return Object.keys(g).sort().map(function (k) { return rowOf(labelFn ? labelFn(k) : k, summ(g[k])); }).join('');
  }
  function renderStats() {
    var el = $('sheetStats'), vm = S.viewMode || CFG.mode, T = sorted(vm), sw = modeSwitch(el, renderStats);
    var R = mstats(T.map(function (t) { return t.R; })), done = T.filter(function (t) { return t.dv != null; });
    var DV = mstats(done.map(function (t) { return t.dv; })), CO = mstats(done.map(function (t) { return t.coin; })), all = summ(T);
    var man = T.filter(function (t) { return t.reason === 'manual'; }), manR = mstats(man.map(function (t) { return t.R; }));
    var h = '<h3>\u4ea4\u6613\u7edf\u8ba1 \u00b7 ' + MODE_CN[vm] + ' \u00b7 ' + escH(curProfile() ? curProfile().name : '') + '<button class="x" data-close>\u00d7</button></h3>' + sw.html;
    h += '<div class="kpi"><div><span>\u7b14\u6570</span><strong>' + T.length + '</strong></div><div><span>\u80dc\u7387</span><strong>' + fmt(all.win * 100, 0) + '%</strong></div>' +
      '<div><span>\u7d2f\u8ba1\u76c8\u4e8f</span><strong class="' + cls(all.usd) + '">' + usd(all.usd) + '</strong></div>' +
      '<div><span>\u5e73\u5747 R</span><strong class="' + cls(R.mean) + '">' + fmt(R.mean, 3) + '</strong></div>' +
      '<div><span>\u76c8\u4e8f\u6bd4</span><strong>' + (all.pf == null ? '-' : fmt(all.pf, 2)) + '</strong></div>' +
      '<div><span>\u65b9\u5411\u4ef7\u503c</span><strong class="' + cls(DV.mean) + '">' + fmt(DV.mean, 3) + '</strong></div>' +
      '<div><span>\u5747\u8d62 / \u5747\u4e8f</span><strong>' + fmt(all.aw, 2) + ' / ' + fmt(all.al, 2) + '</strong></div>' +
      '<div><span>\u624b\u52a8\u5e73\u4ed3 R</span><strong class="' + cls(manR.mean) + '">' + (manR.n ? fmt(manR.mean, 2) : '-') + '</strong></div>' +
      '<div><span>\u629b\u786c\u5e01\u57fa\u51c6</span><strong class="' + cls(CO.mean) + '">' + fmt(CO.mean, 3) + '</strong></div></div>';
    if (all.aw != null && all.al != null) h += '<p class="note">\u6309\u5f53\u524d\u5747\u8d62 ' + fmt(all.aw, 2) + 'R\u3001\u5747\u4e8f ' + fmt(all.al, 2) + 'R\uff0c\u4fdd\u672c\u80dc\u7387\u95e8\u69db\u7ea6 <b>' + fmt(-all.al / (all.aw - all.al) * 100, 0) + '%</b>\u3002</p>';
    h += '<p class="note">\u65b9\u5411\u4ef7\u503c = (\u9996\u624b R \u2212 \u53cd\u5411\u5f71\u5b50\u5355 R) \u00f7 2\u3002' + (DV.n > 1 ? '\u5f53\u524d 95% \u533a\u95f4 [' + fmt(DV.lo, 3) + ', ' + fmt(DV.hi, 3) + ']\uff0ct = ' + fmt(DV.t, 2) + '\u3002' : '') + '\u533a\u95f4\u6574\u4f53\u5927\u4e8e 0 \u8bf4\u660e\u62e9\u65f6\u65b9\u5411\u663e\u8457\u4f18\u4e8e\u968f\u673a\u3002</p>';
    h += '<div class="btnrow"><button id="goAcct">\u8d26\u6237\u4e0e\u5386\u53f2\u8d26\u6237</button></div>';
    var SK = S.skips.filter(function (x) { return modeOf(x) === vm && x.longR != null; }), tq = {};
    T.forEach(function (t) { if (t.qid) tq[t.qid] = 1; });
    var nT = Object.keys(tq).length, nS = S.skips.filter(function (x) { return modeOf(x) === vm; }).length;
    if (nS) {
      var avg = function (f) { return SK.length ? SK.reduce(function (a, x) { return a + f(x); }, 0) / SK.length : null; };
      var big = SK.filter(function (x) { return Math.max(x.upE || 0, x.dnE || 0) >= 2; }).length;
      h += '<h4>\u8df3\u8fc7\uff08\u7a7a\u4ed3\uff09\u53cd\u4e8b\u5b9e\u68c0\u9a8c</h4><table><tr><th>\u6307\u6807</th><th>\u6570\u503c</th></tr>' +
        '<tr><td>\u8df3\u8fc7\u9898\u6570 / \u603b\u9898\u6570</td><td>' + nS + ' / ' + (nS + nT) + ' (\u8df3\u8fc7\u7387 ' + fmt(nS / Math.max(1, nS + nT) * 100, 0) + '%)</td></tr>' +
        '<tr><td>\u82e5\u505a\u591a\u5e73\u5747\u7ed3\u679c</td><td class="' + cls(avg(function (x) { return x.longR; })) + '">' + fmt(avg(function (x) { return x.longR; }), 3) + ' R</td></tr>' +
        '<tr><td>\u82e5\u505a\u7a7a\u5e73\u5747\u7ed3\u679c</td><td class="' + cls(avg(function (x) { return x.shortR; })) + '">' + fmt(avg(function (x) { return x.shortR; }), 3) + ' R</td></tr>' +
        '<tr><td>\u968f\u673a\u65b9\u5411\u5e73\u5747</td><td class="' + cls(avg(function (x) { return (x.longR + x.shortR) / 2; })) + '">' + fmt(avg(function (x) { return (x.longR + x.shortR) / 2; }), 3) + ' R</td></tr>' +
        '<tr><td>\u9519\u8fc7\u5927\u884c\u60c5 (60\u5206 \u22652E)</td><td>' + big + ' \u6b21</td></tr></table>';
    }
    var rs = rounds(vm).filter(function (r) { return r.length === ROUND; });
    if (rs.length) h += '<h4>\u6bcf 10 \u7b14\u7ed3\u7b97</h4><table>' + ROW_HEAD + rs.map(function (r, k) { return rowOf('\u7b2c ' + (k + 1) + ' \u8f6e', summ(r)); }).reverse().slice(0, 30).join('') + '</table>';
    var exp = done.filter(function (t) { return t.cond === 'on' || t.cond === 'off'; });
    if (exp.length) {
      var on = exp.filter(function (t) { return t.cond === 'on'; }), off = exp.filter(function (t) { return t.cond === 'off'; });
      var a = mstats(on.map(function (t) { return t.R; })), b = mstats(off.map(function (t) { return t.R; }));
      var diff = (a.mean || 0) - (b.mean || 0), se = Math.sqrt((a.se || 0) * (a.se || 0) + (b.se || 0) * (b.se || 0));
      h += '<h4>Killzones \u5b9e\u9a8c\u5bf9\u7167</h4><table>' + ROW_HEAD + rowOf('KZ \u5f00', summ(on)) + rowOf('KZ \u5173', summ(off)) + '</table>' +
        '<p class="note">\u5e73\u5747 R \u5dee (\u5f00 \u2212 \u5173) = ' + fmt(diff, 3) + '\uff0c95% \u533a\u95f4 [' + fmt(diff - 1.96 * se, 3) + ', ' + fmt(diff + 1.96 * se, 3) + ']\u3002</p>';
    }
    if (T.length) {
      if (vm === 'open') {
        h += '<h4>\u6309\u6700\u5927\u6301\u4ed3\u624b\u6570</h4><table>' + ROW_HEAD + groupRows(T, function (t) { return ('0' + (t.qtyMax || t.qty || 1)).slice(-2); }, function (k) { return (+k) + ' \u624b'; }) + '</table>';
        var ad = T.filter(function (t) { return t.adds > 0; });
        h += '<h4>\u52a0\u4ed3\u8868\u73b0</h4><table>' + ROW_HEAD + rowOf('\u6709\u52a0\u4ed3', summ(ad)) + rowOf('\u672a\u52a0\u4ed3', summ(T.filter(function (t) { return !t.adds; }))) +
          rowOf('\u6d6e\u76c8\u52a0\u4ed3', summ(T.filter(function (t) { return t.addsWin > 0; }))) + rowOf('\u6d6e\u4e8f\u52a0\u4ed3', summ(T.filter(function (t) { return t.addsLose > 0; }))) + '</table>';
      }
      var wid = T.reduce(function (s, t) { return s + (t.widen || 0); }, 0);
      if (wid) h += '<p class="note warn-c">\u6ce8\u610f\uff1a\u5171\u5c06\u6b62\u635f\u5411\u4e8f\u635f\u65b9\u5411\u62c9\u5bbd\u8fc7 ' + wid + ' \u6b21\u3002</p>';
      h += '<h4>\u6309\u4ea4\u6613\u65f6\u6bb5</h4><table>' + ROW_HEAD + groupRows(T, function (t) { return t.session; }, function (k) { return SESS_CN[k] || k; }) + '</table>';
      h += '<h4>\u6309\u5f00\u4ed3\u5468\u671f</h4><table>' + ROW_HEAD + groupRows(T, function (t) { return ('00' + t.tf).slice(-3); }, function (k) { return TF_CN[+k] || k; }) + '</table>';
      h += '<h4>\u6309\u4e0b\u5355\u65b9\u5f0f</h4><table>' + ROW_HEAD + groupRows(T, function (t) { return t.orderType || 'mkt'; }, function (k) { return { mkt: '\u5e02\u4ef7', lmt: '\u9650\u4ef7', stp: '\u7a81\u7834' }[k] || k; }) + '</table>';
      var tagged = []; T.forEach(function (t) { (t.tags && t.tags.length ? t.tags : ['(\u65e0\u6807\u7b7e)']).forEach(function (g) { tagged.push(Object.assign({}, t, { _tag: g })); }); });
      h += '<h4>\u6309\u5f62\u6001\u6807\u7b7e</h4><table>' + ROW_HEAD + groupRows(tagged, function (t) { return t._tag; }) + '</table>';
      h += '<h4>\u6309\u51fa\u573a\u539f\u56e0</h4><table>' + ROW_HEAD + groupRows(T, function (t) { return t.reason; }, function (k) { return REASON_CN[k] || k; }) + '</table>';
      h += '<h4>\u6700\u8fd1 30 \u7b14</h4><table><tr><th>\u65f6\u95f4</th><th>\u65b9\u5411</th><th>\u76c8\u4e8f</th><th>R</th><th>\u51fa\u573a</th></tr>' + T.slice(-30).reverse().map(function (t) {
        return '<tr><td>' + (t.hidden ? '' : t.day + ' ') + (t.m != null && t.day ? zoneClock(t.m, t.day) : t.clock) + '</td><td>' + (t.side > 0 ? '\u591a' : '\u7a7a') + (t.qty ? '\u00d7' + (t.qtyMax || t.qty) : '') + '</td><td class="' + cls(t.usd) + '">' + usd(t.usd) + '</td><td class="' + cls(t.R) + '">' + fmt(t.R, 2) + '</td><td>' + (REASON_CN[t.reason] || t.reason) + '</td></tr>';
      }).join('') + '</table>';
    }
    h += '<h4>\u6570\u636e\u5907\u4efd\u4e0e\u5bfc\u5165</h4><div class="btnrow"><button id="cpCsv">\u590d\u5236 CSV</button><button id="cpJson">\u590d\u5236 JSON</button><button id="impBtn">\u5bfc\u5165 JSON</button><button id="clrBtn">\u6e05\u7a7a\u672c\u673a\u7f13\u5b58</button></div>' +
      '<textarea id="impTxt" placeholder="\u7c98\u8d34\u4e4b\u524d\u5907\u4efd\u7684 NQ JSON\uff0c\u7136\u540e\u70b9\u51fb\u201c\u5bfc\u5165 JSON\u201d"></textarea>';
    el.innerHTML = h;
    el.querySelector('[data-close]').onclick = closeSheets; sw.wire();
    $('goAcct').onclick = function () { openSheet('sheetAcct', function () { renderAcct(false); }); };
    $('cpCsv').onclick = function () { copy(toCsv(sorted()), 'CSV'); };
    $('cpJson').onclick = function () { copy(JSON.stringify({ app: 'nqkt', trades: sorted().map(clean), accounts: S.accts.map(clean), skips: S.skips.map(clean), decks: S.decks.map(clean) }), 'JSON'); };
    $('impBtn').onclick = function () {
      try {
        var x = JSON.parse($('impTxt').value), tr = Array.isArray(x) ? x : (x.trades || []), ac = Array.isArray(x) ? [] : (x.accounts || []);
        var stamp = function (t) { t.av = JOURNAL_VER; t.pf = PF; return t; };
        ac.forEach(function (a) { if (a && a.id && !S.accts.some(function (y) { return y.id === a.id; })) upsert('accounts', stamp(a)); });
        (Array.isArray(x) ? [] : (x.skips || [])).forEach(function (t) { if (t && t.id) upsert('skips', stamp(t)); });
        (Array.isArray(x) ? [] : (x.decks || [])).forEach(function (t) { if (t && t.id && !S.decks.some(function (y) { return y.id === t.id; })) upsert('decks', stamp(t)); });
        tr.forEach(function (t) { if (t && t.id) upsert('trades', stamp(t)); }); toast('\u5df2\u5bfc\u5165 ' + tr.length + ' \u7b14');
      } catch (e) { toast('\u5bfc\u5165\u5931\u8d25\uff1aJSON \u683c\u5f0f\u65e0\u6548'); }
    };
    $('clrBtn').onclick = function () {
      ask('\u6e05\u7a7a\u672c\u673a\u6d4f\u89c8\u5668\u4e2d\u7684\u5f53\u524d NQ \u6863\u6848\u7f13\u5b58\uff1f', function () {
        try { ['nqkt_trades', 'nqkt_accounts', 'nqkt_skips', 'nqkt_decks'].forEach(function (k) { localStorage.removeItem(lk(k)); }); } catch (e) { }
        if (S.store === 'local') { S.trades = []; S.accts = []; S.skips = []; S.decks = []; newAccount(false); newDeck(false); loadQ(); }
        renderStats(); renderRoundNav();
      });
    };
  }
  function toCsv(T) {
    var cols = ['id','at','mode','acct','day','clock','session','side','qty0','qtyMax','adds','reduces','contract','tf','orderType','cond','kz','sl0','tp0','timeExit','E','riskPts','entry','exit','usd','R','R1','reason','holdMin','flipR','dv','coin','widen','tags'];
    return [cols.join(',')].concat(T.map(function (t) { return cols.map(function (c) { var v = t[c]; if (Array.isArray(v)) v = v.join('|'); return v == null ? '' : String(v).replace(/,/g, ';'); }).join(','); })).join('\n');
  }
  function copy(text, what) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('\u5df2\u590d\u5236 ' + what); }, function () { fallbackCopy(text, what); });
    else fallbackCopy(text, what);
  }
  function fallbackCopy(text, what) { var ta = $('impTxt'); ta.value = text; ta.select(); try { document.execCommand('copy'); toast('\u5df2\u590d\u5236 ' + what); } catch (e) { toast('\u8bf7\u624b\u52a8\u590d\u5236\u6587\u672c\u6846\u5185\u5bb9'); } }

  // ---------------- settings, findings, shortcuts ----------------
  function renderSettings() {
    var el = $('sheetSet'), m = CFG.mode, c = CFG[m];
    function sel(id, label, opts, val) { return '<label>' + label + '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>'; }
    function chk(id, label, val) { return '<label>' + label + '<input type="checkbox" id="' + id + '"' + (val ? ' checked' : '') + '></label>'; }
    function num(id, label, val, step) { return '<label>' + label + '<input type="number" id="' + id + '" min="0" step="' + (step || 1) + '" value="' + val + '"></label>'; }
    var years = []; for (var y = 2018; y <= 2026; y++) years.push([y, y]);
    var h = '<h3>\u8bbe\u7f6e<button class="x" data-close>\u00d7</button></h3>';
    h += '<h4>' + MODE_CN[m] + ' \u8d26\u6237\u53c2\u6570\uff08\u5f00\u65b0\u8d26\u6237\u65f6\u751f\u6548\uff09</h4>';
    h += num('aStart', '\u521d\u59cb\u8d44\u91d1 (\u7f8e\u5143)', c.acctStart, 1000) + num('aLoss', '\u6700\u5927\u4e8f\u635f / \u7206\u4ed3\u8ddd\u79bb (\u7f8e\u5143)', c.maxLoss, 100);
    h += chk('aTrail', '\u7206\u4ed3\u7ebf\u968f\u5e73\u4ed3\u6700\u9ad8\u4f59\u989d\u4e0a\u79fb\uff08\u6700\u9ad8\u9501\u81f3\u521d\u59cb\u8d44\u91d1\uff09', c.trail) + num('aTgt', '\u76c8\u5229\u76ee\u6807 (\u7f8e\u5143\uff0c0 = \u4e0d\u8bbe)', c.target, 100);
    h += sel('sCt', '\u4ea4\u6613\u5408\u7ea6', [['MNQ', '\u5fae\u578b MNQ (\u6bcf\u70b9 $2 \u00b7 \u6bcf\u8df3 $0.50)'], ['NQ', '\u6807\u51c6 NQ (\u6bcf\u70b9 $20 \u00b7 \u6bcf\u8df3 $5.00)']], c.contract);
    h += m === 'open' ? num('aMaxQ', '\u6700\u591a\u6301\u4ed3\u624b\u6570', c.maxQty, 1) : num('aQty', '\u56fa\u5b9a\u624b\u6570', c.qty, 1);
    h += '<div class="btnrow"><button id="aNew">\u6309\u4ee5\u4e0a\u53c2\u6570\u5f00\u65b0\u8d26\u6237</button></div>';
    h += '<h4>\u6b62\u635f\u6b62\u76c8\u4e0e\u6210\u4ea4\u6a21\u62df</h4>';
    h += sel('sStop', '\u9ed8\u8ba4\u6b62\u635f (\u00d7 \u9884\u671f60\u5206\u632f\u5e45 E)', [[0, '\u4e0d\u8bbe'], [0.5, '0.5 E'], [1, '1 E (\u63a8\u8350\u57fa\u51c6)'], [1.5, '1.5 E'], [2, '2 E'], [3, '3 E']], CFG.stopMult);
    h += sel('sTpR', '\u9ed8\u8ba4\u6b62\u76c8 (\u6309\u6b62\u635f\u8ddd\u79bb\u500d\u6570 R)', [[0, '\u4e0d\u8bbe'], [1, '1 R'], [1.5, '1.5 R'], [2, '2 R'], [3, '3 R']], CFG.tpR);
    h += chk('sTime', '60 \u5206\u949f\u81ea\u52a8\u5e73\u4ed3\uff08\u7814\u7a76\u53e3\u5f84\uff09', CFG.timeExit);
    h += sel('sSlip', '\u6ed1\u70b9 (\u8df3\uff0c\u6bcf\u8df3 0.25 \u70b9)', [[0, '0 \u8df3'], [1, '1 \u8df3 (0.25 \u70b9\uff0c\u63a8\u8350)'], [2, '2 \u8df3 (0.50 \u70b9)'], [4, '4 \u8df3 (1.00 \u70b9\uff0c\u4e25\u82db)']], CFG.slip);
    var dq = S.deck && S.idx ? deckQs(S.deck).length : 0, rm = S.deck && S.idx ? deckDays(S.deck).removed : 0;
    h += '<h4>\u9898\u5e93\u62bd\u6837</h4>';
    h += '<p class="note">\u5f53\u524d\u9898\u5e93\uff1a\u7b2c ' + (S.deck ? S.deck.idx + 1 : '-') + ' / ' + dq + ' \u9898\uff1b\u5e74\u4efd ' + (S.deck ? S.deck.yearFrom + '\u2013' + S.deck.yearTo : '-') + (S.deck && S.deck.noNews ? '\uff0c\u5df2\u6392\u9664 ' + rm + ' \u4e2a\u65b0\u95fb\u65e5' : '\uff0c\u542b\u65b0\u95fb\u65e5') + '\u3002</p>';
    h += sel('sStart', '\u5f00\u9898\u65f6\u523b\uff08\u65b0\u9898\u5e93\uff09', [['weighted', '\u6309\u65f6\u6bb5\u6743\u91cd'], ['random', '\u5b8c\u5168\u968f\u673a\u65f6\u523b'], ['asia', '\u56fa\u5b9a\uff1a\u4e9a\u6d32\u5f00\u76d8 18:15 ET'], ['london', '\u56fa\u5b9a\uff1a\u4f26\u6566 03:00 ET'], ['ny', '\u56fa\u5b9a\uff1a\u7f8e\u56fd\u6570\u636e 08:30 ET'], ['nyopen', '\u56fa\u5b9a\uff1a\u7f8e\u80a1\u5f00\u76d8 09:30 ET (ORB \u63a8\u8350)']], CFG.startMode);
    var wsum = wOf(CFG.sessW.asia) + wOf(CFG.sessW.london) + wOf(CFG.sessW.ny);
    h += num('wAsia', '\u4e9a\u76d8\u6743\u91cd (' + winTxt('asia') + ')', wOf(CFG.sessW.asia), 1) + num('wEu', '\u6b27\u76d8\u6743\u91cd (' + winTxt('london') + ')', wOf(CFG.sessW.london), 1) + num('wNy', '\u7ebd\u7ea6\u6743\u91cd (' + winTxt('ny') + ')', wOf(CFG.sessW.ny), 1);
    h += '<p class="note" id="wNote">\u5f53\u524d\u6743\u91cd\u5408\u8ba1 ' + wsum + '\uff0c\u6539\u5b8c\u8bf7\u70b9\u4e0b\u65b9\u6309\u94ae\u751f\u6210\u65b0\u9898\u5e93\u751f\u6548\u3002</p>';
    h += sel('sY0', '\u8d77\u59cb\u5e74\u4efd', years, CFG.yearFrom) + sel('sY1', '\u7ed3\u675f\u5e74\u4efd', years, CFG.yearTo);
    h += chk('sNews', '\u6392\u9664\u65b0\u95fb\u65e5\uff1aFOMC / \u975e\u519c / CPI', CFG.noNews);
    h += '<div class="btnrow"><button id="dNew">\u6309\u4e0a\u9762\u8bbe\u7f6e\u751f\u6210\u65b0\u9898\u5e93</button></div>';
    h += '<h4>ICT Killzones \u4e0e\u56fe\u8868\u53e0\u52a0</h4>';
    h += chk('kOn', '\u663e\u793a Killzones (15 \u5206\u949f\u53ca\u4ee5\u4e0b\u5468\u671f)', CFG.kz.on);
    h += sel('kTz', 'Killzones \u8ba1\u65f6', [['utc5', 'UTC-5 \u56fa\u5b9a (\u4e0e LuxAlgo \u539f\u7248\u4e00\u81f4)'], ['ny', '\u7ebd\u7ea6\u672c\u5730\u65f6\u95f4 (\u968f\u590f\u4ee4\u65f6\u8c03\u6574)']], CFG.kz.tz);
    h += chk('kBox', '\u65f6\u6bb5\u6846', CFG.kz.boxes) + chk('kLine', '\u65f6\u6bb5\u9ad8\u4f4e\u7ebf', CFG.kz.lines) + chk('kExt', '\u9ad8\u4f4e\u7ebf\u5411\u53f3\u5ef6\u4f38\u81f3\u88ab\u89e6\u53ca', CFG.kz.extend) + chk('kMean', '\u65f6\u6bb5\u4e2d\u7ebf', CFG.kz.mean);
    h += chk('kLab', '\u65f6\u6bb5\u540d\u79f0', CFG.kz.labels) + chk('kOb', 'Order Blocks (\u6bcf\u65f6\u6bb5\u9996\u4e2a)', CFG.kz.ob) + chk('kFvg', 'Fair Value Gaps (\u6bcf\u65f6\u6bb5\u9996\u4e2a)', CFG.kz.fvg);
    h += chk('sPdhl', '\u524d\u4e00\u65e5\u9ad8\u4f4e\u70b9\u4e0e\u524d\u6536 (PDH / PDL / PC)', CFG.pdhl);
    h += '<h4>\u663e\u793a\u4e0e\u7ec3\u4e60\u504f\u597d</h4>';
    h += sel('sTz', '\u65f6\u95f4\u663e\u793a\u65f6\u533a', [['bj', '\u5317\u4eac\u65f6\u95f4 (UTC+8)'], ['ny', '\u7f8e\u4e1c\u65f6\u95f4 (\u7ebd\u7ea6\u542b\u590f\u4ee4\u65f6)'], ['utc', 'UTC'], ['ldn', '\u4f26\u6566\u65f6\u95f4 (\u542b\u590f\u4ee4\u65f6)']], CFG.tz);
    h += chk('sHide', '\u76f2\u6d4b\u6a21\u5f0f\uff1a\u9690\u85cf\u771f\u5b9e\u65e5\u671f\u5e76\u5e73\u79fb\u4ef7\u683c', CFG.hide);
    h += chk('sEma', 'EMA 30 / 60 / 70 / 80 / 200', CFG.ema);
    h += chk('sBoll', '\u5e03\u6797\u5e26 BOLL', CFG.boll);
    h += num('sBollN', 'BOLL \u5468\u671f', bollN(), 1) + num('sBollK', 'BOLL \u6807\u51c6\u5dee\u500d\u6570', bollK(), 0.1);
    h += chk('sMacd', 'MACD (12, 26, 9) \u526f\u56fe', CFG.macd);
    h += sel('sSpeed', '\u64ad\u653e\u901f\u5ea6 (1\u5206\u949f K\u7ebf / \u79d2)', SPEEDS.map(function (v) { return [v, v + 'x']; }), CFG.speed);
    h += sel('sAxis', '\u4ef7\u683c\u8f74\u4f4d\u7f6e', [['right', '\u53f3\u4fa7'], ['left', '\u5de6\u4fa7']], AX());
    h += chk('sAuto', '\u5e73\u4ed3\u540e\u81ea\u52a8\u8fdb\u5165\u4e0b\u4e00\u9898', CFG.autoNext);
    h += chk('sExp', '\u5b9e\u9a8c\u6a21\u5f0f\uff1a\u6bcf\u9898\u968f\u673a\u5f00/\u5173 Killzones', CFG.experiment);
    el.innerHTML = h;
    el.querySelector('[data-close]').onclick = closeSheets;
    $('dNew').onclick = function () { el.onchange(); ask('\u751f\u6210\u4e00\u5957\u65b0\u9898\u5e93\u5e76\u4ece\u7b2c 1 \u9898\u5f00\u59cb\uff1f\uff08\u5df2\u6709\u4ea4\u6613\u8bb0\u5f55\u5168\u90e8\u4fdd\u7559\uff09', function () { if (S.B) endDrill(); newDeck(false); loadQ(); toast('\u65b0\u9898\u5e93\u5df2\u751f\u6210'); }); };
    $('aNew').onclick = function () { el.onchange(); var st = acctState(); ask('\u6309\u65b0\u53c2\u6570\u5f00\u4e00\u4e2a\u65b0' + MODE_CN[CFG.mode] + '\u8d26\u6237\uff1f\u5f53\u524d\u8d26\u6237\uff08\u4f59\u989d ' + usd(st.bal) + '\uff09\u4f1a\u4fdd\u7559\u5728\u5386\u53f2\u91cc\u3002', function () { newAccount(false); renderSettings(); renderTicket($('sTicket'), false); toast('\u65b0\u8d26\u6237\u5df2\u5f00\u542f'); }); };
    el.onchange = function () {
      var cc = CFG[CFG.mode];
      cc.acctStart = Math.max(100, +$('aStart').value || 50000); cc.maxLoss = Math.max(10, +$('aLoss').value || 2000); cc.trail = $('aTrail').checked;
      cc.target = Math.max(0, +$('aTgt').value || 0); cc.contract = CT[$('sCt').value] ? $('sCt').value : 'MNQ';
      if (CFG.mode === 'open') cc.maxQty = Math.max(1, Math.round(+$('aMaxQ').value || 10)); else cc.qty = Math.max(1, Math.round(+$('aQty').value || 3));
      CFG.stopMult = +$('sStop').value; CFG.tpR = +$('sTpR').value; CFG.slPts = null; CFG.tpPts = null;
      CFG.timeExit = $('sTime').checked; CFG.slip = +$('sSlip').value;
      CFG.startMode = $('sStart').value; CFG.yearFrom = +$('sY0').value; CFG.yearTo = +$('sY1').value; CFG.noNews = $('sNews').checked;
      CFG.sessW = { asia: wOf($('wAsia').value), london: wOf($('wEu').value), ny: wOf($('wNy').value) };
      $('wNote').textContent = '\u5f53\u524d\u6743\u91cd\u5408\u8ba1 ' + (CFG.sessW.asia + CFG.sessW.london + CFG.sessW.ny) + '\uff0c\u70b9\u4e0b\u65b9\u6309\u94ae\u751f\u6210\u65b0\u9898\u5e93\u751f\u6548\u3002';
      CFG.kz = { on: $('kOn').checked, tz: $('kTz').value, boxes: $('kBox').checked, lines: $('kLine').checked, extend: $('kExt').checked, mean: $('kMean').checked, labels: $('kLab').checked, ob: $('kOb').checked, fvg: $('kFvg').checked };
      CFG.pdhl = $('sPdhl').checked; CFG.hide = $('sHide').checked; CFG.ema = $('sEma').checked; CFG.macd = $('sMacd').checked; CFG.speed = +$('sSpeed').value;
      CFG.boll = $('sBoll').checked; CFG.bollN = Math.max(2, Math.min(200, Math.round(+$('sBollN').value) || 20)); CFG.bollK = (+$('sBollK').value > 0 && +$('sBollK').value <= 10) ? +$('sBollK').value : 2;
      if (S.B && S.A && (S.A.bN !== bollN() || S.A.bK !== bollK())) aggReset();
      CFG.autoNext = $('sAuto').checked; CFG.experiment = $('sExp').checked;
      if ($('sAxis').value !== AX()) setAxis($('sAxis').value);
      var tzNew = $('sTz').value, tzChanged = tzNew !== CFG.tz; CFG.tz = tzNew;
      if (tzChanged) setTimeout(function () { var sc = el.scrollTop; renderSettings(); el.scrollTop = sc; toast('\u5df2\u5207\u6362\u4e3a' + TZ_CN[CFG.tz] + '\u65f6\u95f4'); }, 0);
      save('nqkt_cfg', CFG); if (S.B) { renderAll(); renderTicket($('sTicket'), false); } else ensureMacd(); renderTfBar(); if (S.playing) { stopPlay(); play(); }
    };
  }
  function renderFindings() {
    var el = $('sheetFind');
    el.innerHTML = '<h3>\u4f7f\u7528\u63d0\u793a\u4e0e NQ \u6570\u636e\u7279\u5f81<button class="x" data-close>\u00d7</button></h3>' +
      '<h4>01 \u00b7 \u5b9e\u8bc1\u6570\u636e\u7279\u5f81\uff08\u57fa\u4e8e\u672c\u673a 2018-10 \u81f3 2026-11 \u5171 2,083 \u4e2a\u4ea4\u6613\u65e5 NQ 1m \u6570\u636e\uff09</h4><ul class="note">' +
      '<li><b>\u65e5\u5185\u6ce2\u52a8\u7387\u5cf0\u503c\u6bd4 6.21 \u500d</b>\uff1a60 \u5206\u949f\u9884\u671f\u632f\u5e45\u6700\u9ad8\u51fa\u73b0\u5728\u7f8e\u80a1\u73b0\u8d27\u5f00\u76d8\u7a97\u53e3\uff08<b>09:30 ET\uff0c\u4e2d\u4f4d\u6570 117.2 \u70b9</b>\uff09\uff0c\u6700\u4f4e\u5728\u4e9a\u76d8\u5c3e\u58f0\uff08<b>23:30 ET\uff0c\u4e2d\u4f4d\u6570 18.9 \u70b9</b>\uff09\u3002</li>' +
      '<li><b>\u8de8\u5e74\u4efd\u70b9\u503c\u4e2d\u67a2\u6f02\u79fb\uff08\u4e3a\u4f55\u5fc5\u987b\u7528 1E \u52a8\u6001\u6b62\u635f\uff09</b>\uff1a\u968f\u7740\u7eb3\u6307\u4ece ~7,000 \u70b9\u5347\u81f3 26,000+ \u70b9\uff0c\u7ebd\u7ea6\u76d8 60 \u5206\u949f\u5e38\u89c4\u632f\u5e45\u5df2\u4ece 2019 \u5e74\u7684 <b>24.7 \u70b9</b>\u62ac\u5347\u81f3 2026 \u5e74\u7684 <b>111.2 \u70b9</b>\uff08\u4e9a\u76d8 11.1\u219260.0 \u70b9\uff0c\u6b27\u76d8 14.0\u219273.6 \u70b9\uff09\u3002\u56fa\u5b9a\u70b9\u6570\u6b62\u635f\u4f1a\u4e25\u91cd\u5931\u771f\uff0c\u6309 E \u500d\u6570\u52a8\u6001\u6b62\u635f\u66f4\u79d1\u5b66\u3002</li>' +
      '<li><b>\u5b8f\u89c2\u65b0\u95fb\u65e5\u653e\u5927\u6548\u5e94</b>\uff1a\u76f8\u5bf9\u5e38\u89c4\u4ea4\u6613\u65e5\uff0c\u7ebd\u7ea6\u65f6\u6bb5\u632f\u5e45\u5728 <b>FOMC \u65e5\u653e\u5927 1.31 \u500d</b>\u3001<b>\u975e\u519c\u65e5\u653e\u5927 1.26 \u500d</b>\u3001<b>CPI \u65e5\u653e\u5927 1.23 \u500d</b>\uff08\u9898\u5e93\u9ed8\u8ba4\u5df2\u5254\u9664\u8fd9\u4e9b\u65e5\u5b50\uff09\u3002</li>' +
      '<li><b>MNQ \u4e0e NQ \u6210\u672c\u95e8\u69db</b>\uff1a1E \u6b62\u635f + 1 \u8df3\u53cc\u8fb9\u6ed1\u70b9 + \u624b\u7eed\u8d39\u4e0b\uff0cMNQ \u5355\u7b14\u6469\u64e6\u6210\u672c\u7ea6\u5360 <b>0.013R\uff08\u7ebd\u7ea6\uff09\u20130.035R\uff08\u4e9a\u76d8\uff09</b>\uff0c\u6807\u51c6 NQ \u7ea6 <b>0.010R\u20130.025R</b>\uff1b\u4f46 2026 \u5e74 1 \u624b\u6807\u51c6 NQ \u7684\u7ebd\u7ea6\u76d8 1E \u6b62\u635f\u9ad8\u8fbe ~$2,200\uff0c\u6781\u6613\u4e00\u7b14\u6253\u7a7f $2,000 \u8003\u6838\u7ebf\uff0c\u56e0\u6b64\u9ed8\u8ba4\u91c7\u7528 MNQ\u3002</li></ul>' +
      '<h4>02 \u00b7 \u65b0\u589e\u6613\u7528\u4ea4\u4e92</h4><ul class="note">' +
      '<li><b>\u4e00\u952e\u6b62\u635f/\u6b62\u76c8\u9884\u8bbe\u82af\u7247</b>\uff1a\u53f3\u4fa7\u4e0b\u5355\u9762\u677f\u53ef\u76f4\u63a5\u70b9\u9009 0.5E\u20132E \u6b62\u635f\u30011R\u20133R \u6b62\u76c8\u548c\u5e38\u7528\u624b\u6570\uff0c\u5b9e\u65f6\u663e\u793a\u5355\u7b14\u7f8e\u5143\u98ce\u9669\u4e0e\u7206\u4ed3\u4f59\u91cf\u5360\u6bd4\u3002</li>' +
      '<li><b>\u56fe\u4e0a\u70b9\u9009\u6302\u5355 (G)</b>\uff1a\u70b9\u51fb\u201c\u56fe\u4e0a\u70b9\u9009\u6302\u5355\u201d\u540e\uff0c\u5728\u56fe\u8868\u4efb\u610f\u4ef7\u4f4d\u5de6\u952e\u5355\u51fb/\u624b\u6307\u8f7b\u70b9\uff0c\u5373\u53ef\u76f4\u63a5\u9009\u62e9\u9650\u4ef7\u6216\u7a81\u7834\u6302\u5355\uff0c\u65e0\u9700\u53f3\u952e\u6216\u957f\u6309\u3002</li>' +
      '<li><b>\u524d\u9ad8\u524d\u4f4e\u53e0\u52a0 (PDH/L)</b>\uff1a\u9876\u90e8\u65b0\u589e PDH/L \u5f00\u5173\uff0c\u53ef\u76f4\u63a5\u5728\u56fe\u8868\u663e\u793a\u524d\u4e00\u65e5\u6700\u9ad8\u4ef7\u3001\u6700\u4f4e\u4ef7\u4e0e\u6536\u76d8\u4ef7\u53c2\u8003\u7ebf\uff0c\u65b9\u4fbf\u7ec3\u4e60 ICT \u4e0e ORB \u7a81\u7834\u3002</li>' +
      '<li><b>\u7f8e\u80a1\u5f00\u76d8\u4e13\u9879\u7ec3\u4e60</b>\uff1a\u5728\u201c\u8bbe\u7f6e \u2192 \u9898\u5e93\u62bd\u6837\u201d\u4e2d\u53ef\u5c06\u5f00\u9898\u65f6\u523b\u6539\u4e3a\u201c\u56fa\u5b9a\uff1a\u7f8e\u80a1\u5f00\u76d8 09:30 ET\u201d\uff0c\u4e13\u7ec3\u5f00\u76d8\u533a\u95f4\u7a81\u7834\uff08ORB\uff09\u3002</li></ul>' +
      '<h4>03 \u00b7 \u6570\u636e\u9694\u79bb\u4e0e\u79bb\u7ebf\u4f7f\u7528</h4><p class="note">\u672c\u7a0b\u5e8f\u6240\u6709\u672c\u5730\u7f13\u5b58\u4e0e Service Worker \u5747\u4f7f\u7528\u72ec\u7acb\u7684 <code>nqkt_*</code> \u547d\u540d\u7a7a\u95f4\uff0c\u5373\u4f7f\u4e0e\u9ec4\u91d1\u7248 <code>gold-trainer</code> \u540c\u65f6\u6258\u7ba1\u5728\u540c\u4e00\u4e2a GitHub Pages \u57df\u540d\u4e0b\u4e5f\u5b8c\u5168\u4e92\u4e0d\u5e72\u6270\u3002\u66f4\u65b0\u7a0b\u5e8f\u540e\u6240\u6709\u7ec3\u4e60\u6863\u6848\u6c38\u4e45\u4fdd\u7559\u3002</p>';
    el.querySelector('[data-close]').onclick = closeSheets;
  }
  function renderKeys() {
    var el = $('sheetKeys');
    var list = [
      ['\u4e0b\u4e00\u6839 1m K\u7ebf', '\u2192'], ['\u524d\u8fdb 5 \u6839', 'Shift + \u2192'], ['\u524d\u8fdb 15 \u6839', '\u2193'], ['\u64ad\u653e / \u6682\u505c', 'P / Space'],
      ['\u5e02\u4ef7\u4e70\u5165 / \u52a0\u51cf\u4ed3', 'B'], ['\u5e02\u4ef7\u5356\u51fa / \u52a0\u51cf\u4ed3', 'S'], ['\u56fe\u4e0a\u70b9\u9009\u6302\u5355\u6a21\u5f0f', 'G'], ['\u6253\u5f00\u6302\u5355\u9762\u677f', 'O'],
      ['\u6b62\u635f\u79fb\u81f3\u4fdd\u672c', 'E'], ['\u5e02\u4ef7\u5e73\u4ed3 / \u64a4\u5355', 'X'], ['\u5feb\u8fdb\u5230\u5e73\u4ed3', 'F'], ['\u8df3\u8fc7 / \u4e0b\u4e00\u9898', 'N'],
      ['\u5207\u6362 1m\u20134h \u5468\u671f', '1 \u2013 8'], ['\u5faa\u73af\u5207\u6362\u5468\u671f', 'T'], ['\u5173\u95ed\u5f39\u7a97 / \u9000\u51fa\u70b9\u9009', 'Esc'], ['\u9996\u9875\u8fdb\u7eaa\u5f8b/\u5b9e\u6218', '1 / 2']
    ];
    el.innerHTML = '<h3>\u952e\u76d8\u5feb\u6377\u952e\u901f\u67e5<button class="x" data-close>\u00d7</button></h3><div class="kgrid">' +
      list.map(function (x) { return '<div class="kitem"><span>' + x[0] + '</span><kbd>' + x[1] + '</kbd></div>'; }).join('') + '</div>';
    el.querySelector('[data-close]').onclick = closeSheets;
  }

  var SHEETS = ['sheetSet', 'sheetStats', 'sheetFind', 'sheetRound', 'sheetOrder', 'sheetAcct', 'sheetKeys'];
  function openSheet(id, render) {
    setPickOrder(false);
    SHEETS.forEach(function (k) { if (k !== id) { $(k).style.display = 'none'; $(k).classList.remove('show'); } });
    render(); var el = $(id); el.style.display = 'block'; $('mask').style.display = 'block';
    requestAnimationFrame(function () { el.classList.add('show'); $('mask').classList.add('show'); });
  }
  function closeSheets() {
    renderOrder.modify = false;
    SHEETS.forEach(function (k) { $(k).style.display = 'none'; $(k).classList.remove('show'); });
    $('mask').style.display = 'none'; $('mask').classList.remove('show');
  }

  // ---------------- wiring ----------------
  function openTicket() { if (!canTrade()) return; openSheet('sheetOrder', function () { renderOrder(); }); }
  $('bNext1').onclick = function () { step(1); };
  $('bNext5').onclick = function () { step(5); };
  $('bPlay').onclick = play;
  $('bSell').onclick = function () { tradeClick(-1); };
  $('bBuy').onclick = function () { tradeClick(1); };
  $('bAct').onclick = function () { if (S.order || inPos()) closeReq(); else openTicket(); };
  $('sAcctBtn').onclick = function () { openSheet('sheetAcct', function () { renderAcct(false); }); };
  $('nNew').onclick = function () { nextQuestion(); };
  $('nExit').onclick = function () { exitMode(false); };
  $('nRound').onclick = openRound;
  $('nStats').onclick = function () { refreshServer(); S.viewMode = CFG.mode; openSheet('sheetStats', renderStats); };
  $('nFind').onclick = function () { openSheet('sheetFind', renderFindings); };
  $('nSet').onclick = function () { openSheet('sheetSet', renderSettings); };
  $('hAcct').onclick = function () { openSheet('sheetAcct', function () { renderAcct(false); }); };
  $('pickCancel').onclick = function () { setPickOrder(false); renderTools(); };
  $('mask').onclick = closeSheets;

  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    var k = e.key;
    if (S.intro) {
      if ($('mask').style.display === 'block') { if (k === 'Escape') closeSheets(); return; }
      if (k === '1') enterMode('fixed'); else if (k === '2') enterMode('open'); else if (k === 'Enter' && S.sess) enterMode(S.sess.mode);
      return;
    }
    if (k === 'Escape') { if (S.pickOrder) { setPickOrder(false); renderTools(); } else closeSheets(); return; }
    if (k === '?' || (k === '/' && e.shiftKey)) { openSheet('sheetKeys', renderKeys); return; }
    if (k === 'ArrowRight') { step(e.shiftKey ? 5 : 1); e.preventDefault(); }
    else if (k === 'ArrowDown') { step(15); e.preventDefault(); }
    else if (k === 'b' || k === 'B') tradeClick(1);
    else if (k === 's' || k === 'S') tradeClick(-1);
    else if (k === 'g' || k === 'G') { if (!inPos() && !S.order) { setPickOrder(!S.pickOrder); renderTools(); } }
    else if (k === 'o' || k === 'O') openTicket();
    else if (k === 'e' || k === 'E') breakeven();
    else if (k === 'x' || k === 'X') closeReq();
    else if (k === 'f' || k === 'F') ffToClose();
    else if (k === 'p' || k === 'P' || k === ' ') { play(); e.preventDefault(); }
    else if (k === 'n' || k === 'N') nextQuestion();
    else if (k >= '1' && k <= String(TFS.length)) setTf(TFS[+k - 1]);
    else if (k === 't' || k === 'T') setTf(TFS[(TFS.indexOf(+CFG.tf) + 1) % TFS.length]);
  });

  window.__nqkt = S;
  window.__nqktApi = {
    placeOrder: placeOrder, acctState: acctState, toTicks: toTicks, px: px, newAccount: newAccount,
    CFG: CFG, CT: CT, bracket: bracket, enter: function (m) { enterMode(m, true); }, exit: function () { exitMode(true); },
    step: step, market: market, pending: pending, breakeven: breakeven, closeReq: closeReq,
    setPickOrder: setPickOrder, setAxis: setAxis, deckQs: function () { return deckQs(S.deck); },
    pf: function () { return PF; }, profile: curProfile, stopUsd: function () { return inPos() ? stopUsd(S.pos) : null; }
  };

  document.body.className = 'game m-' + CFG.mode;
  initStore();
  renderTfBar(); applyLayout(); showIntro();
  loadScript('data/nq/index.js').then(function () {
    if (!S.idx) throw new Error('index missing');
    $('hDay').textContent = '\u5171 ' + S.idx.days.length + ' \u4e2a NQ \u4ea4\u6613\u65e5 (' + S.idx.first + ' \u81f3 ' + S.idx.last + ')';
    introDirty();
    skipDone(); loadQ().then(introDirty);
  }).catch(function (e) { $('hDay').textContent = 'NQ \u6570\u636e\u52a0\u8f7d\u5931\u8d25\uff1a' + e.message; });
})();
