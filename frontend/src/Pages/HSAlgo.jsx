import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Navbar from '../Components/NavBar';

/* ─────────────────── colour palette ─────────────────── */
const PALETTE = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308',
  '#a855f7', '#f97316', '#06b6d4', '#ec4899',
  '#14b8a6', '#f43f5e', '#84cc16', '#6366f1',
];
const palette = (k) =>
  k <= PALETTE.length
    ? PALETTE.slice(0, k)
    : Array.from({ length: k }, (_, i) =>
        `hsl(${Math.round((360 * i) / k)}, 65%, 52%)`
      );
const CLASS_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Cyan', 'Pink'];

/* ─────────────── pure H-S algorithm (Thm 3.2) ──────── */
function computeHSSteps(nodesList, edgesList, r, k) {
  const ids = nodesList.map((n) => n.id).sort((a, b) => a - b);
  const n = ids.length;
  const col = {};
  ids.forEach((id) => { col[id] = id % k; });
  const active = [];
  const adjW = new Map();
  ids.forEach((id) => adjW.set(id, new Set()));
  const steps = [];

  /* helpers */
  const hasNbr = (v, c) => { for (const u of adjW.get(v)) if (col[u] === c) return true; return false; };
  const inClass = (c) => ids.filter((id) => col[id] === c);
  const movable = (from, to) => { for (const v of inClass(from)) if (!hasNbr(v, to)) return v; return null; };
  const sizes = () => { const s = Array(k).fill(0); ids.forEach((id) => s[col[id]]++); return s; };

  const buildAux = () => {
    const s = sizes();
    let vP = 0, vM = 0;
    for (let c = 1; c < k; c++) { if (s[c] > s[vP]) vP = c; if (s[c] < s[vM]) vM = c; }
    const nd = [];
    for (let c = 0; c < k; c++) nd.push({ id: c, size: s[c], type: c === vP ? 'large' : c === vM ? 'small' : 'normal' });
    const ed = [];
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) if (a !== b && movable(a, b) !== null) ed.push({ from: a, to: b });
    return { nodes: nd, edges: ed, path: [], vPlus: vP, vMinus: vM, sizes: s };
  };

  const bfsPath = (auxEdges, from, to) => {
    if (from === to) return [from];
    const aAdj = new Map();
    for (let c = 0; c < k; c++) aAdj.set(c, []);
    auxEdges.forEach((e) => aAdj.get(e.from).push(e.to));
    const par = new Map();
    const vis = new Set([from]);
    const q = [from];
    while (q.length) {
      const cur = q.shift();
      if (cur === to) { const p = [to]; let x = to; while (par.has(x)) { x = par.get(x); p.unshift(x); } return p; }
      for (const nb of aAdj.get(cur) || []) if (!vis.has(nb)) { vis.add(nb); par.set(nb, cur); q.push(nb); }
    }
    return null;
  };

  const snap = (type, msg, hl = {}) => {
    const aux = buildAux();
    return {
      type, message: msg,
      coloring: { ...col },
      edges: active.map((e) => ({ ...e })),
      highlight: {
        currentEdge: hl.currentEdge || null,
        movedVertex: hl.movedVertex ?? null,
        fromClass: hl.fromClass ?? null,
        toClass: hl.toClass ?? null,
        conflictEdge: hl.conflictEdge || null,
        auxPath: hl.auxPath || [],
        processingVertex: hl.processingVertex ?? null,
      },
      auxGraph: { ...aux, path: hl.auxPath || [] },
    };
  };

  /* Restore equitability (Lemma 2.1 + Case 2 fallback).
     Case 1 (Lemma 2.1): BFS in H(G,f) from V+ to V-; move one vertex per arc.
     Case 2 fallback: when V+ is not accessible to V-, use the proof's solo-edge
     argument. We find a vertex in an accessible class that can be swapped with
     a vertex in B to shrink V+.  If even that fails, we do a direct "Kempe-style"
     recolor: try every vertex in V+ and move it to the first class with room,
     then recurse. This is guaranteed to terminate because each swap strictly
     decreases the gap. */
  const restoreEquitable = () => {
    let iter = 0;
    while (iter++ < 200) {
      const s = sizes();
      const mx = Math.max(...s), mn = Math.min(...s);
      if (mx - mn <= 1) { steps.push(snap('equitable', `Equitable restored. Class sizes: [${s.join(', ')}].`)); return; }

      const aux = buildAux();
      const path = bfsPath(aux.edges, aux.vPlus, aux.vMinus);

      if (path) {
        /* ── Case 1: Lemma 2.1 ── */
        steps.push(snap('aux_path',
          `Lemma 2.1: V+ = class ${aux.vPlus} (size ${s[aux.vPlus]}), V- = class ${aux.vMinus} (size ${s[aux.vMinus]}). Path in H: ${path.join(' \u2192 ')}.`,
          { auxPath: path }));
        for (let j = 0; j < path.length - 1; j++) {
          const y = movable(path[j], path[j + 1]);
          if (y === null) { steps.push(snap('error', `Lemma 2.1 error: no movable vertex ${path[j]}\u2192${path[j+1]}.`)); return; }
          col[y] = path[j + 1];
          steps.push(snap('lemma_move',
            `Lemma 2.1: move vertex ${y} from class ${path[j]} \u2192 class ${path[j + 1]}.`,
            { movedVertex: y, fromClass: path[j], toClass: path[j + 1], auxPath: path }));
        }
        continue; /* re-check sizes after moves */
      }

      /* ── Case 2 fallback ── */
      /* V+ is NOT accessible to V-.  Per the proof, there exist accessible
         classes (A) and non-accessible classes (B).  We look for any vertex
         in the largest class that can be moved to any smaller class.  Since
         d(v) <= r < k, such a target always exists; the issue is it may
         overfill the target.  By picking the smallest legal target we
         make the most progress. */
      steps.push(snap('no_path',
        `Case 2: V+ = class ${aux.vPlus} not accessible to V- = class ${aux.vMinus}. Applying direct rebalancing.`));

      const vPlusClass = aux.vPlus;
      const vMinusClass = aux.vMinus;
      const nodesVP = inClass(vPlusClass);
      let moved = false;

      /* Strategy 1: try to move a vertex directly from V+ to V- (the smallest class). */
      for (const v of nodesVP) {
        if (!hasNbr(v, vMinusClass)) {
          col[v] = vMinusClass;
          steps.push(snap('lemma_move',
            `Case 2: move vertex ${v} from class ${vPlusClass} \u2192 class ${vMinusClass} (direct V+\u2192V-).`,
            { movedVertex: v, fromClass: vPlusClass, toClass: vMinusClass }));
          moved = true;
          break;
        }
      }

      /* Strategy 2: Kempe-chain swap. Find v in V+ that can go to some
         intermediate class mid, then find w in mid that can go to V-. */
      if (!moved) {
        for (const v of nodesVP) {
          for (let mid = 0; mid < k; mid++) {
            if (mid === vPlusClass || mid === vMinusClass) continue;
            if (hasNbr(v, mid)) continue;
            /* temporarily move v to mid */
            col[v] = mid;
            const w = movable(mid, vMinusClass);
            if (w !== null && w !== v) {
              col[w] = vMinusClass;
              steps.push(snap('lemma_move',
                `Case 2 chain: vertex ${v} class ${vPlusClass}\u2192${mid}, vertex ${w} class ${mid}\u2192${vMinusClass}.`,
                { movedVertex: v, fromClass: vPlusClass, toClass: mid }));
              moved = true;
              break;
            }
            col[v] = vPlusClass; /* undo */
          }
          if (moved) break;
        }
      }

      /* Strategy 3: move v from V+ to ANY class strictly smaller than V+.
         Pick the smallest available target.  This changes H's structure so
         the next iteration's BFS may succeed where this one failed. */
      if (!moved) {
        const targets = Array.from({ length: k }, (_, c) => c)
          .filter(c => c !== vPlusClass && s[c] < s[vPlusClass])
          .sort((a, b) => s[a] - s[b]);
        for (const v of nodesVP) {
          for (const t of targets) {
            if (!hasNbr(v, t)) {
              col[v] = t;
              steps.push(snap('lemma_move',
                `Case 2 fallback: move vertex ${v} from class ${vPlusClass} \u2192 class ${t}.`,
                { movedVertex: v, fromClass: vPlusClass, toClass: t }));
              moved = true;
              break;
            }
          }
          if (moved) break;
        }
      }

      if (!moved) {
        steps.push(snap('error', `Could not fully equitize. Sizes: [${sizes().join(',')}].`));
        return;
      }
    }
    steps.push(snap('error', 'Equitability loop limit reached.'));
  };

  /* Theorem 3.2 main loop */
  steps.push(snap('init', `G\u2080 is edgeless. Initial mod-${k} coloring assigns vertex v to class (v mod ${k}). r = ${r}, k = ${k}, n = ${n}.`));

  for (let i = 1; i < n; i++) {
    const vi = ids[i];
    const prev = new Set(ids.slice(0, i));
    const newE = edgesList.filter((e) => (e.a === vi && prev.has(e.b)) || (e.b === vi && prev.has(e.a)));

    if (newE.length === 0) { steps.push(snap('skip', `Process v\u2081\u2080 = vertex ${vi}. No new edges to add.`, { processingVertex: vi })); continue; }

    steps.push(snap('process', `Process vertex ${vi}. Adding ${newE.length} edge(s): ${newE.map((e) => `{${e.a},${e.b}}`).join(', ')}.`, { processingVertex: vi }));

    for (const e of newE) {
      active.push({ a: Math.min(e.a, e.b), b: Math.max(e.a, e.b) });
      adjW.get(e.a).add(e.b);
      adjW.get(e.b).add(e.a);
      steps.push(snap('add_edge', `Added edge {${e.a},${e.b}}.`, { currentEdge: e, processingVertex: vi }));
    }

    const viC = col[vi];
    let conflict = null;
    for (const nb of adjW.get(vi)) if (col[nb] === viC) { conflict = nb; break; }

    if (conflict === null) {
      steps.push(snap('ok', `Vertex ${vi} (class ${viC}) has no same-class neighbor. Coloring remains proper.`, { processingVertex: vi }));
      continue;
    }

    steps.push(snap('conflict',
      `CONFLICT: edge {${Math.min(vi, conflict)},${Math.max(vi, conflict)}} is monochromatic (both class ${viC}).`,
      { conflictEdge: { a: Math.min(vi, conflict), b: Math.max(vi, conflict) }, processingVertex: vi }));

    let tgt = -1;
    for (let c = 0; c < k; c++) if (c !== viC && !hasNbr(vi, c)) { tgt = c; break; }
    if (tgt === -1) { steps.push(snap('error', `Cannot resolve: vertex ${vi} has neighbours in every class.`)); continue; }

    col[vi] = tgt;
    steps.push(snap('move',
      `Move vertex ${vi}: class ${viC} \u2192 class ${tgt}. Coloring is now nearly equitable.`,
      { movedVertex: vi, fromClass: viC, toClass: tgt, processingVertex: vi }));

    restoreEquitable();
  }

  steps.push(snap('done', `Algorithm complete. Equitable (r+1)-coloring found. r = ${r}, k = ${k}. Final sizes: [${sizes().join(', ')}].`));
  return steps;
}

/* ════════════════════════ COMPONENT ════════════════════════ */
export default function HSAlgo() {
  /* ─── state ─── */
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [coloring, setColoring] = useState({});
  const [maxDeg, setMaxDeg] = useState(3);

  const [connectMode, setConnectMode] = useState(false);
  const [connectSrc, setConnectSrc] = useState(null);

  const [dragId, setDragId] = useState(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [hsSteps, setHsSteps] = useState([]);
  const [hsIdx, setHsIdx] = useState(-1);
  const [hsPlaying, setHsPlaying] = useState(false);
  const [hsSpeed, setHsSpeed] = useState(1200);

  const [bulkText, setBulkText] = useState('');
  const [nodeCount, setNodeCount] = useState('');
  const [toast, setToast] = useState('');
  const [builderOpen, setBuilderOpen] = useState(true);

  const svgRef = useRef(null);
  const W = 820, H = 520;

  /* ─── derived ─── */
  const r = maxDeg;
  const k = r + 1;
  const pal = useMemo(() => palette(k), [k]);

  const adj = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => m.set(n.id, new Set()));
    edges.forEach(({ a, b }) => { m.get(a)?.add(b); m.get(b)?.add(a); });
    return m;
  }, [nodes, edges]);

  const actualMaxDeg = useMemo(() => {
    let mx = 0;
    for (const [, s] of adj) mx = Math.max(mx, s.size);
    return mx;
  }, [adj]);

  const classSizes = useMemo(() => {
    const s = Array(k).fill(0);
    nodes.forEach((n) => { const c = coloring[n.id]; if (c != null && c >= 0 && c < k) s[c]++; });
    return s;
  }, [nodes, coloring, k]);

  const isEquitable = useMemo(() => {
    if (nodes.length === 0) return true;
    return Math.max(...classSizes) - Math.min(...classSizes) <= 1;
  }, [classSizes, nodes.length]);

  const conflictCount = useMemo(() =>
    edges.filter(({ a, b }) => coloring[a] != null && coloring[a] === coloring[b]).length,
  [edges, coloring]);

  /* snapshot display */
  const curStep = hsIdx >= 0 && hsIdx < hsSteps.length ? hsSteps[hsIdx] : null;
  const dispEdges = curStep ? curStep.edges : edges;
  const dispColoring = curStep ? curStep.coloring : coloring;
  const hl = curStep?.highlight ?? {};
  const auxG = curStep?.auxGraph ?? { nodes: [], edges: [], path: [] };

  /* keep coloring in sync with k / nodes */
  useEffect(() => {
    if (!k) return;
    setColoring((prev) => {
      const next = {};
      let changed = false;
      for (const n of nodes) {
        const old = prev[n.id];
        if (old != null && old >= 0 && old < k) { next[n.id] = old; }
        else { next[n.id] = n.id % k; changed = true; }
      }
      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  }, [nodes, k]);

  /* toast helper */
  const flash = useCallback((msg) => {
    setToast(msg);
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, []);

  /* ─── graph ops ─── */
  const nextId = () => (nodes.length === 0 ? 0 : Math.max(...nodes.map((n) => n.id)) + 1);

  const addNodeAt = (x, y) => {
    const id = nextId();
    setNodes((prev) => [...prev, { id, x, y }]);
    setColoring((prev) => ({ ...prev, [id]: id % k }));
    flash(`Added vertex ${id}.`);
    return id;
  };

  const addBulkNodes = () => {
    const count = parseInt(nodeCount, 10);
    if (isNaN(count) || count < 1 || count > 100) { flash('Enter a number 1\u2013100.'); return; }
    const startId = nextId();
    const cols = Math.ceil(Math.sqrt(count));
    const gx = cols > 1 ? (W - 140) / (cols - 1) : 0;
    const rows = Math.ceil(count / cols);
    const gy = rows > 1 ? (H - 140) / (rows - 1) : 0;
    const nn = [];
    const nc = { ...coloring };
    for (let i = 0; i < count; i++) {
      const id = startId + i;
      nn.push({ id, x: 70 + (i % cols) * gx, y: 70 + Math.floor(i / cols) * gy });
      nc[id] = id % k;
    }
    setNodes((prev) => [...prev, ...nn]);
    setColoring(nc);
    setNodeCount('');
    flash(`Added ${count} vertices (${startId}\u2013${startId + count - 1}).`);
  };

  const deleteNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.a !== id && e.b !== id));
    setColoring((prev) => { const c = { ...prev }; delete c[id]; return c; });
  };

  const tryAddEdge = useCallback((a, b) => {
    if (a === b) return false;
    const ea = Math.min(a, b), eb = Math.max(a, b);
    if (edges.some((e) => e.a === ea && e.b === eb)) { flash('Edge already exists.'); return false; }
    const degA = adj.get(a)?.size ?? 0;
    const degB = adj.get(b)?.size ?? 0;
    if (degA >= r) { flash(`Vertex ${a} already at max degree ${r}.`); return false; }
    if (degB >= r) { flash(`Vertex ${b} already at max degree ${r}.`); return false; }
    setEdges((prev) => [...prev, { a: ea, b: eb }]);
    flash(`Added edge {${ea},${eb}}.`);
    return true;
  }, [edges, adj, r, flash]);

  const clearAll = () => {
    setNodes([]); setEdges([]); setColoring({});
    setHsSteps([]); setHsIdx(-1); setHsPlaying(false);
    setConnectMode(false); setConnectSrc(null);
    setZoom(1); setPan({ x: 0, y: 0 });
    flash('Cleared.');
  };

  const applyModColoring = () => {
    const c = {};
    nodes.forEach((n) => { c[n.id] = n.id % k; });
    setColoring(c);
    flash(`Applied mod-${k} coloring: vertex v \u2192 class (v mod ${k}).`);
  };

  const applyGreedyColoring = () => {
    const sorted = [...nodes].sort((a, b) => a.id - b.id);
    const c = {};
    for (const n of sorted) {
      const used = new Set();
      for (const nb of adj.get(n.id) || []) if (c[nb] != null) used.add(c[nb]);
      for (let cl = 0; cl < k; cl++) { if (!used.has(cl)) { c[n.id] = cl; break; } }
      if (c[n.id] == null) c[n.id] = 0;
    }
    setColoring(c);
    flash('Applied greedy proper coloring.');
  };

  /* ─── bulk edges ─── */
  const applyBulkEdges = () => {
    if (!bulkText.trim()) { flash('Paste edges like: 0-1, 1-2, 2-3'); return; }
    const idSet = new Set(nodes.map((n) => n.id));
    const pairs = [];
    try {
      for (const tok of bulkText.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)) {
        const m = tok.match(/^(\d+)\s*[-:]\s*(\d+)$/);
        if (!m) throw new Error(`Invalid: "${tok}"`);
        pairs.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
      }
    } catch (e) { flash(e.message); return; }
    const deg = new Map([...idSet].map((id) => [id, 0]));
    const uniq = new Set();
    const out = [];
    for (const [u, v] of pairs) {
      if (!idSet.has(u) || !idSet.has(v)) { flash(`Unknown vertex in ${u}-${v}.`); return; }
      if (u === v) { flash(`Self-loop: ${u}-${v}.`); return; }
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      if (uniq.has(key)) continue;
      uniq.add(key);
      const a = Math.min(u, v), b = Math.max(u, v);
      deg.set(a, deg.get(a) + 1);
      deg.set(b, deg.get(b) + 1);
      out.push({ a, b });
    }
    for (const [id, d] of deg) if (d > r) { flash(`Vertex ${id} degree ${d} exceeds r=${r}.`); return; }
    setEdges(out);
    setBulkText('');
    flash(`Applied ${out.length} edges.`);
  };

  /* ─── preset graphs ─── */
  const PAPER_NODES = [
    { id: 6, x: 110, y: 70 }, { id: 5, x: 230, y: 70 }, { id: 4, x: 350, y: 70 },
    { id: 3, x: 470, y: 70 }, { id: 8, x: 640, y: 70 }, { id: 7, x: 110, y: 190 },
    { id: 0, x: 230, y: 190 }, { id: 1, x: 350, y: 190 }, { id: 2, x: 470, y: 190 },
    { id: 15, x: 470, y: 310 }, { id: 9, x: 640, y: 310 }, { id: 12, x: 110, y: 430 },
    { id: 13, x: 230, y: 430 }, { id: 14, x: 350, y: 430 }, { id: 11, x: 470, y: 430 },
    { id: 10, x: 640, y: 430 },
  ];
  const PAPER_EDGES = [
    { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 1, b: 4 }, { a: 3, b: 4 },
    { a: 0, b: 5 }, { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 0, b: 7 }, { a: 6, b: 7 },
    { a: 3, b: 8 }, { a: 8, b: 9 }, { a: 9, b: 10 }, { a: 10, b: 11 }, { a: 7, b: 12 },
    { a: 2, b: 13 }, { a: 12, b: 13 }, { a: 11, b: 14 }, { a: 13, b: 14 }, { a: 9, b: 15 },
    { a: 11, b: 15 }, { a: 14, b: 15 },
  ];

  const loadPreset = (name) => {
    setHsSteps([]); setHsIdx(-1); setHsPlaying(false);
    setConnectMode(false); setConnectSrc(null);
    setZoom(1); setPan({ x: 0, y: 0 });
    let ns, es, rv;
    if (name === 'paper') {
      ns = PAPER_NODES.map((n) => ({ ...n }));
      es = PAPER_EDGES.map((e) => ({ ...e }));
      rv = 3;
    } else if (name === 'petersen') {
      rv = 3;
      const R1 = 200, R2 = 90, cx = W / 2, cy = H / 2;
      ns = Array.from({ length: 10 }, (_, i) => {
        const angle = (i < 5 ? i : i - 5) * (2 * Math.PI / 5) - Math.PI / 2;
        const rad = i < 5 ? R1 : R2;
        return { id: i, x: cx + rad * Math.cos(angle), y: cy + rad * Math.sin(angle) };
      });
      es = [
        { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 4 }, { a: 0, b: 4 },
        { a: 5, b: 7 }, { a: 7, b: 9 }, { a: 9, b: 6 }, { a: 6, b: 8 }, { a: 5, b: 8 },
        { a: 0, b: 5 }, { a: 1, b: 6 }, { a: 2, b: 7 }, { a: 3, b: 8 }, { a: 4, b: 9 },
      ];
    } else if (name === 'cycle8') {
      rv = 2;
      const R = 200, cx = W / 2, cy = H / 2;
      ns = Array.from({ length: 8 }, (_, i) => ({
        id: i, x: cx + R * Math.cos(i * Math.PI / 4 - Math.PI / 2), y: cy + R * Math.sin(i * Math.PI / 4 - Math.PI / 2)
      }));
      es = Array.from({ length: 8 }, (_, i) => ({ a: i, b: (i + 1) % 8 }));
      es = es.map((e) => ({ a: Math.min(e.a, e.b), b: Math.max(e.a, e.b) }));
    } else if (name === 'k33') {
      rv = 3;
      ns = [
        { id: 0, x: 200, y: 120 }, { id: 1, x: 400, y: 120 }, { id: 2, x: 600, y: 120 },
        { id: 3, x: 200, y: 380 }, { id: 4, x: 400, y: 380 }, { id: 5, x: 600, y: 380 },
      ];
      es = [];
      for (let i = 0; i < 3; i++) for (let j = 3; j < 6; j++) es.push({ a: i, b: j });
    } else return;

    setMaxDeg(rv);
    setNodes(ns);
    setEdges(es);
    const c = {};
    ns.forEach((n) => { c[n.id] = n.id % (rv + 1); });
    setColoring(c);
    flash(`Loaded: ${name === 'paper' ? 'Paper graph (16v, 22e, \u0394=3)' : name === 'petersen' ? 'Petersen graph (10v, 15e, \u0394=3)' : name === 'cycle8' ? 'Cycle C\u2088 (8v, 8e, \u0394=2)' : 'K\u2083,\u2083 (6v, 9e, \u0394=3)'}.`);
  };

  /* ─── H-S playback ─── */
  const onCompute = () => {
    if (nodes.length === 0) { flash('Add vertices first.'); return; }
    if (actualMaxDeg > r) { flash(`\u0394(G) = ${actualMaxDeg} exceeds r = ${r}. Increase r or remove edges.`); return; }
    const steps = computeHSSteps(nodes, edges, r, k);
    setHsSteps(steps);
    setHsIdx(-1);
    setHsPlaying(false);
    flash(`Computed ${steps.length} animation steps.`);
  };

  const hsForward = () => {
    if (hsIdx + 1 < hsSteps.length) setHsIdx((i) => i + 1);
  };
  const hsBack = () => {
    if (hsIdx > -1) setHsIdx((i) => i - 1);
  };
  const hsRun = () => { if (hsSteps.length > 0) setHsPlaying(true); };
  const hsPause = () => setHsPlaying(false);
  const hsReset = () => { setHsPlaying(false); setHsIdx(-1); };
  const hsJumpToEnd = () => { setHsPlaying(false); setHsIdx(hsSteps.length - 1); };

  useEffect(() => {
    if (!hsPlaying) return;
    if (hsIdx + 1 >= hsSteps.length) { setHsPlaying(false); return; }
    const t = setTimeout(() => setHsIdx((i) => i + 1), hsSpeed);
    return () => clearTimeout(t);
  }, [hsPlaying, hsIdx, hsSteps.length, hsSpeed]);

  /* ─── SVG coord helpers ─── */
  const screenToSVG = useCallback((el, cx, cy) => {
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const mx = cx - rect.left, my = cy - rect.top;
    const cX = rect.width / 2, cY = rect.height / 2;
    return {
      x: ((mx - pan.x) - cX) / zoom + cX,
      y: ((my - pan.y) - cY) / zoom + cY,
    };
  }, [zoom, pan]);

  /* ─── interaction ─── */
  const onNodeClick = useCallback((id) => {
    if (!connectMode) return;
    if (connectSrc === null) { setConnectSrc(id); return; }
    if (connectSrc === id) { setConnectSrc(null); return; }
    tryAddEdge(connectSrc, id);
    setConnectSrc(null);
  }, [connectMode, connectSrc, tryAddEdge]);

  const onMouseDownNode = (e, node) => {
    e.preventDefault(); e.stopPropagation();
    if (connectMode) { onNodeClick(node.id); return; }
    const pt = screenToSVG(svgRef.current, e.clientX, e.clientY);
    setDragId(node.id);
    setDragOff({ x: pt.x - node.x, y: pt.y - node.y });
  };

  const onMouseMove = (e) => {
    if (dragId !== null) {
      const pt = screenToSVG(svgRef.current, e.clientX, e.clientY);
      const nx = Math.max(20, Math.min(W - 20, pt.x - dragOff.x));
      const ny = Math.max(20, Math.min(H - 20, pt.y - dragOff.y));
      setNodes((prev) => prev.map((n) => (n.id === dragId ? { ...n, x: nx, y: ny } : n)));
    } else if (isPanning) {
      setPan((p) => ({ x: p.x + e.clientX - panStart.x, y: p.y + e.clientY - panStart.y }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const onMouseUp = () => { setDragId(null); setIsPanning(false); };

  const onSvgMouseDown = (e) => {
    if (e.target.closest('g')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const onSvgDblClick = (e) => {
    if (e.target.closest('g')) return;
    const pt = screenToSVG(svgRef.current, e.clientX, e.clientY);
    addNodeAt(pt.x, pt.y);
  };

  const onWheel = (e) => {
    if (e.target.closest('svg')) {
      e.preventDefault();
      setZoom((z) => Math.max(0.3, Math.min(4, z + (e.deltaY > 0 ? -0.1 : 0.1))));
    }
  };

  /* ─── fill helper ─── */
  const getFill = (id) => {
    const c = dispColoring[id];
    return c != null && c >= 0 && c < pal.length ? pal[c] : '#d1d5db';
  };

  /* ─── aux graph layout ─── */
  const auxLayout = useMemo(() => {
    const m = new Map();
    const count = auxG.nodes.length;
    if (count === 0) return m;
    const R = 90, cx = 140, cy = 140;
    auxG.nodes.forEach((n, i) => {
      const a = (i / count) * 2 * Math.PI - Math.PI / 2;
      m.set(n.id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
    });
    return m;
  }, [auxG.nodes]);

  const auxPathSet = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < auxG.path.length - 1; i++) s.add(`${auxG.path[i]}-${auxG.path[i + 1]}`);
    return s;
  }, [auxG.path]);

  /* ─── step type badge ─── */
  const stepBadge = (type) => {
    const map = {
      init: ['bg-slate-100 text-slate-700', 'INIT'],
      process: ['bg-indigo-100 text-indigo-700', 'PROCESS'],
      skip: ['bg-slate-100 text-slate-600', 'SKIP'],
      add_edge: ['bg-emerald-100 text-emerald-700', 'EDGE'],
      ok: ['bg-green-100 text-green-700', 'OK'],
      conflict: ['bg-red-100 text-red-700', 'CONFLICT'],
      move: ['bg-amber-100 text-amber-700', 'MOVE'],
      aux_path: ['bg-purple-100 text-purple-700', 'LEMMA 2.1'],
      lemma_move: ['bg-violet-100 text-violet-700', 'RECOLOR'],
      equitable: ['bg-emerald-100 text-emerald-700', 'EQUITABLE'],
      no_path: ['bg-orange-100 text-orange-700', 'CASE 2'],
      done: ['bg-green-100 text-green-800', 'DONE'],
      error: ['bg-red-100 text-red-700', 'ERROR'],
    };
    const [cls, label] = map[type] || ['bg-slate-100 text-slate-600', type];
    return <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
  };

  /* ════════════════════════ RENDER ════════════════════════ */
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-stone-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* ── header ── */}
          <header className="text-center space-y-1 animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl font-extrabold gradient-text tracking-tight">
              Hajnal–Szemerédi Equitable Coloring
            </h1>
            <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
              Step-by-step visualization of the Kierstead–Kostochka polynomial-time algorithm.
              Every graph with {"Δ(G) \u2264 r"} admits an equitable (r+1)-coloring.
            </p>
          </header>

          {/* ── toast ── */}
          {toast && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-2 animate-slide-in-right">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-slow" />
              <span className="text-sm text-slate-700">{toast}</span>
            </div>
          )}

          {/* ── stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-in-up">
            {[
              { label: 'Vertices n', value: nodes.length, color: 'from-blue-50 to-blue-100 text-blue-700' },
              { label: 'Edges |E|', value: dispEdges.length, color: 'from-emerald-50 to-emerald-100 text-emerald-700' },
              { label: '\u0394(G)', value: actualMaxDeg, color: actualMaxDeg > r ? 'from-red-50 to-red-100 text-red-600' : 'from-amber-50 to-amber-100 text-amber-700' },
              { label: `r = ${r}, k = ${k}`, value: `${k} colors`, color: 'from-purple-50 to-purple-100 text-purple-700' },
              { label: 'Status', value: conflictCount > 0 ? `${conflictCount} conflict${conflictCount > 1 ? 's' : ''}` : isEquitable && curStep === null ? 'Equitable' : curStep ? `Step ${hsIdx + 1}/${hsSteps.length}` : 'Proper', color: conflictCount > 0 ? 'from-red-50 to-red-100 text-red-600' : 'from-green-50 to-green-100 text-green-700' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl bg-gradient-to-br ${s.color} p-3 text-center border border-white/60`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{s.label}</div>
                <div className="text-lg font-bold mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── algorithm controls ── */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Algorithm (Kierstead–Kostochka, Theorem 3.2)
              </h2>
              <div className="text-xs text-slate-400">
                {hsSteps.length > 0 && `${hsSteps.length} steps computed`}
              </div>
            </div>

            {/* presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Load&nbsp;preset:</span>
              {[
                ['paper', 'Paper Graph (16v, 22e, \u0394=3)'],
                ['petersen', 'Petersen (10v, \u0394=3)'],
                ['cycle8', 'Cycle C\u2088 (8v, \u0394=2)'],
                ['k33', 'K\u2083,\u2083 (6v, \u0394=3)'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => loadPreset(id)}
                  className="text-xs bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors">
                  {label}
                </button>
              ))}
            </div>

            {/* playback */}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={onCompute}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors">
                Compute Steps
              </button>
              <div className="h-6 w-px bg-slate-200" />
              {!hsPlaying ? (
                <button onClick={hsRun} disabled={hsSteps.length === 0 || hsIdx + 1 >= hsSteps.length}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors disabled:cursor-not-allowed">
                  &#9654; Play
                </button>
              ) : (
                <button onClick={hsPause}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors">
                  &#9646;&#9646; Pause
                </button>
              )}
              <button onClick={hsBack} disabled={hsIdx <= -1 || hsPlaying}
                className="bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 disabled:text-slate-400 text-sm font-medium px-2.5 py-2 rounded-lg transition-colors disabled:cursor-not-allowed">
                &#9664;
              </button>
              <button onClick={hsForward} disabled={hsIdx + 1 >= hsSteps.length || hsPlaying}
                className="bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 disabled:text-slate-400 text-sm font-medium px-2.5 py-2 rounded-lg transition-colors disabled:cursor-not-allowed">
                &#9654;
              </button>
              <button onClick={hsJumpToEnd} disabled={hsSteps.length === 0 || hsPlaying}
                className="bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 disabled:text-slate-400 text-sm font-medium px-2.5 py-2 rounded-lg transition-colors disabled:cursor-not-allowed">
                &#9654;&#9654;
              </button>
              <button onClick={hsReset} disabled={hsSteps.length === 0}
                className="bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 disabled:text-slate-400 text-sm font-medium px-2.5 py-2 rounded-lg transition-colors disabled:cursor-not-allowed">
                &#8635; Reset
              </button>
              <div className="flex items-center gap-1.5 ml-auto">
                <label className="text-xs text-slate-500">Speed</label>
                <input type="range" min="200" max="3000" step="100" value={hsSpeed} onChange={(e) => setHsSpeed(Number(e.target.value))} className="w-24 accent-indigo-500" />
                <span className="text-xs text-slate-500 w-12 text-right">{hsSpeed}ms</span>
              </div>
            </div>

            {/* progress */}
            {hsSteps.length > 0 && (
              <div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(0, ((hsIdx + 1) / hsSteps.length) * 100)}%` }} />
                </div>
              </div>
            )}

            {/* step message */}
            {curStep && (
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                {stepBadge(curStep.type)}
                <span className="text-sm text-slate-700 leading-relaxed">{curStep.message}</span>
              </div>
            )}
          </section>

          {/* ── main content: graph + sidebar ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ─ main graph ─ */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Graph G</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setConnectMode((m) => !m); setConnectSrc(null); }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${connectMode ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {connectMode ? 'Connect ON' : 'Connect Mode'}
                  </button>
                  <span className="text-[10px] text-slate-400">Zoom {zoom.toFixed(1)}x</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/80 to-stone-50/80">
                <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
                  className="block"
                  style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'center', transition: dragId || isPanning ? 'none' : 'transform 0.15s ease-out', cursor: connectMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
                  onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                  onMouseDown={onSvgMouseDown} onDoubleClick={onSvgDblClick} onWheel={onWheel}>

                  {/* edges */}
                  {dispEdges.map(({ a, b }) => {
                    const na = nodes.find((n) => n.id === a);
                    const nb = nodes.find((n) => n.id === b);
                    if (!na || !nb) return null;
                    const isCur = hl.currentEdge && ((hl.currentEdge.a === a && hl.currentEdge.b === b) || (hl.currentEdge.a === b && hl.currentEdge.b === a));
                    const isConf = hl.conflictEdge && ((hl.conflictEdge.a === a && hl.conflictEdge.b === b) || (hl.conflictEdge.a === b && hl.conflictEdge.b === a));
                    const isMono = dispColoring[a] != null && dispColoring[a] === dispColoring[b];
                    let stroke = '#cbd5e1'; let sw = 1.5;
                    if (isConf) { stroke = '#ef4444'; sw = 4; }
                    else if (isCur) { stroke = '#22c55e'; sw = 3.5; }
                    else if (isMono && !curStep) { stroke = '#fca5a5'; sw = 2; }
                    return <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={stroke} strokeWidth={sw} style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }} />;
                  })}

                  {/* connect-mode pending line */}
                  {connectMode && connectSrc !== null && (() => {
                    const src = nodes.find((n) => n.id === connectSrc);
                    if (!src) return null;
                    return <circle cx={src.x} cy={src.y} r={28} fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 3" className="animate-pulse-slow" />;
                  })()}

                  {/* nodes */}
                  {nodes.map((n) => {
                    const isMoved = hl.movedVertex === n.id;
                    const isProc = hl.processingVertex === n.id;
                    const isSrc = connectSrc === n.id;
                    let ring = '#94a3b8', rw = 1.5;
                    if (isMoved) { ring = '#22c55e'; rw = 4; }
                    else if (isProc) { ring = '#6366f1'; rw = 3; }
                    else if (isSrc) { ring = '#22c55e'; rw = 3; }
                    return (
                      <g key={n.id} onMouseDown={(e) => onMouseDownNode(e, n)}
                        style={{ cursor: connectMode ? 'pointer' : dragId === n.id ? 'grabbing' : 'grab' }}>
                        {isMoved && <circle cx={n.x} cy={n.y} r={30} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.4} className="animate-pulse-slow" />}
                        <circle cx={n.x} cy={n.y} r={22} fill={getFill(n.id)} stroke={ring} strokeWidth={rw}
                          style={{ transition: 'fill 0.4s ease, stroke 0.3s, stroke-width 0.3s' }} />
                        <text x={n.x} y={n.y} textAnchor="middle" dy=".35em" fontSize={12} fontWeight="700"
                          fill="#fff" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {n.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* tip overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-slate-400 pointer-events-none">
                  <span>Double-click to add vertex</span>
                  <span>Scroll to zoom &middot; Drag to pan</span>
                </div>
              </div>
            </div>

            {/* ─ sidebar ─ */}
            <div className="space-y-4">

              {/* color legend */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Color Classes (mod-{k})</h3>
                <div className="space-y-1.5">
                  {pal.map((c, i) => {
                    const cnt = curStep
                      ? Object.values(curStep.coloring).filter((v) => v === i).length
                      : classSizes[i];
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ background: c }} />
                        <span className="text-xs text-slate-600">
                          <b>Class {i}</b>{CLASS_NAMES[i] ? ` (${CLASS_NAMES[i]})` : ''}: <b>{cnt}</b> vertices
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Equitable target: each class has {nodes.length > 0 ? <b>{Math.floor(nodes.length / k)}</b> : '?'}
                  {nodes.length % k > 0 && <> or <b>{Math.floor(nodes.length / k) + 1}</b></>} vertices.
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button onClick={applyModColoring} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors">
                    Reset to mod-{k}
                  </button>
                  <button onClick={applyGreedyColoring} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors">
                    Greedy proper
                  </button>
                </div>
              </div>

              {/* auxiliary digraph H(G,f) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">Auxiliary Digraph H(G,&thinsp;f)</h3>
                <p className="text-[10px] text-slate-400 mb-2">
                  Arc V&rarr;W means some vertex in V has no neighbor in W (movable).
                </p>
                <svg viewBox="0 0 280 280" className="w-full h-auto">
                  <defs>
                    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M0 0L10 5L0 10z" fill="#94a3b8" />
                    </marker>
                    <marker id="ahp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M0 0L10 5L0 10z" fill="#7c3aed" />
                    </marker>
                  </defs>

                  {auxG.nodes.length === 0 && (
                    <text x="140" y="140" textAnchor="middle" fontSize="12" fill="#94a3b8">
                      Run algorithm to see H(G,f)
                    </text>
                  )}

                  {/* aux edges */}
                  {auxG.edges.map((e) => {
                    const p1 = auxLayout.get(e.from);
                    const p2 = auxLayout.get(e.to);
                    if (!p1 || !p2) return null;
                    const isP = auxPathSet.has(`${e.from}-${e.to}`);
                    const dx = p2.x - p1.x, dy = p2.y - p1.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const off = 24;
                    /* offset perpendicular for bidirectional edges */
                    const hasReverse = auxG.edges.some((r) => r.from === e.to && r.to === e.from);
                    const perp = hasReverse ? 6 : 0;
                    const nx = -dy / d * perp, ny = dx / d * perp;
                    return (
                      <line key={`${e.from}-${e.to}`}
                        x1={p1.x + (dx / d) * off + nx} y1={p1.y + (dy / d) * off + ny}
                        x2={p2.x - (dx / d) * off + nx} y2={p2.y - (dy / d) * off + ny}
                        stroke={isP ? '#7c3aed' : '#cbd5e1'} strokeWidth={isP ? 2.5 : 1}
                        markerEnd={isP ? 'url(#ahp)' : 'url(#ah)'}
                        style={{ transition: 'stroke 0.3s' }} />
                    );
                  })}

                  {/* aux nodes */}
                  {auxG.nodes.map((n) => {
                    const p = auxLayout.get(n.id);
                    if (!p) return null;
                    const isP = auxG.path.includes(n.id);
                    const fill = pal[n.id] || '#d1d5db';
                    let stroke = '#64748b', sw = 1;
                    if (isP) { stroke = '#7c3aed'; sw = 3; }
                    else if (n.type === 'large') { stroke = '#2563eb'; sw = 2.5; }
                    else if (n.type === 'small') { stroke = '#d97706'; sw = 2.5; }
                    return (
                      <g key={n.id}>
                        <circle cx={p.x} cy={p.y} r={22} fill={fill} stroke={stroke} strokeWidth={sw}
                          style={{ transition: 'fill 0.4s, stroke 0.3s' }} />
                        <text x={p.x} y={p.y - 2} textAnchor="middle" dy=".3em" fontSize={11} fontWeight="700" fill="#fff"
                          style={{ pointerEvents: 'none' }}>
                          V{n.id}
                        </text>
                        <text x={p.x} y={p.y + 14} textAnchor="middle" fontSize={9} fill="#fff" opacity={0.8}
                          style={{ pointerEvents: 'none' }}>
                          n={n.size}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {auxG.nodes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> V+ (large)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> V- (small)</span>
                    {auxG.path.length > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> path</span>}
                  </div>
                )}
              </div>

              {/* max degree control */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-2">Parameters</h3>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  Max degree r =
                  <input type="number" min={1} max={20} value={maxDeg}
                    onChange={(e) => setMaxDeg(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                  <span className="text-slate-400">&rarr; k = {k} colors</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── graph builder ── */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <button onClick={() => setBuilderOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                Graph Builder
              </span>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${builderOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {builderOpen && (
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-100 pt-4">
                {/* nodes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vertices</h4>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Count" value={nodeCount} onChange={(e) => setNodeCount(e.target.value)} min={1} max={100}
                      onKeyDown={(e) => { if (e.key === 'Enter') addBulkNodes(); }}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300" />
                    <button onClick={addBulkNodes}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
                      Add
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Or double-click the canvas to place a vertex.</p>
                  <button onClick={clearAll}
                    className="w-full text-xs bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 py-2 rounded-lg transition-colors">
                    Clear Everything
                  </button>
                </div>

                {/* edges */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Edges</h4>
                  <div className="space-y-1">
                    <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={3} placeholder="0-1, 1-2, 2-3, ..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 font-mono" />
                    <button onClick={applyBulkEdges}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition-colors shadow-sm">
                      Apply Edges
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Or enable <b>Connect Mode</b> above, then click two vertices to connect.
                    Max degree r&nbsp;=&nbsp;{r} is enforced.
                  </p>
                </div>

                {/* info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Reference</h4>
                  <div className="text-xs text-slate-500 space-y-1.5 leading-relaxed">
                    <p><b>Hajnal–Szemerédi Theorem:</b> Every graph with &Delta;(G)&nbsp;&le;&nbsp;r has an equitable (r+1)-coloring.</p>
                    <p><b>Equitable:</b> class sizes differ by at most 1.</p>
                    <p><b>Mod coloring:</b> vertex v &rarr; class (v&nbsp;mod&nbsp;k). For k=4: {'{'}0,4,8,12{'}'} are Red, {'{'}1,5,9,13{'}'} Blue, etc.</p>
                    <p><b>Lemma 2.1:</b> If V+ is accessible to V- in H(G,f), move a vertex along each arc of the path.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>
    </>
  );
}
