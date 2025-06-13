import React, { useState } from 'react';
import { shortestPath } from '../algorithms/shortestPath';

export default function GraphVisualizer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [path, setPath] = useState([]);

  const width = 600;
  const height = 400;

  const addNode = () => {
    const id = nodes.length + 1;
    const x = Math.random() * (width - 40) + 20;
    const y = Math.random() * (height - 40) + 20;
    setNodes([...nodes, { id, x, y }]);
  };

  const deleteNode = (num) => {
    const id = parseInt(num);
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.from !== id && e.to !== id));
  };

  const addEdge = (f, t) => {
    const from = parseInt(f), to = parseInt(t);
    if (isNaN(from) || isNaN(to)) return;
    setEdges([...edges, { from, to }]);
  };

  const deleteEdge = (f, t) => {
    const from = parseInt(f), to = parseInt(t);
    setEdges(edges.filter(e => !(e.from === from && e.to === to)));
  };

  const compute = () => {
    // build adjacency list
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(({ from, to }) => {
      adj[from].push(to);
      adj[to].push(from);
    });
    const result = shortestPath(adj, parseInt(start), parseInt(end));
    setPath(result);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <button onClick={addNode}>Add Node</button>
        <input placeholder="Delete node #" onBlur={e => deleteNode(e.target.value)} />
        <input placeholder="Edge from#" onBlur={e => addEdge(e.target.value, '')} style={{ width: 80 }} />
        <input placeholder="to#" onBlur={e => { const last = edges.pop(); addEdge(last?.from, e.target.value); }} style={{ width: 80 }} />
        <input placeholder="Del edge from#" onBlur={e => deleteEdge(e.target.value, '')} style={{ width: 120 }} />
        <input placeholder="to#" onBlur={e => { const last = []; deleteEdge(last?.from, e.target.value); }} style={{ width: 80 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <input placeholder="Start#" value={start} onChange={e => setStart(e.target.value)} style={{ width: 80 }} />
        <input placeholder="End#" value={end} onChange={e => setEnd(e.target.value)} style={{ width: 80 }} />
        <button onClick={compute}>Compute Shortest Path</button>
      </div>
      <svg width={width} height={height} style={{ border: '1px solid #ccc' }}>
        {edges.map((e, i) => {
          const a = nodes.find(n => n.id === e.from);
          const b = nodes.find(n => n.id === e.to);
          if (!a || !b) return null;
          // highlight edge if both ends in path and consecutive
          const idxA = path.indexOf(e.from);
          const idxB = path.indexOf(e.to);
          const isOnPath = Math.abs(idxA - idxB) === 1;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isOnPath ? 'orange' : '#999'}
              strokeWidth={2}
            />
          );
        })}

        {nodes.map(n => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={20}
              fill={path.includes(n.id) ? 'orange' : 'lightblue'}
              stroke="black"
            />
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dy=".3em"
              fontSize={12}
            >
              {n.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}