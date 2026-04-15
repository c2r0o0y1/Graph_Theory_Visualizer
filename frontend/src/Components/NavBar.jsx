import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/bfs', label: 'BFS' },
  { to: '/dfs', label: 'DFS' },
  { to: '/bipartite', label: 'Bipartite' },
  { to: '/greedy-color', label: 'Greedy Color' },
  { to: '/edge-color', label: 'Edge Color' },
  { to: '/four-color', label: '4-Color' },
  { to: '/hall', label: "Hall's Marriage" },
  { to: '/hs-algo', label: 'H-S Equitable' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkBase =
    'px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap';
  const linkStyles = ({ isActive }) =>
    [
      linkBase,
      isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-700 hover:bg-slate-100',
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold shadow-md">
              G
            </div>
            <div className="flex flex-col">
              <span className="text-slate-800 font-bold text-lg leading-tight">Graph Visualizer</span>
              <span className="text-xs text-slate-500 leading-tight">Interactive Learning Tool</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkStyles}>
                {l.label}
              </NavLink>
            ))}
          </div>

          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-controls="primary-nav"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span className="sr-only">Open main menu</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <div id="primary-nav" className={`${open ? 'block' : 'hidden'} lg:hidden pb-4 pt-2`}>
          <div className="flex flex-col gap-1 bg-slate-50 rounded-lg p-2">
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
