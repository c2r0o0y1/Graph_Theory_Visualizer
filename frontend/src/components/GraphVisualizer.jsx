import React, { useState } from 'react';
import { shortestPath } from '../algorithms/shortestPath';

export default function GraphVisualizer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [path, setPath] = useState([]);
  const [addEdgeFrom, setAddEdgeFrom] = useState('');
  const [addEdgeTo, setAddEdgeTo] = useState('');
  const [deleteEdgeFrom, setDeleteEdgeFrom] = useState('');
  const [deleteEdgeTo, setDeleteEdgeTo] = useState('');
  const [deleteNodeId, setDeleteNodeId] = useState('');
  const [bulkNodeCount, setBulkNodeCount] = useState('');
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const width = 800;
  const height = 500;

  const addNode = () => {
    const id = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 1;
    const nodeRadius = 25;
    const minDistance = nodeRadius * 2 + 10;
    
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      x = Math.random() * (width - 80) + 40;
      y = Math.random() * (height - 80) + 40;
      attempts++;
    } while (attempts < maxAttempts && nodes.some(node => {
      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      return distance < minDistance;
    }));
    
    setNodes([...nodes, { id, x, y }]);
  };

  const addBulkNodes = () => {
    const count = parseInt(bulkNodeCount);
    if (isNaN(count) || count <= 0 || count > 50) {
      alert('Please enter a valid number between 1 and 50');
      return;
    }

    const newNodes = [];
    const nodeRadius = 25;
    const minDistance = nodeRadius * 2 + 10;
    const startId = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 1;
    const allExistingNodes = [...nodes];

    for (let i = 0; i < count; i++) {
      const id = startId + i;
      let x, y;
      let attempts = 0;
      const maxAttempts = 200;
      
      do {
        x = Math.random() * (width - 80) + 40;
        y = Math.random() * (height - 80) + 40;
        attempts++;
      } while (attempts < maxAttempts && [...allExistingNodes, ...newNodes].some(node => {
        const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        return distance < minDistance;
      }));
      
      newNodes.push({ id, x, y });
    }

    setNodes([...nodes, ...newNodes]);
    setBulkNodeCount('');
  };

  const deleteNode = () => {
    const id = parseInt(deleteNodeId);
    if (isNaN(id)) return;
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.from !== id && e.to !== id));
    setDeleteNodeId('');
  };

  const addEdge = () => {
    const fromId = parseInt(addEdgeFrom);
    const toId = parseInt(addEdgeTo);
    if (isNaN(fromId) || isNaN(toId) || fromId === toId) return;
    
    const edgeExists = edges.some(e => 
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    
    if (!edgeExists) {
      setEdges([...edges, { from: fromId, to: toId }]);
    }
    setAddEdgeFrom('');
    setAddEdgeTo('');
  };

  const deleteEdge = () => {
    const fromId = parseInt(deleteEdgeFrom);
    const toId = parseInt(deleteEdgeTo);
    if (isNaN(fromId) || isNaN(toId)) return;
    setEdges(edges.filter(e => 
      !((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))
    ));
    setDeleteEdgeFrom('');
    setDeleteEdgeTo('');
  };

  const compute = () => {
    if (!start || !end) return;
    
    const startId = parseInt(start);
    const endId = parseInt(end);
    
    const startNode = nodes.find(n => n.id === startId);
    const endNode = nodes.find(n => n.id === endId);
    
    if (!startNode || !endNode) {
      alert('Start or end node does not exist!');
      return;
    }
    
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    
    edges.forEach(({ from, to }) => {
      if (adj[from] && adj[to]) {
        adj[from].push(to);
        adj[to].push(from);
      }
    });
    
    const result = shortestPath(adj, startId, endId);
    setPath(result);
  };

  const clearGraph = () => {
    setNodes([]);
    setEdges([]);
    setPath([]);
    setStart('');
    setEnd('');
    setAddEdgeFrom('');
    setAddEdgeTo('');
    setDeleteEdgeFrom('');
    setDeleteEdgeTo('');
    setDeleteNodeId('');
    setBulkNodeCount('');
    setDraggedNode(null);
  };

  const handleMouseDown = (e, node) => {
    e.preventDefault();
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setDraggedNode(node.id);
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggedNode) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newX = Math.max(25, Math.min(width - 25, mouseX - dragOffset.x));
    const newY = Math.max(25, Math.min(height - 25, mouseY - dragOffset.y));
    
    setNodes(nodes.map(node => 
      node.id === draggedNode 
        ? { ...node, x: newX, y: newY }
        : node
    ));
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Graph Theory Visualizer</h1>
          <p className="text-gray-600">Interactive Graph Theory Visualizer</p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Node Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">Node Operations</h3>
              
              {/* Single Node */}
              <button 
                onClick={addNode}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Add Single Node
              </button>

              {/* Bulk Nodes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Add Multiple Nodes</label>
                <input 
                  type="number"
                  placeholder="Number of nodes (1-50)"
                  value={bulkNodeCount}
                  onChange={(e) => setBulkNodeCount(e.target.value)}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addBulkNodes();
                    }
                  }}
                />
                <button 
                  onClick={addBulkNodes}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Add Bulk Nodes
                </button>
              </div>

              {/* Delete Node */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Delete Node</label>
                <input 
                  type="number"
                  placeholder="Node ID to Delete"
                  value={deleteNodeId}
                  onChange={(e) => setDeleteNodeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      deleteNode();
                    }
                  }}
                />
                <button 
                  onClick={deleteNode}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Delete Node
                </button>
              </div>
            </div>

            {/* Edge Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">Edge Operations</h3>
              
              {/* Add Edge */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Add Edge</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    placeholder="From"
                    value={addEdgeFrom}
                    onChange={(e) => setAddEdgeFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input 
                    type="number"
                    placeholder="To"
                    value={addEdgeTo}
                    onChange={(e) => setAddEdgeTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addEdge();
                      }
                    }}
                  />
                </div>
                <button 
                  onClick={addEdge}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Add Edge
                </button>
              </div>

              {/* Delete Edge */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Delete Edge</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    placeholder="From"
                    value={deleteEdgeFrom}
                    onChange={(e) => setDeleteEdgeFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <input 
                    type="number"
                    placeholder="To"
                    value={deleteEdgeTo}
                    onChange={(e) => setDeleteEdgeTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        deleteEdge();
                      }
                    }}
                  />
                </div>
                <button 
                  onClick={deleteEdge}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Delete Edge
                </button>
              </div>
            </div>

            {/* Path Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">Path Finding</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    placeholder="Start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input 
                    type="number"
                    placeholder="End"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        compute();
                      }
                    }}
                  />
                </div>
                <button 
                  onClick={compute}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Find Shortest Path
                </button>
                <button 
                  onClick={clearGraph}
                  className="w-full bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Graph
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Stats */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Nodes:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{nodes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Edges:</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{edges.length}</span>
            </div>
            {nodes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Node IDs:</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">{nodes.map(n => n.id).sort((a, b) => a - b).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Graph Visualization */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Graph Visualization</h3>
            {path.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Path: {path.join(' → ')} (Length: {path.length - 1})
              </div>
            )}
          </div>
          
          <div className="flex justify-center overflow-x-auto">
            <svg 
              width={width} 
              height={height} 
              className="border-2 border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 min-w-full"
              viewBox={`0 0 ${width} ${height}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Edges */}
              {edges.map((e, i) => {
                const a = nodes.find(n => n.id === e.from);
                const b = nodes.find(n => n.id === e.to);
                if (!a || !b) return null;
                
                const idxA = path.indexOf(e.from);
                const idxB = path.indexOf(e.to);
                const isOnPath = idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1;
                
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={isOnPath ? '#7C3AED' : '#9CA3AF'}
                    strokeWidth={isOnPath ? 3 : 2}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(n => (
                <g key={n.id}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={25}
                    fill={path.includes(n.id) ? '#7C3AED' : '#E5E7EB'}
                    stroke={path.includes(n.id) ? '#5B21B6' : '#6B7280'}
                    strokeWidth={path.includes(n.id) ? 3 : 2}
                    className="transition-all duration-300 cursor-move hover:stroke-gray-400"
                    onMouseDown={(e) => handleMouseDown(e, n)}
                    style={{ cursor: draggedNode === n.id ? 'grabbing' : 'grab' }}
                  />
                  <text
                    x={n.x}
                    y={n.y}
                    textAnchor="middle"
                    dy=".3em"
                    fontSize={14}
                    fontWeight="bold"
                    fill={path.includes(n.id) ? '#FFFFFF' : '#374151'}
                    className="transition-all duration-300 pointer-events-none select-none"
                  >
                    {n.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-2">Instructions:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Add single nodes with "Add Single Node" or multiple nodes at once with "Add Bulk Nodes"</li>
            <li>• For bulk addition, enter a number between 1-50 and click "Add Bulk Nodes"</li>
            <li>• Drag nodes around to reposition them and avoid overlaps</li>
            <li>• Create edges by entering node IDs and clicking "Add Edge"</li>
            <li>• Delete nodes or edges by entering IDs and clicking respective delete buttons</li>
            <li>• Find shortest path by entering start and end node IDs</li>
            <li>• Path nodes and edges will be highlighted in purple</li>
            <li>• View current graph stats (nodes, edges, node IDs) above the visualization</li>
            <li>• Use "Clear Graph" to start over</li>
          </ul>
        </div>
      </div>
    </div>
  );
}