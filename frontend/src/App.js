import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Components/NavBar';
import BFS from './Pages/BFS';
import HSAlgo from './Pages/HSAlgo';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/bfs" replace />} />
        <Route path="/bfs" element={<BFS />} />
        <Route path="/hs-algo" element={<HSAlgo />} />
        <Route path="*" element={<Navigate to="/bfs" replace />} />
      </Routes>
    </BrowserRouter>
  );
}