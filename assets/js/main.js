/* Heart Sound Deep Learning — page behaviour and charts (no dependencies). */
(function () {
  "use strict";

  /* ============================================================
     CONFIG — change REPO_URL if your repository has another name.
     ============================================================ */
  const REPO_URL = "https://github.com/philsaurabh/MTech_Heart_Sound_Deep_Learning";
  const BRANCH = "main";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ---------- repo links ---------- */
  $$("[data-repo]").forEach(a => (a.href = REPO_URL));
  $$("[data-repo-file]").forEach(a => (a.href = `${REPO_URL}/blob/${BRANCH}/${a.dataset.repoFile}`));

  /* ---------- theme ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem("theme"); if (t) root.dataset.theme = t; } catch (e) {}
  $("#themeToggle").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    redrawCharts();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => redrawCharts());

  /* ---------- tooltip ---------- */
  const tip = $("#tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.classList.add("show");
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + "px"; tip.style.top = Math.max(8, top) + "px";
  }
  const hideTip = () => tip.classList.remove("show");

  /* ============================================================
     Synthetic heart-sound traces (schematic, not patient data)
     ============================================================ */
  function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function burst(x, c, w, a, f) { const d = (x - c) / w; return a * Math.exp(-d * d) * Math.sin(f * (x - c)); }

  const SOUNDS = [
    { id: "normal", name: "Normal", pattern: "lub-dub · lub-dub",
      desc: "A healthy heart at 60–100 beats per minute: two clean sounds per beat, a lower, longer S1 and a shorter S2, then silence.",
      beats: [60, 260, 460, 660], s3: false, murmur: 0, noise: 0 },
    { id: "noisy", name: "Noisy normal", pattern: "lub-dub · lub-dub (+ noise)",
      desc: "Still a normal heart, but background noise blurs the waveform and makes the beats harder to pick out.",
      beats: [60, 260, 460, 660], murmur: 0, noise: 0.22 },
    { id: "murmur", name: "Murmur", pattern: "lub-***-dub",
      desc: "Turbulent blood flow adds a whooshing, rumbling sound in the gap between S1 and S2, or between S2 and the next S1.",
      beats: [60, 260, 460, 660], murmur: 0.32, noise: 0 },
    { id: "extra", name: "Extra heart sound", pattern: "lub-dub-dub",
      desc: "An additional sound, such as an extra ‘lub’ or ‘dub’, rides on an otherwise normal rhythm. It can be a sign of disease.",
      beats: [60, 260, 460, 660], s3: true, murmur: 0, noise: 0 },
    { id: "extrasystole", name: "Extrasystole", pattern: "lub-dub · lub·dub · lub-dub",
      desc: "Beats arrive out of rhythm, with one early or skipped. Usually benign, but it breaks the regular spacing that defines a normal recording.",
      beats: [60, 260, 380, 640], murmur: 0, noise: 0 },
    { id: "artifact", name: "Artifact", pattern: "~ no cardiac rhythm ~",
      desc: "Speech, music, echoes, feedback squeals or handling noise drown out the heart. No reliable S1/S2 structure survives.",
      artifact: true }
  ];

  function traceFor(s, W = 800, H = 180, seed = 7) {
    const r = rng(seed), mid = H / 2, amp = H * 0.4, pts = [];
    for (let x = 0; x <= W; x += 1) {
      let y = 0;
      if (s.artifact) {
        y = (r() - .5) * .25 + burst(x, 150, 60, .8, .9) * (r() * .6 + .4)
          + (x > 330 && x < 470 ? Math.max(-1, Math.min(1, Math.sin(x * .35) * 1.6 * (r() * .5 + .5))) : 0)
          + burst(x, 620, 35, .6, .5) + burst(x, 720, 25, .9, 1.1) * r();
      } else {
        s.beats.forEach(b => {
          y += burst(x, b, 9, 1, 1.25) + burst(x, b + 72, 6, .72, 1.6);
          if (s.s3) y += burst(x, b + 118, 6, .45, 1.1);
          if (s.murmur && x > b + 12 && x < b + 62) y += (r() - .5) * 2 * s.murmur * Math.sin(Math.PI * (x - b - 12) / 50);
        });
        if (s.noise) y += (r() - .5) * 2 * s.noise;
      }
      pts.push([x, mid - y * amp]);
    }
    return "M" + pts.map(p => p[0] + "," + p[1].toFixed(1)).join("L");
  }

  function drawSound(id) {
    const s = SOUNDS.find(d => d.id === id), svg = $("#soundSvg");
    svg.querySelectorAll(":not(title)").forEach(n => n.remove());
    if (!s.artifact) {
      const b = s.beats[0];
      el("rect", { class: "band", x: b - 22, y: 8, width: 44, height: 164, rx: 6 }, svg);
      el("rect", { class: "band", x: b + 72 - 16, y: 8, width: 32, height: 164, rx: 6 }, svg);
      el("text", { class: "blbl", x: b, y: 22 }, svg).textContent = "S1";
      el("text", { class: "blbl", x: b + 72, y: 22 }, svg).textContent = "S2";
    }
    el("path", { class: "trace", d: traceFor(s) }, svg);
    $("#soundName").textContent = s.name;
    $("#soundDesc").textContent = s.desc;
    $("#soundPattern").textContent = s.pattern;
  }
  const soundTabs = $("#soundTabs");
  SOUNDS.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "chip" + (i === 0 ? " active" : ""); b.textContent = s.name; b.setAttribute("role", "tab");
    b.addEventListener("click", () => { $$(".chip", soundTabs).forEach(x => x.classList.toggle("active", x === b)); drawSound(s.id); });
    soundTabs.appendChild(b);
  });
  drawSound("normal");

  // hero trace
  (function () {
    const pts = [];
    for (let x = 0; x <= 400; x++) {
      let y = 0;
      [40, 160, 280].forEach(b => { y += burst(x, b, 5, 1, 1.4) + burst(x, b + 40, 3.5, .7, 1.9); });
      pts.push(x + "," + (60 - y * 48).toFixed(1));
    }
    $("#heroTrace").setAttribute("d", "M" + pts.join("L"));
  })();

  /* ============================================================
     Class composition (stacked bar, HTML)
     ============================================================ */
  const CLASSES = [
    { name: "Artifact", n: 58, c: "--s1" },
    { name: "Normal (incl. extra heart sound)", n: 65, c: "--s2" },
    { name: "Murmur", n: 53, c: "--s3" }
  ];
  (function drawClasses() {
    const host = $("#classChart"), total = CLASSES.reduce((a, b) => a + b.n, 0);
    host.innerHTML = `<div class="stack-bar">${CLASSES.map(c =>
      `<div class="seg-b" style="flex:${c.n};background:var(${c.c})" data-n="${c.n}" data-name="${c.name}">${c.n}</div>`).join("")}</div>
      <div class="stack-labels">${CLASSES.map(c => `<span><span class="dot" style="background:var(${c.c})"></span>${c.name} <b>${c.n}</b></span>`).join("")}<span class="muted">Total <b>${total}</b></span></div>`;
    $$(".seg-b", host).forEach(s => {
      s.addEventListener("mousemove", e => showTip(`<b>${s.dataset.name}</b><div class="tr"><span>Recordings</span><span>${s.dataset.n} (${(s.dataset.n / total * 100).toFixed(0)}%)</span></div>`, e.clientX, e.clientY));
      s.addEventListener("mouseleave", hideTip);
    });
  })();

  /* ============================================================
     Architecture explorer
     ============================================================ */
  const L = (t, name, detail, shape, params) => ({ t, name, detail, shape, params });
  const HYBRID_FRONT = [
    L("io", "Input", "", "(1551, 1)", 0),
    L("conv", "Conv1D", "32 × k3, same, ReLU", "(1551, 32)", 128),
    L("pool", "MaxPool1D", "pool 3", "(517, 32)", 0), L("drop", "Dropout", "0.30", "(517, 32)", 0),
    L("conv", "Conv1D", "64 × k3, same, ReLU", "(517, 64)", 6208),
    L("pool", "MaxPool1D", "pool 3", "(172, 64)", 0), L("drop", "Dropout", "0.35", "(172, 64)", 0),
    L("conv", "Conv1D", "128 × k3, same, ReLU", "(172, 128)", 24704),
    L("pool", "MaxPool1D", "pool 3", "(57, 128)", 0), L("drop", "Dropout", "0.40", "(57, 128)", 0)
  ];
  const hybridBack = (rec, recShape, recP, flat, denseP) => [
    rec, L("drop", "Dropout", "0.25", recShape, 0),
    L("pool", "Flatten", "", `(${flat})`, 0),
    L("dense", "Dense", "128, ReLU", "(128)", denseP), L("drop", "Dropout", "0.45", "(128)", 0),
    L("dense", "Dense", "3, softmax", "(3)", 387)
  ];
  const rnnHead = (first) => [
    L("io", "Input", "", "(1, 1551)", 0), ...first,
    L("dense", "Dense", first.length > 1 ? "64, ReLU" : "96, ReLU", first.length > 1 ? "(64)" : "(96)", first.length > 1 ? 1344 : 6240),
    L("drop", "Dropout", "0.5", first.length > 1 ? "(64)" : "(96)", 0),
    L("dense", "Dense", "64, ReLU", "(64)", first.length > 1 ? 4160 : 6208), L("drop", "Dropout", "0.5", "(64)", 0),
    L("dense", "Dense", "3, softmax", "(3)", 195)
  ];
  const RNN_OPT = "Adam · ≤15 epochs · early stopping";
  const HYB_OPT = "Adam · ≤35 epochs · early stopping";
  const ARCH = [
    { id: "cnn", name: "Deep CNN", input: "(1551, 1)", opt: "Adam, LR 1e-3·0.8ᵉᵖᵒᶜʰ · 30 × 1000 steps · batch 8",
      why: "A stack of six 1-D convolutions with max-pooling and batch normalisation learns pitch and amplitude features directly from the waveform. L2 regularisation, heavy dropout and random time-shifts keep it from overfitting, and global average pooling makes it small (8.5 k parameters).",
      layers: [
        L("io", "Input", "", "(1551, 1)", 0),
        L("conv", "Conv1D", "4 × k9, ReLU, L2", "(1543, 4)", 40), L("pool", "MaxPool1D", "stride 4", "(386, 4)", 0), L("pool", "BatchNorm", "", "(386, 4)", 16),
        L("conv", "Conv1D", "4 × k9, ReLU, L2", "(378, 4)", 148), L("pool", "MaxPool1D", "stride 4", "(95, 4)", 0), L("pool", "BatchNorm", "", "(95, 4)", 16),
        L("conv", "Conv1D", "8 × k9, ReLU, L2", "(87, 8)", 296), L("pool", "MaxPool1D", "stride 4", "(22, 8)", 0), L("pool", "BatchNorm", "", "(22, 8)", 32),
        L("conv", "Conv1D", "16 × k9, ReLU", "(14, 16)", 1168), L("pool", "MaxPool1D", "stride 4", "(4, 16)", 0), L("pool", "BatchNorm", "", "(4, 16)", 64), L("drop", "Dropout", "0.25", "(4, 16)", 0),
        L("conv", "Conv1D", "64 × k4, ReLU", "(1, 64)", 4160), L("pool", "BatchNorm", "", "(1, 64)", 256), L("drop", "Dropout", "0.50", "(1, 64)", 0),
        L("conv", "Conv1D", "32 × k1, ReLU", "(1, 32)", 2080), L("pool", "BatchNorm", "", "(1, 32)", 128), L("drop", "Dropout", "0.75", "(1, 32)", 0),
        L("pool", "GlobalAvgPool1D", "", "(32)", 0), L("dense", "Dense", "3, softmax", "(3)", 99)
      ] },
    { id: "lstm", name: "LSTM", input: "(1, 1551)", opt: RNN_OPT,
      why: "Whether a sound is normal depends on the pattern of high- and low-pitched sounds that came before, so a memory cell with input, forget and output gates is a natural fit. A single 64-unit LSTM feeds two ReLU dense layers.",
      layers: rnnHead([L("rec", "LSTM", "64 units", "(64)", 413696)]) },
    { id: "gru", name: "GRU", input: "(1, 1551)", opt: RNN_OPT,
      why: "The same network with a GRU in place of the LSTM. Its update and reset gates capture long-range patterns with fewer parameters, which can help on small datasets.",
      layers: rnnHead([L("rec", "GRU", "64 units", "(64)", 310272)]) },
    { id: "bilstm", name: "Bi-LSTM", input: "(1, 1551)", opt: RNN_OPT,
      why: "A sound's meaning also depends on what follows it. Two stacked bidirectional LSTM layers read the sequence forwards and backwards.",
      layers: rnnHead([L("rec", "Bidirectional LSTM", "64, return seq.", "(1, 128)", 827392), L("rec", "Bidirectional LSTM", "10 units", "(20)", 11120)]) },
    { id: "cnnlstm", name: "CNN-LSTM", input: "(1551, 1)", opt: HYB_OPT,
      why: "Three convolution blocks compress the 1,551-sample signal into 57 feature vectors, and an LSTM reads them as a sequence. The CNN supplies features and the LSTM supplies temporal context.",
      layers: [...HYBRID_FRONT, ...hybridBack(L("rec", "LSTM", "50, return seq.", "(57, 50)", 35800), "(57, 50)", 0, 2850, 364928)] },
    { id: "cnngru", name: "CNN-GRU", input: "(1551, 1)", opt: HYB_OPT,
      why: "The same convolutional front-end, with a GRU as the recurrent back-end.",
      layers: [...HYBRID_FRONT, ...hybridBack(L("rec", "GRU", "50, return seq.", "(57, 50)", 26850), "(57, 50)", 0, 2850, 364928)] },
    { id: "cnnbilstm", name: "CNN-Bi-LSTM", input: "(1551, 1)", opt: HYB_OPT, best: true,
      why: "The best model. Convolutional features feed a bidirectional LSTM, so each position sees the extracted features plus the pattern before and after it.",
      layers: [...HYBRID_FRONT, ...hybridBack(L("rec", "Bidirectional LSTM", "50, return seq.", "(57, 100)", 71600), "(57, 100)", 0, 5700, 729728)] }
  ];
  function drawArch(id) {
    const a = ARCH.find(d => d.id === id);
    $("#archStack").innerHTML = a.layers.map(l => `<div class="layer ${l.t}"><span class="bar"></span>
      <span class="ln">${l.name}${l.detail ? `<small>${l.detail}</small>` : ""}</span>
      <span class="shape">${l.shape}</span><span class="prm">${l.params ? l.params.toLocaleString("en-US") : "—"}</span></div>`).join("");
    const total = a.layers.reduce((s, l) => s + l.params, 0);
    $("#archName").textContent = a.name;
    $("#archWhy").textContent = a.why;
    $("#archParams").textContent = total.toLocaleString("en-US");
    $("#archInput").textContent = a.input;
    $("#archOpt").textContent = a.opt;
  }
  const archTabs = $("#archTabs");
  ARCH.forEach((a, i) => {
    const b = document.createElement("button");
    b.className = "chip" + (a.best ? " active" : ""); b.textContent = a.name + (a.best ? " ★" : "");
    b.addEventListener("click", () => { $$(".chip", archTabs).forEach(x => x.classList.toggle("active", x === b)); drawArch(a.id); });
    archTabs.appendChild(b);
  });
  drawArch("cnnbilstm");

  /* ============================================================
     Results — thesis Table 4.1
     ============================================================ */
  const FAM = { base: { label: "Baseline / CNN", c: "--s1", shape: "circle" },
                rnn: { label: "Recurrent", c: "--s2", shape: "tri" },
                hyb: { label: "Hybrid CNN–RNN", c: "--s3", shape: "sq" } };
  const RESULTS = [
    { name: "EWT (state of the art)", short: "EWT", family: "base", acc: 89, val: 84, recall: 91, loss: 2.3, vloss: 2.4, dx: -8, dy: -10, anchor: "end", s: [-10, 4, "end"] },
    { name: "SVM", short: "SVM", family: "base", acc: 70, val: null, recall: null, loss: null, vloss: null },
    { name: "Deep CNN", short: "Deep CNN", family: "base", acc: 79, val: 77, recall: 81.5, loss: 0.55, vloss: 0.51, dx: 10, dy: 4, anchor: "start", s: [0, 20, "middle"] },
    { name: "LSTM", short: "LSTM", family: "rnn", acc: 90, val: 40, recall: 84, loss: 0.35, vloss: 1.35, dx: -10, dy: 4, anchor: "end" },
    { name: "GRU", short: "GRU", family: "rnn", acc: 92, val: 30, recall: 81, loss: 0.42, vloss: 1.23, dx: 10, dy: 12, anchor: "start" },
    { name: "Bi-LSTM", short: "Bi-LSTM", family: "rnn", acc: 92, val: 31, recall: 77, loss: 0.49, vloss: 1.11, dx: 10, dy: -6, anchor: "start" },
    { name: "CNN-LSTM", short: "CNN-LSTM", family: "hyb", acc: 89, val: 80, recall: 89, loss: 0.4, vloss: 0.5, dx: -8, dy: 16, anchor: "end", s: [8, 14, "start"] },
    { name: "CNN-GRU", short: "CNN-GRU", family: "hyb", acc: 88, val: 70, recall: 90, loss: 0.25, vloss: 0.9, dx: -10, dy: 4, anchor: "end" },
    { name: "CNN-Bi-LSTM", short: "CNN-Bi-LSTM", family: "hyb", acc: 92, val: 85, recall: 91.5, loss: 0.35, vloss: 0.55, dx: 10, dy: -8, anchor: "start", best: true, s: [6, -13, "end"] }
  ];
  RESULTS.forEach(r => (r.gap = r.val == null ? null : r.acc - r.val));

  function fmt(v, d = 0) { return v == null ? "—" : (+v).toFixed(d); }
  function markShape(g, shape, x, y, size, attrs) {
    if (shape === "circle") return el("circle", { cx: x, cy: y, r: size, ...attrs }, g);
    if (shape === "sq") return el("rect", { x: x - size, y: y - size, width: size * 2, height: size * 2, rx: 2, ...attrs }, g);
    const h = size * 1.2;
    return el("path", { d: `M${x},${y - h} L${x + h},${y + h * .8} L${x - h},${y + h * .8} Z`, ...attrs }, g);
  }

  function drawScatter() {
    const host = $("#scatter"); host.innerHTML = "";
    const W = host.clientWidth, H = host.clientHeight;
    const m = { l: 48, r: 18, t: 12, b: 44 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const x0 = 75, x1 = 95, y0 = 20, y1 = 100;
    const X = v => m.l + (v - x0) / (x1 - x0) * pw, Y = v => m.t + ph - (v - y0) / (y1 - y0) * ph;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Scatter of training versus validation accuracy for each model" }, host);
    const grid = el("g", { class: "grid" }, svg), ax = el("g", { class: "axis" }, svg);
    for (let v = 20; v <= 100; v += 20) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, grid);
      el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, ax).textContent = v + "%";
    }
    for (let v = 75; v <= 95; v += 5) {
      el("line", { x1: X(v), x2: X(v), y1: m.t + ph, y2: m.t + ph + 4 }, ax);
      el("text", { x: X(v), y: m.t + ph + 18, "text-anchor": "middle" }, ax).textContent = v + "%";
    }
    el("line", { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph }, ax);
    el("text", { class: "axis-title", x: m.l + pw / 2, y: H - 4, "text-anchor": "middle" }, svg).textContent = "Training accuracy";
    const yt = el("text", { class: "axis-title", x: 0, y: 0, "text-anchor": "middle", transform: `translate(12 ${m.t + ph / 2}) rotate(-90)` }, svg);
    yt.textContent = "Validation accuracy";
    // y = x reference
    el("line", { class: "diag", x1: X(x0), y1: Y(x0), x2: X(x1), y2: Y(x1) }, svg);
    el("text", { class: "axis-title", x: X(x1) - 4, y: Y(x1) - 6, "text-anchor": "end", style: "fill:var(--muted);font-size:11px" }, svg).textContent = "val = train";

    const g = el("g", {}, svg), lbls = el("g", {}, svg);
    const small = W < 520;
    RESULTS.filter(r => r.val != null).forEach(r => {
      const f = FAM[r.family], x = X(r.acc), y = Y(r.val);
      const mk = markShape(g, f.shape, x, y, 6.5, { class: "mark" + (r.best ? " win" : ""), fill: css(f.c) });
      const [dx, dy, an] = small && r.s ? r.s : [r.dx, r.dy, r.anchor];
      const t = el("text", { class: "pt-lbl", x: x + dx, y: y + dy, "text-anchor": an }, lbls);
      t.textContent = r.short;
      const hit = el("circle", { class: "hit", cx: x, cy: y, r: 16 }, g);
      const html = `<b>${r.name}</b><div class="tr"><span><i style="background:${css(f.c)}"></i>${f.label}</span><span></span></div>
        <div class="tr"><span>Training</span><span>${r.acc}%</span></div><div class="tr"><span>Validation</span><span>${r.val}%</span></div>
        <div class="tr"><span>Gap</span><span>${r.gap} pts</span></div>`;
      [hit, mk].forEach(n => {
        n.addEventListener("mousemove", e => showTip(html, e.clientX, e.clientY));
        n.addEventListener("mouseleave", hideTip);
        n.addEventListener("touchstart", e => { const t0 = e.touches[0]; showTip(html, t0.clientX, t0.clientY); }, { passive: true });
      });
    });
    $("#scatterLegend").innerHTML = Object.values(FAM).map(f =>
      `<span><i class="${f.shape === "sq" ? "sq" : f.shape === "tri" ? "tri" : ""}" style="background:${css(f.c)};color:${css(f.c)}"></i>${f.label}</span>`).join("");
  }

  /* sortable table */
  let sortK = "val", sortDir = -1;
  function drawTable() {
    const rows = RESULTS.slice().sort((a, b) => {
      let va = a[sortK], vb = b[sortK];
      if (sortK === "family") { va = FAM[a.family].label; vb = FAM[b.family].label; }
      if (va == null) return 1; if (vb == null) return -1;
      return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * sortDir;
    });
    $("#resultsTable tbody").innerHTML = rows.map(r => `<tr class="${r.best ? "best" : ""}">
      <td>${r.name}${r.best ? " ★" : ""}</td>
      <td><span class="fam"><span class="dot" style="background:var(${FAM[r.family].c})"></span>${FAM[r.family].label}</span></td>
      <td class="num">${fmt(r.acc)}</td><td class="num">${fmt(r.val)}</td>
      <td class="num">${r.gap == null ? "—" : `<span class="gapbar" style="width:${r.gap * 0.9}px"></span>${r.gap}`}</td>
      <td class="num">${fmt(r.recall, r.recall % 1 ? 1 : 0)}</td>
      <td class="num">${fmt(r.loss, 2)}</td><td class="num">${fmt(r.vloss, 2)}</td></tr>`).join("");
    $$("#resultsTable th").forEach(th => { th.classList.toggle("asc", th.dataset.k === sortK && sortDir === 1); th.classList.toggle("desc", th.dataset.k === sortK && sortDir === -1); });
  }
  $$("#resultsTable th").forEach(th => th.addEventListener("click", () => {
    if (sortK === th.dataset.k) sortDir *= -1; else { sortK = th.dataset.k; sortDir = th.dataset.k === "name" || th.dataset.k === "family" ? 1 : -1; }
    drawTable();
  }));
  drawTable();

  /* ============================================================
     Training curves (from notebook logs)
     ============================================================ */
  const H_ORDER = ["CNN-Bi-LSTM", "CNN-LSTM", "CNN-GRU", "Deep CNN", "LSTM", "GRU", "Bi-LSTM", "Simple RNN", "Bi-GRU", "Bi-RNN"];
  let curModel = "CNN-Bi-LSTM", curMetric = "acc";
  const METRIC = { acc: ["acc", "val_acc", "Accuracy", true], loss: ["loss", "val_loss", "Loss", false], recall: ["recall", "val_recall", "Recall", true] };

  const cm = $("#curveModels");
  H_ORDER.forEach(n => {
    if (!window.HISTORIES || !HISTORIES[n]) return;
    const b = document.createElement("button");
    b.className = "chip" + (n === curModel ? " active" : ""); b.textContent = n;
    b.addEventListener("click", () => { curModel = n; $$(".chip", cm).forEach(x => x.classList.toggle("active", x === b)); drawCurve(); });
    cm.appendChild(b);
  });
  $$("#curveMetric button").forEach(b => b.addEventListener("click", () => {
    curMetric = b.dataset.m; $$("#curveMetric button").forEach(x => x.classList.toggle("active", x === b)); drawCurve();
  }));

  function drawCurve() {
    const host = $("#curve"); host.innerHTML = "";
    if (!window.HISTORIES) return;
    const d = HISTORIES[curModel], [kt, kv, label, pct] = METRIC[curMetric];
    const tr = d.hist[kt], va = d.hist[kv], n = tr.length;
    const W = host.clientWidth, H = host.clientHeight, m = { l: 48, r: 16, t: 12, b: 40 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const ymax = pct ? 1 : Math.ceil(Math.max(...tr, ...va) * 2) / 2;
    const X = i => m.l + (n === 1 ? 0 : i / (n - 1) * pw), Y = v => m.t + ph - v / ymax * ph;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${label} per epoch for ${curModel}` }, host);
    const grid = el("g", { class: "grid" }, svg), ax = el("g", { class: "axis" }, svg);
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const v = ymax * i / steps;
      el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, grid);
      el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, ax).textContent = pct ? Math.round(v * 100) + "%" : v.toFixed(1);
    }
    const every = n > 20 ? 5 : n > 10 ? 2 : 1;
    for (let i = 0; i < n; i += every) el("text", { x: X(i), y: m.t + ph + 18, "text-anchor": "middle" }, ax).textContent = i + 1;
    el("line", { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph }, ax);
    el("text", { class: "axis-title", x: m.l + pw / 2, y: H - 4, "text-anchor": "middle" }, svg).textContent = "Epoch";

    const path = arr => "M" + arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("L");
    const cT = css("--s1"), cV = css("--s2");
    el("path", { class: "series-line", d: path(tr), stroke: cT }, svg);
    el("path", { class: "series-line", d: path(va), stroke: cV, "stroke-dasharray": "6 4" }, svg);
    // direct labels at the end
    const lastT = Y(tr[n - 1]), lastV = Y(va[n - 1]);
    const sep = Math.abs(lastT - lastV) < 14 ? (lastT < lastV ? -7 : 7) : 0;
    if (W > 520) {
      el("text", { class: "pt-lbl", x: X(n - 1) - 4, y: lastT - 8 + (sep < 0 ? sep : 0), "text-anchor": "end" }, svg).textContent = "train";
      el("text", { class: "pt-lbl", x: X(n - 1) - 4, y: lastV + 16 + (sep > 0 ? 0 : 0), "text-anchor": "end" }, svg).textContent = "validation";
    }
    // crosshair
    const hov = el("g", { visibility: "hidden" }, svg);
    const ch = el("line", { class: "crosshair", y1: m.t, y2: m.t + ph }, hov);
    const dT = el("circle", { r: 4.5, fill: cT, stroke: css("--surface"), "stroke-width": 2 }, hov);
    const dV = el("circle", { r: 4.5, fill: cV, stroke: css("--surface"), "stroke-width": 2 }, hov);
    const ov = el("rect", { class: "hit", x: m.l, y: m.t, width: pw, height: ph }, svg);
    const f = v => pct ? (v * 100).toFixed(1) + "%" : v.toFixed(3);
    const move = (cx, cy) => {
      const r = svg.getBoundingClientRect(), sx = (cx - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round((sx - m.l) / pw * (n - 1))));
      hov.setAttribute("visibility", "visible");
      ch.setAttribute("x1", X(i)); ch.setAttribute("x2", X(i));
      dT.setAttribute("cx", X(i)); dT.setAttribute("cy", Y(tr[i])); dV.setAttribute("cx", X(i)); dV.setAttribute("cy", Y(va[i]));
      showTip(`<b>${curModel} · epoch ${i + 1}</b><div class="tr"><span><i style="background:${cT}"></i>Train ${label.toLowerCase()}</span><span>${f(tr[i])}</span></div>
        <div class="tr"><span><i style="background:${cV}"></i>Validation</span><span>${f(va[i])}</span></div>`, cx, cy);
    };
    ov.addEventListener("mousemove", e => move(e.clientX, e.clientY));
    ov.addEventListener("touchmove", e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    ov.addEventListener("mouseleave", () => { hideTip(); hov.setAttribute("visibility", "hidden"); });

    $("#curveLegend").innerHTML = `<span><i class="ln" style="background:${cT}"></i>Training</span>
      <span><i class="ln" style="background:repeating-linear-gradient(90deg,${cV} 0 6px,transparent 6px 9px)"></i>Validation</span>`;
    const [ntr, nva] = d.split;
    $("#curveNote").textContent = curModel === "Deep CNN"
      ? `Trained on ${ntr} recordings with random time-shift augmentation; validation is the held-out test split (18 recordings), so each recording is worth about 5.6 points. Final: ${f(tr[n - 1])} train, ${f(va[n - 1])} validation.`
      : `${d.src === "hybrid" ? "Hybrid" : "Classification"} notebook · ${ntr} training and ${nva} validation recordings (one recording ≈ ${(100 / +nva).toFixed(1)} points of validation accuracy) · ${n} epochs. Final: ${f(tr[n - 1])} train, ${f(va[n - 1])} validation.`;
  }

  /* ---------- redraw on resize / theme ---------- */
  function redrawCharts() { drawScatter(); drawCurve(); }
  let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(redrawCharts, 120); });
  redrawCharts();

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $(".lb-cap", lb);
  $$(".fig img").forEach(img => img.addEventListener("click", () => {
    lbImg.src = img.src; lbImg.alt = img.alt; lbCap.textContent = img.closest(".fig").querySelector("figcaption").textContent;
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  }));
  const closeLb = () => { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
  lb.addEventListener("click", e => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeLb(); hideTip(); } });
  document.addEventListener("scroll", hideTip, { passive: true });

  /* ---------- copy BibTeX ---------- */
  $$("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#" + b.dataset.copy).innerText); const t = b.textContent; b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = t), 1600); } catch (e) {}
  }));
})();
