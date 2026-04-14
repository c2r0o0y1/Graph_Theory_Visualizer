import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Components/NavBar';
import Home from './Pages/Home';
import BFS from './Pages/BFS';
import DFS from './Pages/DFS';
import Bipartite from './Pages/Bipartite';
import GreedyColor from './Pages/GreedyColor';
import EdgeColor from './Pages/EdgeColor';
import Hall from './Pages/Hall';
import HSAlgo from './Pages/HSAlgo';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bfs" element={<BFS />} />
        <Route path="/dfs" element={<DFS />} />
        <Route path="/bipartite" element={<Bipartite />} />
        <Route path="/greedy-color" element={<GreedyColor />} />
        <Route path="/edge-color" element={<EdgeColor />} />
        <Route path="/hall" element={<Hall />} />
        <Route path="/hs-algo" element={<HSAlgo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}