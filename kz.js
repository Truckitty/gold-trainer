/* Killzones module for the gold K-line trainer.
   Port of "ICT Killzones Toolkit [LuxAlgo]" (Pine Script v5, (c) LuxAlgo) - killzones, order blocks and fair value
   gaps with the original default settings. The original is licensed CC BY-NC-SA 4.0
   (https://creativecommons.org/licenses/by-nc-sa/4.0/); this derivative module is shared under the same license,
   non-commercial use only. Breaker blocks, market structure shifts and day/week/month open lines (all off by default
   in the original) are not ported.

   KZ.compute(bars, opts) works on the candles of the current timeframe, bar by bar like Pine, and returns the drawing
   objects as they look on the last candle: boxes {q1,q2,top,bot,fill,text,textColor}, lines {q1,q2,y,color,dotted},
   labels {q,y,text,color}. q = candle index; prices are in the caller's units (ticks).
   bars = {n, o, h, l, c, minute(q) -> minute of day in the killzone time zone}. */
(function () {
  'use strict';
  var SITES = [                                 // Pine call order: NY AM, London, NY PM, Asian
    { name: 'New York AM', s: 510, e: 660, color: '#ff5d00' },
    { name: 'London', s: 120, e: 300, color: '#00bcd4' },
    { name: 'New York PM', s: 810, e: 960, color: '#2157f3' },
    { name: 'Asian', s: 1200, e: 1440, color: '#e91e63' }
  ];
  var DEF = { boxes: true, lines: true, mean: false, extend: true, labels: true, ob: true, obLen: 5, obFirst: true,
    obRemove: true, obExtend: true, fvg: true, fvgTh: 1.2, fvgRemove: true, fvgExtend: true, fvgFirst: true };
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  function compute(bars, opts) {
    var o = {}, k; for (k in DEF) o[k] = DEF[k]; for (k in (opts || {})) o[k] = opts[k];
    var n = bars.n, O = bars.o, H = bars.h, L = bars.l, C = bars.c;
    var boxes = [], lines = [], labels = [];
    // ---- killzones (literal port: one state per call site, one shared KZ object for lines and label) ----
    var shared = { lnT: null, lnB: null, lnM: null, lb: null };
    var st = SITES.map(function () { return { max: NaN, min: NaN, sbQ: 0, xt: false, xb: false, area: null, prev: false }; });
    var site = new Int8Array(n), NS = SITES.length;          // killzones never overlap: one site index (or -1) per candle
    for (var q = 0; q < n; q++) {
      var m = bars.minute(q), w = -1;
      for (var z = 0; z < NS; z++) if (m >= SITES[z].s && m < SITES[z].e) { w = z; break; }
      site[q] = w;
    }
    // ---- swings / order blocks state ----
    var LN = o.obLen, os = 0, top = { y: NaN, i: NaN, x: false }, btm = { y: NaN, i: NaN, x: false };
    var sbI = 0, xb = false, xa = false, bOB = [], aOB = [];
    // ---- fair value gaps state ----
    var fxb = false, fxa = false, bF = [], aF = [], trSum = 0, atr = NaN;

    for (q = 0; q < n; q++) {
      var s = site[q] >= 0, sPrev = q > 0 ? site[q - 1] >= 0 : false;
      // killzones
      for (var j = 0; j < SITES.length; j++) {
        var S = SITES[j], t = st[j], on = site[q] === j;
        if (on && !t.prev) {
          t.max = H[q]; t.sbQ = q; t.min = L[q];
          t.area = { q1: q, q2: q, top: t.max, bot: t.min, fill: rgba(S.color, 0.1), kind: 'kz' };
          if (o.boxes) boxes.push(t.area);
          if (o.lines) {
            shared.lnT = { q1: q, q2: q, y: t.max, color: S.color }; shared.lnB = { q1: q, q2: q, y: t.min, color: S.color };
            lines.push(shared.lnT, shared.lnB);
          }
          if (o.mean) { shared.lnM = { q1: q, q2: q, y: (t.max + t.min) / 2, color: S.color, dotted: true }; lines.push(shared.lnM); }
          if (o.labels) { shared.lb = { q: q, y: t.max, text: S.name, color: S.color }; labels.push(shared.lb); }
        }
        if (on) {
          t.max = Math.max(H[q], t.max); t.min = Math.min(L[q], t.min); t.xt = true; t.xb = true;
          t.area.top = t.max; t.area.q2 = q; t.area.bot = t.min;
          if (o.labels && shared.lb) { shared.lb.q = (q + t.sbQ) / 2; shared.lb.y = t.max; }
          if (o.lines && shared.lnT) { shared.lnT.y = t.max; shared.lnT.q2 = q; shared.lnB.y = t.min; shared.lnB.q2 = q; }
          if (o.mean && shared.lnM) { shared.lnM.y = (t.max + t.min) / 2; shared.lnM.q2 = q; }
        }
        if (!on && o.extend && !s) {
          if (o.lines && shared.lnT) {
            if (t.xt) { shared.lnT.q2 = q; if (!(H[q] < shared.lnT.y)) t.xt = false; }
            if (t.xb) { shared.lnB.q2 = q; if (!(L[q] > shared.lnB.y)) t.xb = false; }
          }
          if (o.mean && shared.lnM) shared.lnM.q2 = q;
        }
        t.prev = on;
      }
      // swings(obbLN): highest/lowest of the last LN candles incl. the current one
      if (q >= LN) {
        var up = -Infinity, lo = Infinity;
        for (var r = q - LN + 1; r <= q; r++) { if (H[r] > up) up = H[r]; if (L[r] < lo) lo = L[r]; }
        var osPrev = os;
        os = H[q - LN] > up ? 0 : (L[q - LN] < lo ? 1 : os);
        if (os === 0 && osPrev !== 0) top = { y: H[q - LN], i: q - LN, x: false };
        if (os === 1 && osPrev !== 1) btm = { y: L[q - LN], i: q - LN, x: false };
      }
      // order blocks (pOBB with the original defaults: OB on, BB off, closing-price mitigation, show first, remove mitigated, extend)
      if (o.ob) {
        if (s && !sPrev) { sbI = q; xb = true; xa = true; if (o.obExtend) { bOB = []; aOB = []; } }
        if (s && q >= 1) {
          if (C[q - 1] > top.y && !top.x && top.i >= sbI) {
            top.x = true;
            var mi = H[q - 1], ma = L[q - 1], sb = q - 1;          // original starts from swapped values; the first loop step fixes them
            pineFor(1, (q - top.i) - 1, function (i) { mi = Math.min(L[q - i], mi); if (mi === L[q - i]) { ma = H[q - i]; sb = q - i; } });
            bOB.unshift({ top: ma, btm: mi, obI: sb, box: { q1: sb, q2: q, top: ma, bot: mi, fill: 'rgba(33,87,243,0.2)', text: 'OB', textColor: '#2157f3', kind: 'ob', shown: false, del: false }, ext: true, bb: false });
            boxes.push(bOB[0].box);
          }
          if (C[q - 1] < btm.y && !btm.x && top.i >= sbI) {        // the original tests the swing-high index here as well
            btm.x = true;
            var mi2 = L[q - 1], ma2 = H[q - 1], sb2 = q - 1;
            pineFor(1, (q - btm.i) - 1, function (i) { ma2 = Math.max(H[q - i], ma2); if (ma2 === H[q - i]) { mi2 = L[q - i]; sb2 = q - i; } });
            aOB.unshift({ top: ma2, btm: mi2, obI: sb2, box: { q1: sb2, q2: q, top: ma2, bot: mi2, fill: 'rgba(255,93,0,0.2)', text: 'OB', textColor: '#ff5d00', kind: 'ob', shown: false, del: false }, ext: true, bb: false });
            boxes.push(aOB[0].box);
          }
        }
        if (o.obExtend || s) {
          obPass(bOB, q, function (ob) { return q >= 1 && Math.min(C[q - 1], O[q - 1]) < ob.btm; });
          obPass(aOB, q, function (ob) { return q >= 1 && Math.max(C[q - 1], O[q - 1]) > ob.top; });
        } else { bOB = []; aOB = []; }
      }
      // fair value gaps
      var tr = q === 0 ? H[q] - L[q] : Math.max(H[q] - L[q], Math.abs(H[q] - C[q - 1]), Math.abs(L[q] - C[q - 1]));
      if (q < 144) { trSum += tr; if (q === 143) atr = trSum / 144; } else atr = (atr * 143 + tr) / 144;
      if (o.fvg) {
        var thr = (isNaN(atr) ? 0 : atr) * o.fvgTh;
        if (s && !sPrev) { fxb = true; fxa = true; if (o.fvgExtend) { bF = []; aF = []; } }
        var bullG = q >= 1 && L[q] > H[q - 1], bearG = q >= 1 && H[q] < L[q - 1];
        var bullG1 = q >= 2 && L[q - 1] > H[q - 2], bearG1 = q >= 2 && H[q - 1] < L[q - 2];
        if (s && q >= 2) {
          var bull = (L[q] - H[q - 2]) > thr && L[q] > H[q - 2] && C[q - 1] > H[q - 2] && !(bullG || bullG1);
          if (bull && fxb) {
            var fb = { q1: q - 1, q2: q, top: L[q], bot: H[q - 2], fill: 'rgba(76,175,80,0.2)', text: 'FVG', textColor: '#4caf50', kind: 'fvg', del: false };
            bF.unshift({ box: fb, e: true }); boxes.push(fb);
            if (o.fvgFirst) fxb = false;
          }
          var bear = (L[q - 2] - H[q]) > thr && H[q] < L[q - 2] && C[q - 1] < L[q - 2] && !(bearG || bearG1);
          if (bear && fxa) {
            var fa = { q1: q - 1, q2: q, top: L[q - 2], bot: H[q], fill: 'rgba(244,67,54,0.2)', text: 'FVG', textColor: '#f44336', kind: 'fvg', del: false };
            aF.unshift({ box: fa, e: true }); boxes.push(fa);
            if (o.fvgFirst) fxa = false;
          }
        }
        if (o.fvgExtend || s) {
          for (var a = bF.length - 1; a >= 0; a--) { var f = bF[a]; if (f.e) { f.box.q2 = q; if (L[q] < f.box.bot) { if (o.fvgRemove) f.box.del = true; f.e = false; } } }
          for (a = aF.length - 1; a >= 0; a--) { f = aF[a]; if (f.e) { f.box.q2 = q; if (H[q] > f.box.top) { if (o.fvgRemove) f.box.del = true; f.e = false; } } }
        } else { bF = []; aF = []; }
      }
    }
    function obPass(arr, qq, mitigated) {
      for (var i = arr.length - 1; i >= 0; i--) {
        var ob = arr[i];
        if (o.obRemove && !ob.ext) ob.box.del = true;
        if (!ob.bb) {
          if (o.obFirst ? i === arr.length - 1 : true) { ob.box.q1 = ob.obI; ob.box.top = ob.top; ob.box.q2 = qq; ob.box.bot = ob.btm; ob.box.shown = true; }
          if (mitigated(ob)) { ob.bb = true; ob.box.q2 = qq - 1; ob.ext = false; }
        }
      }
    }
    return {
      boxes: boxes.filter(function (b) { return !b.del && (b.kind !== 'ob' || b.shown); }),
      lines: lines, labels: labels
    };
  }
  function pineFor(a, b, f) { var i; if (b >= a) for (i = a; i <= b; i++) f(i); else for (i = a; i >= b; i--) f(i); }

  // Lightweight Charts series primitive that draws the boxes, lines and labels behind the candles
  function Primitive() { this.d = { boxes: [], lines: [], labels: [] }; this.px = function (v) { return v; }; var self = this;
    this.view = { zOrder: function () { return 'bottom'; }, renderer: function () { return { draw: function (tg) { self.draw(tg); } }; } }; }
  Primitive.prototype.attached = function (p) { this.chart = p.chart; this.series = p.series; this.req = p.requestUpdate; };
  Primitive.prototype.detached = function () { this.chart = null; };
  Primitive.prototype.updateAllViews = function () { };
  Primitive.prototype.paneViews = function () { return [this.view]; };
  Primitive.prototype.set = function (d, px, off) { this.d = d || { boxes: [], lines: [], labels: [] }; if (px) this.px = px; this.off = off || 0; if (this.req) this.req(); };
  Primitive.prototype.draw = function (tg) {
    if (!this.chart) return;
    var ts = this.chart.timeScale(), se = this.series, d = this.d, px = this.px, off = this.off || 0;
    tg.useBitmapCoordinateSpace(function (sc) {
      var ctx = sc.context, hr = sc.horizontalPixelRatio, vr = sc.verticalPixelRatio, W = sc.bitmapSize.width;
      // logicalToCoordinate clamps indices outside the visible range, so extrapolate from two visible bars instead
      var vrg = ts.getVisibleLogicalRange(); if (!vrg) return;
      var ref = Math.max(Math.ceil(vrg.from), 0), xa = ts.logicalToCoordinate(ref), xb = ts.logicalToCoordinate(ref + 1);
      if (xa == null || xb == null || xb === xa) return;
      var bs = xb - xa, X = function (q) { return (xa + (q - off - ref) * bs) * hr; };
      var Y = function (v) { var y = se.priceToCoordinate(px(v)); return y == null ? null : y * vr; };
      ctx.save();
      ctx.font = Math.round(10 * vr) + 'px -apple-system, "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      d.boxes.forEach(function (b) {
        var x1 = X(b.q1), x2 = X(b.q2), y1 = Y(b.top), y2 = Y(b.bot);
        if (x1 == null || x2 == null || y1 == null || y2 == null || Math.max(x1, x2) < 0 || Math.min(x1, x2) > W) return;
        var x = Math.min(x1, x2), w = Math.max(Math.abs(x2 - x1), hr), y = Math.min(y1, y2), h = Math.max(Math.abs(y2 - y1), vr);
        ctx.fillStyle = b.fill; ctx.fillRect(x, y, w, h);
        if (b.text && w > 18 * hr && h > 9 * vr) { ctx.fillStyle = b.textColor; ctx.fillText(b.text, x + w / 2, y + h / 2); }
      });
      ctx.lineWidth = Math.max(1, Math.round(hr));
      d.lines.forEach(function (l) {
        var x1 = X(l.q1), x2 = X(l.q2), y = Y(l.y);
        if (x1 == null || x2 == null || y == null || Math.max(x1, x2) < 0 || Math.min(x1, x2) > W) return;
        ctx.strokeStyle = l.color; ctx.setLineDash(l.dotted ? [2 * hr, 2 * hr] : []);
        ctx.beginPath(); ctx.moveTo(x1, Math.round(y) + 0.5); ctx.lineTo(x2, Math.round(y) + 0.5); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.textBaseline = 'bottom';
      d.labels.forEach(function (lb) {
        var x = X(lb.q), y = Y(lb.y);
        if (x == null || y == null || x < -50 * hr || x > W + 50 * hr) return;
        ctx.fillStyle = lb.color; ctx.fillText(lb.text, x, y - 3 * vr);
      });
      ctx.restore();
    });
  };
  window.KZ = { compute: compute, Primitive: Primitive, SITES: SITES };
})();
