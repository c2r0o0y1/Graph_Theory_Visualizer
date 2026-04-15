import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── Algorithm tool palette data ─────────────────────────────────────── */
const TOOLS = [
  {
    id: 'bfs',
    to: '/bfs',
    label: 'BFS',
    name: 'Breadth-First Search',
    tag: 'Traversal',
    tagColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    desc: 'Wavefront expansion, level by level. Produces shortest-path distances in unweighted graphs. The queue state and distance labels are live overlays.',
    detail: 'Queue · Visited set · Distance labels · Shortest path highlight',
    app: 'Web crawling · Social network distance · Peer-to-peer routing',
  },
  {
    id: 'dfs',
    to: '/dfs',
    label: 'DFS',
    name: 'Depth-First Search',
    tag: 'Traversal',
    tagColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    desc: 'Commitment down a branch, backtrack on dead-ends. Assigns discovery / finish timestamps and classifies every edge as tree, back, forward, or cross.',
    detail: 'Stack · d/f timestamps · Edge classification · Directed toggle',
    app: 'Topological sort · Cycle detection · Compiler call graphs · Mazes',
  },
  {
    id: 'bipartite',
    to: '/bipartite',
    label: '2-Color',
    name: 'Bipartite Detection',
    tag: 'Coloring',
    tagColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    desc: 'BFS that colors as it goes. Clean result confirms the partition; conflict edge shows exactly where and why an odd cycle breaks bipartiteness.',
    detail: 'Live 2-coloring · Partition snap view · Odd-cycle conflict edge',
    app: 'Job assignment · Stable matching · RNA secondary structure',
  },
  {
    id: 'greedy-color',
    to: '/greedy-color',
    label: 'χ(G)',
    name: 'Greedy Vertex Coloring',
    tag: 'Coloring',
    tagColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    desc: "Five ordering strategies (DSATUR, Welsh-Powell, Smallest-last…). Result measured against Brooks' theorem bound — Kₙ and odd-cycle edge cases flagged explicitly.",
    detail: "DSATUR · Welsh-Powell · Brooks' bound · Color-class legend",
    app: 'Register allocation · Exam timetabling · Frequency assignment',
  },
  {
    id: 'edge-color',
    to: '/edge-color',
    label: "χ'(G)",
    name: 'Edge Coloring',
    tag: 'Coloring',
    tagColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    desc: "Greedy edge assignments; verdict badge reads Class 1 (χ'=Δ) or Class 2 (χ'=Δ+1). Presets include Kₙ, K_{m,n}, and the Petersen graph.",
    detail: "Vizing bound · Banned-set overlay · Class 1/2 detection",
    app: 'Round-robin scheduling · Wavelength assignment · Latin squares',
  },
  {
    id: 'four-color',
    to: '/four-color',
    label: '4C',
    name: 'Four Color Theorem',
    tag: 'Coloring',
    tagColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    desc: 'DSATUR drive with Kempe-chain recolorings when the greedy step gets boxed in. Appel–Haken (1976): every planar graph is 4-colorable.',
    detail: 'DSATUR · Kempe-chain swaps · Planarity Euler bound check',
    app: 'Political maps · Frequency reuse · Sudoku constraint propagation',
  },
  {
    id: 'hall',
    to: '/hall',
    label: 'Hall',
    name: "Hall's Marriage Theorem",
    tag: 'Matching',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    desc: 'Augmenting-path bipartite matching. When no perfect matching exists, the tight subset S with |N(S)| < |S| is outlined as an explicit Hall blocker.',
    detail: 'Augmenting paths · Hall blocker highlight · Match size tracker',
    app: 'Job-candidate assignment · Kidney exchange · Taxi dispatch',
  },
  {
    id: 'hs-algo',
    to: '/hs-algo',
    label: 'H-S',
    name: 'Hajnal–Szemerédi (Equitable)',
    tag: 'Advanced',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    desc: 'Kierstead–Kostochka algorithm for equitable (Δ+1)-coloring, one edge insertion at a time. Lemma 2.1 auxiliary digraph rendered live.',
    detail: 'Auxiliary digraph H(G,f) · BFS path to V⁻ · Equitability proof trace',
    app: 'Fair task distribution · Balanced scheduling · Load equalization',
  },
];

/* ─── H-S workflow steps ───────────────────────────────────────────────── */
const HS_STEPS = [
  { dot: 'bg-slate-500', label: 'G₀ — Empty', body: 'Start from the empty graph with an arbitrary equitable coloring f₀. Color classes are balanced to size ⌊n/(r+1)⌋.' },
  { dot: 'bg-cyan-400', label: 'Edge insertion', body: 'For each vertex vᵢ in order, add all edges from G that connect vᵢ to {v₀…vᵢ₋₁}. Active edge highlighted in cyan.' },
  { dot: 'bg-red-400', label: 'Conflict detection', body: 'If vᵢ lands in the same color class as a neighbor, a conflict edge fires red. The coloring is now nearly-equitable (one class ±1).' },
  { dot: 'bg-indigo-400', label: 'Active vertex', body: 'vᵢ is ringed in indigo. We search for a reachable color class V⁻ in the auxiliary digraph H(G, f) via BFS.' },
  { dot: 'bg-emerald-400', label: 'Lemma 2.1 path', body: 'A movable vertex is shifted along the path V⁺→…→V⁻. Each class on the path gains/loses one vertex, restoring equitability.' },
  { dot: 'bg-slate-300', label: 'Gᵢ — Equitable', body: 'fᵢ is now a valid equitable (r+1)-coloring of Gᵢ. Repeat until all vertices of G are processed.' },
];

/* ─── Component ────────────────────────────────────────────────────────── */
export default function Home() {
  const [activeTool, setActiveTool] = useState('bfs');
  const tool = TOOLS.find(t => t.id === activeTool) || TOOLS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase mb-6">
            Graph Theory Visualizer — Interactive Research Tool
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white max-w-4xl">
            Translating dense discrete mathematics into an{' '}
            <span className="text-cyan-400">interactive spatial laboratory.</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed">
            Graph theory deals with dynamic, evolving structures. We still teach
            it with static diagrams. This tool fixes that — BFS, DFS, Hall's
            theorem, Vizing's theorem, the Four Color Theorem, and the
            polynomial-time Kierstead–Kostochka algorithm, all animated,
            step-by-step.
          </p>
          <p className="mt-3 font-mono text-sm text-slate-500">
            Suman Dangal* · Saharsha Pandey · Chhandak Roy '24
            <span className="mx-3 text-slate-700">|</span>
            Advisor: Dr. Tyler Markenen
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://github.com/L00SIRE/Graph_Theory_Visualizer-1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              View Source
            </a>
            <Link
              to="/bfs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-semibold hover:bg-cyan-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              Open Visualizer
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Abstract ──────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase mb-3">Abstract</p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              Making Abstract Structures Tangible
            </h2>
          </div>
          <div className="md:col-span-2 space-y-4 text-slate-400 leading-relaxed">
            <p>
              Graph theory fundamentally deals with dynamic, evolving structures, yet
              we still largely teach it using static textbook diagrams and chalkboard
              proofs. This cognitive overload leads to an "illusion of understanding,"
              where learners passively watch a process without grasping the underlying logic.
            </p>
            <p>
              Our platform goes beyond traversal algorithms, uniquely extending into
              advanced combinatorics — visualizing proofs like Hall's marriage theorem,
              the four color theorem, Vizing's theorem, and the polynomial-time
              Kierstead–Kostochka algorithm for the Hajnal–Szemerédi Theorem.
            </p>
            <p>
              We let software do the heavy lifting of tracking algorithmic state, so
              students' brains can grasp the concept. Every algorithm pre-computes its
              full step history; scrubbing forward and backward is instant.
            </p>
          </div>
        </div>
      </section>

      {/* ── H-S Workflow ──────────────────────────────────────────────── */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase mb-3">H-S Simulator — UX Workflow</p>
          <h2 className="text-3xl font-bold text-white mb-2">
            The Kierstead–Kostochka Algorithm, Visualized
          </h2>
          <p className="text-slate-400 mb-10 max-w-2xl">
            Every snapshot of the algorithm is pre-computed. Navigate the proof by pressing a single key.
            Color coding maps directly to algorithmic role.
          </p>

          {/* Color legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            {[
              { dot: 'bg-cyan-400', ring: 'ring-cyan-400/30', label: 'Active edge', sub: 'currently being added' },
              { dot: 'bg-red-400', ring: 'ring-red-400/30', label: 'Conflict edge', sub: 'monochromatic neighbor' },
              { dot: 'bg-indigo-400', ring: 'ring-indigo-400/30', label: 'Active vertex', sub: 'vᵢ being processed' },
              { dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', label: 'Move target', sub: 'vertex being shifted' },
              { dot: 'bg-amber-400', ring: 'ring-amber-400/30', label: 'Lemma path', sub: 'V⁺ → … → V⁻' },
              { dot: 'bg-slate-500', ring: 'ring-slate-500/30', label: 'Settled', sub: 'equitable & stable' },
            ].map(({ dot, ring, label, sub }) => (
              <div key={label} className={`bg-slate-900 rounded-xl p-4 border border-slate-800 ring-1 ${ring}`}>
                <span className={`inline-block w-3 h-3 rounded-full ${dot} mb-2`} />
                <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">{sub}</p>
              </div>
            ))}
          </div>

          {/* Step timeline */}
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-800" />
            <div className="space-y-0">
              {HS_STEPS.map((s, i) => (
                <div key={i} className="flex gap-5 pb-8 last:pb-0">
                  <div className="relative flex-none pt-0.5">
                    <span className={`block w-6 h-6 rounded-full border-2 border-slate-950 ${s.dot} z-10 relative`} />
                  </div>
                  <div className="pt-0.5">
                    <p className="font-mono text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-xl">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Playback controls diagram */}
          <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Playback Controls</p>
            <div className="flex flex-wrap gap-3 items-center">
              {[
                { key: '◀', desc: 'Step back', accent: false },
                { key: '▶ Run', desc: 'Auto-play', accent: true },
                { key: '▶', desc: 'Step forward', accent: false },
                { key: '⟲', desc: 'Reset', accent: false },
                { key: '━━━━', desc: 'Speed slider (200 – 2000 ms)', accent: false, wide: true },
              ].map(({ key, desc, accent, wide }) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-mono font-semibold border ${wide ? 'min-w-[6rem]' : 'min-w-[3rem]'} ${accent ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {key}
                  </kbd>
                  <span className="text-xs text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tool Palette ──────────────────────────────────────────────── */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase mb-3">Modules</p>
          <h2 className="text-3xl font-bold text-white mb-10">Algorithm Tool Palette</h2>

          <div className="flex flex-col lg:flex-row gap-0 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Left: tool list */}
            <nav className="lg:w-56 flex-none border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60">
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors border-b border-slate-800/60 last:border-b-0 focus:outline-none focus:ring-inset focus:ring-1 focus:ring-cyan-500 ${activeTool === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-bold w-8 text-center ${activeTool === t.id ? 'text-cyan-400' : 'text-slate-600'}`}>{t.label}</span>
                    <span className="text-sm font-medium truncate">{t.name.split(' ').slice(0, 2).join(' ')}</span>
                  </span>
                  {activeTool === t.id && (
                    <svg className="w-3.5 h-3.5 text-cyan-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </nav>

            {/* Right: detail panel */}
            <div className="flex-1 bg-slate-900/30 p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${tool.tagColor}`}>{tool.tag}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{tool.name}</h3>
                </div>
                <Link
                  to={tool.to}
                  className="flex-none inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-semibold hover:bg-cyan-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  Open
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <p className="text-slate-300 leading-relaxed mb-6">{tool.desc}</p>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Live overlays</p>
                  <div className="flex flex-wrap gap-2">
                    {tool.detail.split(' · ').map(d => (
                      <span key={d} className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Applications</p>
                  <div className="flex flex-wrap gap-2">
                    {tool.app.split(' · ').map(a => (
                      <span key={a} className="text-xs font-mono bg-slate-800/50 text-slate-400 px-2.5 py-1 rounded border border-slate-800">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature strip ─────────────────────────────────────────────── */}
      <section className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800">
          {[
            { mono: 'O(1) seek', title: 'Pre-computed histories', body: 'Every step pre-baked. Scrub forward and back instantly at any speed.' },
            { mono: 'SVG + viewBox', title: 'Responsive canvas', body: 'Force-directed layout. Pan, drag, zoom. Nodes clamp to boundary — nothing escapes the frame.' },
            { mono: 'adj. list', title: 'Live state overlays', body: 'Queue, stack, visited sets, color assignments, matching maps — all readable, not console noise.' },
            { mono: 'Brooks · Vizing · Hall', title: 'Theorem bounds displayed', body: 'Every coloring result compared against the tightest known theoretical upper bound.' },
          ].map(({ mono, title, body }) => (
            <div key={title} className="bg-slate-950 p-6">
              <p className="font-mono text-xs text-cyan-400 mb-3">{mono}</p>
              <p className="text-sm font-semibold text-white mb-2">{title}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
        <span className="font-mono">graph-theory-visualizer</span>
        <span>Suman Dangal · Saharsha Pandey · Chhandak Roy '24 · Dr. Tyler Markenen</span>
      </footer>
    </div>
  );
}
