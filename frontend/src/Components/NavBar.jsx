import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/bfs', label: 'BFS' },
  { to: '/dfs', label: 'DFS' },
  { to: '/bipartite', label: 'Bipartite' },
  { to: '/greedy-color', label: 'Greedy χ' },
  { to: '/edge-color', label: "Edge χ'" },
  { to: '/four-color', label: '4-Color' },
  { to: '/hall', label: "Hall's" },
  { to: '/hs-algo', label: 'H-S' },
];

const linkBase =
  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-cyan-500';

const linkStyles = ({ isActive }) =>
  [
    linkBase,
    isActive
      ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
  ].join(' ');

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-sm shadow">
              G
            </div>
            <div className="flex flex-col">
              <span className="text-slate-100 font-bold text-sm leading-tight tracking-tight">Graph Visualizer</span>
              <span className="text-xs text-slate-500 leading-tight font-mono">Interactive Research Tool</span>
            </div>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5 overflow-x-auto">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkStyles}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
            aria-controls="primary-nav"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span className="sr-only">Open main menu</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div id="primary-nav" className={`${open ? 'block' : 'hidden'} lg:hidden pb-3 pt-1`}>
          <div className="flex flex-col gap-0.5 bg-slate-900 rounded-lg p-2 border border-slate-800">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkStyles} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
