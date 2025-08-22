import React, { useState, useRef, useMemo, useEffect } from 'react';
import Navbar from '../Components/NavBar';

export default function HSAlgo() {
  const [nodes, setNodes] = useState([]);
  const [deleteNodeId, setDeleteNodeId] = useState('');
  const [bulkNodeCount, setBulkNodeCount] = useState('');
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Visualization features (kept)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // History (nodes-only)
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);


  const [enforceMaxDegree, setEnforceMaxDegree] = useState(false);
  const [maxDegree, setMaxDegree] = useState('');

  // Info banner
  const [info, setInfo] = useState('');

  const width = 800;
  const height = 500;
  const svgRef = useRef(null);


  const colorPalette = useMemo(() => {
    const rInt = parseInt(maxDegree, 10);
    if (!enforceMaxDegree || isNaN(rInt) || rInt < 0) return [];
    const k = rInt + 1;
    return Array.from({ length: k }, (_, i) =>
      `hsl(${Math.round((360 * i) / k)}, 70%, 55%)`
    );
  }, [enforceMaxDegree, maxDegree]); 
  
  
  const colorCounts = useMemo(() => {
    if (!colorPalette.length) return [];
    const rInt = parseInt(maxDegree, 10);
    const k = rInt + 1;
    const counts = Array.from({ length: k }, () => 0);
    nodes.forEach(n => {
      const idx = (n.id - 1) % k;
      counts[idx]++;
    });
    return counts;
  }, [nodes, colorPalette, maxDegree]);

  // History helpers (nodes-only)
  const saveToHistory = (newNodes, operation = '') => {
    const timestamp = Date.now();
    setHistory(prev => [
      ...prev.slice(0, currentStep),
      { nodes: newNodes, operation, timestamp }
    ]);
    setCurrentStep(prev => prev + 1);
  };

  const undo = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const previousState = history[newStep - 1] || { nodes: [] };
      setNodes(previousState.nodes);
      setCurrentStep(newStep);
      setInfo(`Undone: ${previousState.operation || 'Previous operation'}`);
    }
  };

  const redo = () => {
    if (currentStep < history.length) {
      const nextState = history[currentStep];
      setNodes(nextState.nodes);
      setCurrentStep(prev => prev + 1);
      setInfo(`Redone: ${nextState.operation || 'Next operation'}`);
    }
  };

  // Node ops
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
    } while (
      attempts < maxAttempts &&
      nodes.some(node => {
        const distance = Math.hypot(x - node.x, y - node.y);
        return distance < minDistance;
      })
    );

    const newNodes = [...nodes, { id, x, y }];
    setNodes(newNodes);
    saveToHistory(newNodes, `Added node ${id}`);
    setInfo(`Added node ${id}`);
  };

  const addBulkNodes = () => {
    const count = parseInt(bulkNodeCount, 10);
    if (isNaN(count) || count <= 0 || count > 50) {
      alert('Please enter a valid number between 1 and 50');
      return;
    }

    const newNodesToAdd = [];
    const nodeRadius = 25;
    const minDistance = nodeRadius * 2 + 10;
    const startId = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 1;

    for (let i = 0; i < count; i++) {
      const id = startId + i;
      let x, y;
      let attempts = 0;
      const maxAttempts = 200;

      do {
        x = Math.random() * (width - 80) + 40;
        y = Math.random() * (height - 80) + 40;
        attempts++;
      } while (
        attempts < maxAttempts &&
        [...nodes, ...newNodesToAdd].some(node => {
          const distance = Math.hypot(x - node.x, y - node.y);
          return distance < minDistance;
        })
      );

      newNodesToAdd.push({ id, x, y });
    }

    const finalNodes = [...nodes, ...newNodesToAdd];
    setNodes(finalNodes);
    setBulkNodeCount('');
    saveToHistory(finalNodes, `Added ${count} nodes (${startId}-${startId + count - 1})`);
    setInfo(`Added ${count} nodes`);
  };

  const deleteNode = () => {
    const id = parseInt(deleteNodeId, 10);
    if (isNaN(id)) return;
    const newNodes = nodes.filter(n => n.id !== id);
    setNodes(newNodes);
    setDeleteNodeId('');
    saveToHistory(newNodes, `Deleted node ${id}`);
    setInfo(`Deleted node ${id}`);
  };

  const clearGraph = () => {
    setNodes([]);
    setDeleteNodeId('');
    setBulkNodeCount('');
    setDraggedNode(null);
    setHistory([]);
    setCurrentStep(0);
    setInfo('Graph cleared');
  };

  // Zoom/pan/drag
  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handleWheel = (e) => {
    if (e.target.closest('svg')) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
    }
  };

  const handlePanStart = (e) => {
    if (e.target.tagName === 'circle') return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
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
    if (draggedNode) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = Math.max(25, Math.min(width - 25, mouseX - dragOffset.x));
      const newY = Math.max(25, Math.min(height - 25, mouseY - dragOffset.y));

      const newNodes = nodes.map(node =>
        node.id === draggedNode
          ? { ...node, x: newX, y: newY }
          : node
      );
      setNodes(newNodes);
    } else if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      saveToHistory(nodes, `Moved node ${draggedNode}`);
    }
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setIsPanning(false);
  };

  // Stats (nodes-only)
  const nodeIds = nodes.map(n => n.id).sort((a, b) => a - b);


  const getNodeFill = (id) => {
    if (!colorPalette.length) return '#E5E7EB'; // neutral when not enforced
    const rInt = parseInt(maxDegree, 10);
    const k = rInt + 1;
    const idx = (id - 1) % k;
    return colorPalette[idx];
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Graph Visualizer (Nodes Only)</h1>
            <p className="text-slate-600 text-lg">Add, move, and manage nodes. Edges/features removed.</p>
            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <span className="font-semibold text-slate-700">Nodes:</span>
                  <div className="text-2xl font-bold text-blue-600">{nodes.length}</div>
                </div>
                <div className="text-center col-span-1 sm:col-span-2">
                  <span className="font-semibold text-slate-700">Node IDs:</span>
                  <div className="text-sm text-slate-600 truncate">
                    {nodeIds.length ? nodeIds.join(', ') : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info banner */}
          {info && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-blue-800 font-medium">{info}</span>
              </div>
            </div>
          )}


          {/* Maximum Degree Constraint */}
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4 mb-6 border border-yellow-200">
            <div className="flex flex-wrap items-center gap-4">
                <h3 className="text-lg font-semibold text-slate-800">Maximum Degree Constraint</h3>
                <div className="flex items-center gap-3">
                <label className="flex items-center">
                    <input
                    type="checkbox"
                    checked={enforceMaxDegree}
                    onChange={(e) => setEnforceMaxDegree(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Enforce Max Degree</span>
                </label>
                <input
                    type="number"
                    placeholder="Max degree (r)"
                    value={maxDegree}
                    onChange={(e) => setMaxDegree(e.target.value)}
                    min="0"
                    className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                {enforceMaxDegree && colorPalette.length > 0 && (
                    <span className="text-sm text-slate-700">Using <b>{parseInt(maxDegree, 10) + 1}</b> colors</span>
                )}
                </div>

                {/* Legend */}
                {enforceMaxDegree && colorPalette.length > 0 && (
                <div className="w-full mt-3 flex flex-wrap gap-3">
                    {colorPalette.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-black/10" style={{ background: c }} />
                        <span className="text-xs text-slate-700">class {i}: {colorCounts[i] ?? 0}</span>
                    </div>
                    ))}
                </div>
                )}
            </div>
        </div>

          {/* Control Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Node Operations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">Node Operations</h3>

                {/* Single Node */}
                <button
                  onClick={addNode}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Add Single Node
                </button>

                {/* Bulk Nodes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Add Multiple Nodes</label>
                  <input
                    type="number"
                    placeholder="Number of nodes (1-50)"
                    value={bulkNodeCount}
                    onChange={(e) => setBulkNodeCount(e.target.value)}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addBulkNodes();
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
                  <label className="text-sm font-medium text-slate-700">Delete Node</label>
                  <input
                    type="number"
                    placeholder="Node ID to Delete"
                    value={deleteNodeId}
                    onChange={(e) => setDeleteNodeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') deleteNode();
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

              {/* Tools */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">Tools</h3>

                {/* Undo/Redo */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={undo}
                    disabled={currentStep === 0}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Undo
                  </button>
                  <button
                    onClick={redo}
                    disabled={currentStep >= history.length}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Redo
                  </button>
                </div>

                {/* Clear Graph */}
                <button
                  onClick={clearGraph}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Graph
                </button>

                {/* Display Options */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Display</label>
                  <div className="text-xs text-slate-600">
                    Scroll to zoom. Drag background to pan. Drag nodes to move.
                  </div>
                </div>
              </div>

              {/* Empty third column for symmetry / future controls */}
              <div className="hidden lg:block" />
            </div>
          </div>

          {/* Graph Visualization */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Graph Visualization</h3>
              <div className="text-sm text-slate-500">
                Zoom: ×{zoom.toFixed(1)} | Mouse wheel to zoom
              </div>
            </div>

            <div className="flex justify-center overflow-x-auto">
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="border-2 border-slate-300 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 min-w-full"
                viewBox={`0 0 ${width} ${height}`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseDown={handlePanStart}
                onWheel={handleWheel}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transformOrigin: 'center',
                  transition: draggedNode || isPanning ? 'none' : 'transform 0.1s ease-out',
                  cursor: isPanning ? 'grabbing' : 'grab'
                }}
              >
                {/* Nodes */}
                {nodes.map(n => (
                  <g
                    key={n.id}
                    onMouseDown={(e) => handleMouseDown(e, n)}
                    style={{ cursor: draggedNode === n.id ? 'grabbing' : 'grab' }}
                    className="transition-all duration-300"
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={25}
                      fill={getNodeFill(n.id)}
                      stroke="#6B7280"
                      strokeWidth={2}
                      className="transition-all duration-300 hover:stroke-slate-400"
                    />
                    <text
                      x={n.x}
                      y={n.y}
                      textAnchor="middle"
                      dy=".3em"
                      fontSize={14}
                      fontWeight="bold"
                      fill="#FFFFFF" 
                      className="transition-all duration-300 select-none"
                    >
                      {n.id}
                    </text>
                    {/* Coordinates under each node */}
                    {/* <text
                      x={n.x}
                      y={n.y + 40}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#6B7280"
                      className="pointer-events-none"
                    >
                      ({n.x.toFixed(0)}, {n.y.toFixed(0)})
                    </text> */}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Instructions (nodes-only) */}
          <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-2">Instructions:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Add single nodes or multiple nodes at once (1–50).</li>
              <li>• Drag nodes to reposition them (snap-limited to canvas bounds).</li>
              <li>• Use mouse wheel to zoom; drag the background to pan.</li>
              <li>• Use Undo/Redo to step through changes.</li>
              <li>• Use “Clear Graph” to start over.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
