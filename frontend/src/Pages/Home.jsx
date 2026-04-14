import React from 'react';
import { Link } from 'react-router-dom';

const cards = [
  {
    to: '/bfs',
    title: 'Breadth-First Search',
    subtitle: 'Wavefront exploration and shortest unweighted paths.',
    tone: 'from-sky-100 via-blue-50 to-cyan-100',
  },
  {
    to: '/dfs',
    title: 'Depth-First Search',
    subtitle: 'Branch commitment, backtracking, timestamps, edge classes.',
    tone: 'from-amber-100 via-orange-50 to-rose-100',
  },
  {
    to: '/bipartite',
    title: 'Bipartite Detection',
    subtitle: 'Live 2-coloring with explicit odd-cycle conflicts.',
    tone: 'from-indigo-100 via-violet-50 to-fuchsia-100',
  },
  {
    to: '/greedy-color',
    title: 'Greedy Vertex Coloring',
    subtitle: "Ordering strategies with Brooks' theorem context.",
    tone: 'from-emerald-100 via-teal-50 to-cyan-100',
  },
  {
    to: '/edge-color',
    title: 'Edge Coloring',
    subtitle: "Greedy edge assignments under Vizing's theorem.",
    tone: 'from-yellow-100 via-amber-50 to-lime-100',
  },
  {
    to: '/hall',
    title: "Hall's Marriage Theorem",
    subtitle: 'Augmenting paths, matchings, and explicit Hall blockers.',
    tone: 'from-pink-100 via-rose-50 to-red-100',
  },
  {
    to: '/hs-algo',
    title: 'Hajnal-Szemeredi Algorithm',
    subtitle: 'Equitable coloring simulation with theorem-driven steps.',
    tone: 'from-slate-200 via-slate-50 to-zinc-100',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#dbeafe_0%,transparent_35%),radial-gradient(circle_at_85%_20%,#fde68a_0%,transparent_33%),radial-gradient(circle_at_70%_80%,#c7d2fe_0%,transparent_40%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] py-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <section className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-lg p-6 md:p-10">
          <p className="uppercase tracking-[0.2em] text-xs font-semibold text-slate-500 mb-3">
            Graph Theory Visualizer
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
            Formal definitions are useful.
            <br />
            Motion is better.
          </h1>
          <p className="mt-5 text-slate-700 text-base md:text-lg max-w-4xl leading-relaxed">
            Most graph theory courses give you notation. Definitions, theorems,
            adjacency matrices. What they do not give you is what an algorithm
            feels like while it runs: where it goes first, why it changes
            direction, when it gets stuck, and what structure it leaves behind.
          </p>
          <p className="mt-4 text-slate-700 text-base md:text-lg max-w-4xl leading-relaxed">
            This project is an interactive visualizer built to make that motion
            visible. BFS expands level by level. DFS dives, dead-ends, climbs
            back. Bipartite checking becomes live 2-coloring; when it fails, the
            conflict edge appears exactly where the odd cycle breaks the rule.
            From there, the same visual logic extends to greedy vertex coloring,
            edge coloring with Vizing bounds, Hall's theorem via augmenting
            paths, and equitable coloring through the Hajnal-Szemeredi pipeline.
          </p>
          <p className="mt-4 text-slate-700 text-base md:text-lg max-w-4xl leading-relaxed">
            Graph state is editable on canvas. You can step one move at a time,
            inspect internal structures like queues, stacks, visited sets,
            matching maps, and color classes, then replay at different speeds.
            The point is simple: classical results should not feel abstract once
            you can watch them unfold.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Explore Visualizers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className={`rounded-xl border border-slate-200 bg-gradient-to-br ${card.tone} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
              >
                <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-700">{card.subtitle}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Open Module
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
