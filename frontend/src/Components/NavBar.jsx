import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkBase =
    'px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  const linkStyles = ({ isActive }) =>
    [
      linkBase,
      isActive ? 'bg-blue-600 text-white shadow' : 'text-slate-700 hover:bg-slate-100',
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white font-bold">G</span>
            <span className="text-slate-800 font-semibold">Graph Visualizer</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/bfs" className={linkStyles}>Bfs</NavLink>
            <NavLink to="/hs-algo" className={linkStyles}>HS ALGO</NavLink>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Mobile menu */}
        <div id="primary-nav" className={`${open ? 'block' : 'hidden'} md:hidden pb-3`}>
          <div className="flex flex-col gap-2">
            <NavLink to="/bfs" className={linkStyles} onClick={() => setOpen(false)}>Bfs</NavLink>
            <NavLink to="/hs-algo" className={linkStyles} onClick={() => setOpen(false)}>HS ALGO</NavLink>
          </div>
        </div>
      </nav>
    </header>
  );
}
