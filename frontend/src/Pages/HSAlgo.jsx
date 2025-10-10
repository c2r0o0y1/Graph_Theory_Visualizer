import React, { useState, useRef, useMemo } from 'react';
import Navbar from '../Components/NavBar';

export default function HSAlgo() {
  const [nodes, setNodes] = useState([]);
  const [deleteNodeId, setDeleteNodeId] = useState('');
  const [bulkNodeCount, setBulkNodeCount] = useState('');
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [edges, setEdges] = useState([]);
  const [bulkEdgesText, setBulkEdgesText] = useState('');
  const [isSorting, setIsSorting] = useState(false);
  const [showSortGuide, setShowSortGuide] = useState(false);

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

  //helper fns
  const normalizeEdge = (u, v) => {
    const a = Math.min(u, v), b = Math.max(u, v);
    return `${a}-${b}`;
  };


  const buildAddEdgeFn = (r, ids) => {
    const deg = new Map(ids.map(id => [id, 0]));
    const seen = new Set();
    const out = [];

    const addEdge = (u, v) => {
      if (u === v) return false;
      const key = normalizeEdge(u, v);
      if (seen.has(key)) return false;
      if ((deg.get(u) ?? 0) >= r || (deg.get(v) ?? 0) >= r) return false;
      seen.add(key);
      out.push({ a: Math.min(u, v), b: Math.max(u, v) });
      deg.set(u, (deg.get(u) ?? 0) + 1);
      deg.set(v, (deg.get(v) ?? 0) + 1);
      return true;
    };

    return { addEdge, out, deg, seen };
  };

  //leetcode style edge i/o
  const parseBulkEdges = (text) => {
    return text
      .split(/[,\n]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(pair => {
        const m = pair.match(/^(\d+)\s*[-:]\s*(\d+)$/);
        if (!m) throw new Error(`Invalid pair: "${pair}" (use "u-v")`);
        return [parseInt(m[1], 10), parseInt(m[2], 10)];
      });
  };


  //---------------------------------------------------------------------------

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
      const newX = Math.random() * (width - 80) + 40;
      const newY = Math.random() * (height - 80) + 40;
      x = newX;
      y = newY;
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
    setEdges([]);
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
        const newX = Math.random() * (width - 80) + 40;
        const newY = Math.random() * (height - 80) + 40;
        x = newX;
        y = newY;
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
    setEdges([]); 
    setBulkNodeCount('');
    saveToHistory(finalNodes, `Added ${count} nodes (${startId}-${startId + count - 1})`);
    setInfo(`Added ${count} nodes`);
  };

  const deleteNode = () => {
    const id = parseInt(deleteNodeId, 10);
    if (isNaN(id)) return;
    const newNodes = nodes.filter(n => n.id !== id);
    setNodes(newNodes);
    setEdges([]); 
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
    setEdges([]); 
    setInfo('Graph cleared');
  };

  // Create the example grid graph
  //why do we need this?
  const createExampleGraph = () => {
    const exampleNodes = [
      // Top row
      { id: 6, x: 100, y: 100 },
      { id: 5, x: 200, y: 100 },
      { id: 4, x: 300, y: 100 },
      { id: 3, x: 400, y: 100 },
      { id: 8, x: 500, y: 100 },
      
      // Middle row
      { id: 7, x: 100, y: 200 },
      { id: 0, x: 200, y: 200 },
      { id: 1, x: 300, y: 200 },
      { id: 2, x: 400, y: 200 },
      
      // Bottom section
      { id: 12, x: 100, y: 350 },
      { id: 13, x: 200, y: 350 },
      { id: 14, x: 300, y: 350 },
      { id: 15, x: 450, y: 280 },
      { id: 11, x: 450, y: 350 },
      { id: 10, x: 550, y: 350 },
      { id: 9, x: 550, y: 280 }
    ];

    setNodes(exampleNodes);
    saveToHistory(exampleNodes, 'Created example grid graph');
    setInfo('Loaded example graph with nodes arranged in a grid pattern');
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
    if (isSorting) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e, node) => {
    if (isSorting) return;
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


  const simulateEdges = () => {
    const r = parseInt(maxDegree, 10);
    const n = nodes.length;

    if (isNaN(r) || r < 0) {
      setInfo('Enter a non-negative integer for max degree (r).');
      return;
    }
    if (n < 2) {
      setInfo('Add at least 2 nodes to create edges.');
      return;
    }
    if (r === 0) {
      setInfo('Impossible: r = 0 cannot be connected.');
      setEdges([]);
      return;
    }
    if (r === 1 && n > 2) {
      setInfo('Impossible: a connected graph with max degree 1 needs n ≤ 2. Increase r to ≥ 2.');
      setEdges([]);
      return;
    }

    const ordered = [...nodes].sort((a, b) => a.id - b.id);
    const ids = ordered.map(n => n.id);

    const deg = new Map(ids.map(id => [id, 0]));
    const seen = new Set();
    const out = [];

    const addEdge = (u, v) => {
      const a = Math.min(u, v), b = Math.max(u, v);
      if (a === b) return false;
      const key = `${a}-${b}`;
      if (seen.has(key)) return false;
      if ((deg.get(a) ?? 0) >= r || (deg.get(b) ?? 0) >= r) return false;
      seen.add(key);
      out.push({ a, b });
      deg.set(a, (deg.get(a) ?? 0) + 1);
      deg.set(b, (deg.get(b) ?? 0) + 1);
      return true;
    };

    // 1) Base path to guarantee connectivity (works for r >= 2 or n=2,r=1)
    for (let i = 0; i < ids.length - 1; i++) {
      addEdge(ids[i], ids[i + 1]);
    }

    // 2) Add extra local edges without violating the cap: i -> i+s where s=2..r
    for (let s = 2; s <= r; s++) {
      for (let i = 0; i < ids.length; i++) {
        const j = i + s;
        if (j >= ids.length) break; // no wrap
        addEdge(ids[i], ids[j]);
      }
    }

    setEdges(out);
    setInfo(`Built a connected graph with max degree ≤ ${r} (${out.length} edges).`);
  };



  const applyBulkEdgesFromText = () => {
    const r = parseInt(maxDegree, 10);
    if (isNaN(r) || r < 0) {
      alert('Enter a non-negative integer for max degree (r).');
      return;
    }
    if (nodes.length < 2) {
      alert('Add at least 2 nodes before adding edges.');
      return;
    }
    if (!bulkEdgesText.trim()) {
      alert('Paste edges like: 1-2, 2-3, 5-1');
      return;
    }
  
    // Known node IDs
    const ids = new Set(nodes.map(n => n.id));
  
    let pairs;
    try {
      pairs = parseBulkEdges(bulkEdgesText);
    } catch (e) {
      alert(e.message);
      return;
    }
  
    // Validate node existence and duplicates/self-loops
    const unique = new Set();
    for (const [u, v] of pairs) {
      if (!ids.has(u) || !ids.has(v)) {
        alert(`Edge uses unknown node: ${u}-${v}`);
        return;
      }
      if (u === v) {
        alert(`Self-loop not allowed: ${u}-${v}`);
        return;
      }
      const key = normalizeEdge(u, v);
      if (unique.has(key)) continue;
      unique.add(key);
    }
  
    // Degree accounting
    const deg = new Map([...ids].map(id => [id, 0]));
    for (const key of unique) {
      const [a, b] = key.split('-').map(Number);
      deg.set(a, deg.get(a) + 1);
      deg.set(b, deg.get(b) + 1);
    }
  
    // Check constraints
    for (const id of ids) {
      const d = deg.get(id) ?? 0;
      if (d === 0) {
        alert(`Every node must have at least one edge. Node ${id} has 0.`);
        return;
      }
      if (r >= 0 && d > r) {
        alert(`Max degree r=${r} violated at node ${id} (deg=${d}).`);
        return;
      }
    }
  
    // All good → apply
    const out = [...unique].map(key => {
      const [a, b] = key.split('-').map(Number);
      return { a, b };
    });
  
    setEdges(out);
    saveToHistory(nodes, 'Applied bulk predefined edges');
    setInfo(`Applied ${out.length} predefined edges.`);
  };

  const buildConflictProneEdges = () => {
    const r = parseInt(maxDegree, 10);
    const n = nodes.length;
  
    if (!enforceMaxDegree) {
      alert('Enable "Enforce Max Degree" and set r first.');
      return;
    }
    if (isNaN(r) || r < 1) {
      alert('Enter r >= 1 to build conflict-prone edges.');
      return;
    }
    if (n < 2) {
      alert('Add at least 2 nodes.');
      return;
    }
  
    const ordered = [...nodes].sort((a, b) => a.id - b.id);
    const ids = ordered.map(n => n.id);
    const { addEdge, out, deg, seen } = buildAddEdgeFn(r, ids);
  
    const k = r + 1;
  
    // Group IDs by color class
    const groups = Array.from({ length: k }, () => []);
    for (const id of ids) {
      const cls = (id - 1) % k;
      groups[cls].push(id);
    }
  
    // 1) Inside each color class, make a simple chain (same-color adjacency).
    for (const g of groups) {
      for (let i = 0; i + 1 < g.length; i++) {
        addEdge(g[i], g[i + 1]);
      }
    }
  
    // 2) Ensure each node has at least degree 1.
    // Try to add another same-class neighbor if available; fallback to nearby different classes.
    const idSet = new Set(ids);
    for (const id of ids) {
      if ((deg.get(id) ?? 0) >= 1) continue;
  
      const cls = (id - 1) % k;
      const poolSame = groups[cls].filter(v => v !== id);
      let placed = false;
  
      // Prefer same-class partner
      for (const v of poolSame) {
        if (addEdge(id, v)) { placed = true; break; }
      }
  
      // Fallback: close-by IDs to avoid full connectivity growth
      if (!placed) {
        const tryNeighbors = [
          ids.find(v => v > id),      // next id
          ids.findLast(v => v < id),  // previous id
        ].filter(Boolean);
        for (const v of tryNeighbors) {
          if (addEdge(id, v)) { placed = true; break; }
        }
      }
  
      if (!placed) {
        alert(`Could not give node ${id} at least one edge under r=${r}. Try increasing r.`);
        return;
      }
    }
  
    // 3) Lightly densify *within* color classes up to degree limits,
    // but stop early to avoid anything close to complete subgraphs.
    for (const g of groups) {
      // Shuffle-ish pass without random (pair every second node)
      for (let i = 0; i + 2 < g.length; i++) {
        if ((deg.get(g[i]) ?? 0) < r && (deg.get(g[i + 2]) ?? 0) < r) {
          addEdge(g[i], g[i + 2]);
        }
      }
    }
  
    // 4) Optional gentle cross-class sprinkle (keeps graph from isolating color classes)
    // but keep it sparse (only try neighbors by index).
    for (let i = 0; i < ids.length - 1; i++) {
      const u = ids[i], v = ids[i + 1];
      addEdge(u, v);
    }
  
    setEdges(out);
    saveToHistory(nodes, 'Built conflict-prone edges');
    setInfo(`Built ${out.length} conflict-prone edges (same-color tendency, degree ≤ ${r}).`);
  };
  


  const clearEdges = () => {
    setEdges([]);
    setInfo('Cleared all edges.');
  };



  // ===== Sort-by-ID (animated, 5 per row with gaps) =====
  const sortNodesAnimated = () => {
    if (nodes.length === 0) return;

    // Layout params
    const cols = 5;              // exactly 5 per row
    const marginX = 60;          // left/right padding
    const marginY = 60;          // top/bottom padding
    const usableW = Math.max(0, width - 2 * marginX);
    const usableH = Math.max(0, height - 2 * marginY);

    // Order nodes by ID so they appear 1..N left-to-right, top-to-bottom
    const ordered = [...nodes].sort((a, b) => a.id - b.id);
    const n = ordered.length;
    const rows = Math.max(1, Math.ceil(n / cols));

    // Spacing between nodes (gaps) along x and y
    // If there's only one column/row, avoid division by zero and center vertically/horizontally.
    const gapX = cols > 1 ? usableW / (cols - 1) : 0;
    const gapY = rows > 1 ? usableH / (rows - 1) : 0;

    // target map: id -> {x,y} for grid center points
    const target = new Map();
    for (let idx = 0; idx < n; idx++) {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = marginX + col * gapX;
      const y = marginY + row * gapY;
      target.set(ordered[idx].id, { x, y });
    }

    // capture start positions
    const start = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }]));

    // animation params
    const duration = 700; // ms
    const startTs = performance.now();
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    setIsSorting(true);
    setShowSortGuide(true);

    const step = (now) => {
      const t = Math.min(1, (now - startTs) / duration);
      const e = easeInOutCubic(t);

      const newNodes = nodes.map(n => {
        const s = start.get(n.id);
        const g = target.get(n.id);
        if (!s || !g) return n;
        return {
          ...n,
          x: s.x + (g.x - s.x) * e,
          y: s.y + (g.y - s.y) * e
        };
      });

      setNodes(newNodes);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        setIsSorting(false);
        setTimeout(() => setShowSortGuide(false), 500);
        saveToHistory(newNodes, 'Sorted nodes by ID (grid 5-per-row)');
        setInfo('Nodes sorted by ID into rows of 5.');
      }
    };

    requestAnimationFrame(step);
  };


  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="mb-4">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 bg-clip-text text-transparent mb-2">
                Graph Coloring Visualizer
              </h1>
              <p className="text-slate-600 text-xl font-medium animate-slide-in-right">Interactive Graph Theory Learning Tool</p>
              <p className="text-slate-500 text-sm mt-2">Explore graph coloring algorithms with maximum degree constraints</p>
            </div>
            <div className="mt-6 p-6 bg-white rounded-xl shadow-lg border border-slate-200 backdrop-blur-sm bg-white/80 animate-fade-in-up">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                <div className="text-center group">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-200">
                    <span className="block font-medium text-slate-700 mb-1">Nodes</span>
                    <div className="text-3xl font-bold text-blue-600">{nodes.length}</div>
                  </div>
                </div>
                <div className="text-center group">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-200">
                    <span className="block font-medium text-slate-700 mb-1">Edges</span>
                    <div className="text-3xl font-bold text-emerald-600">{edges.length}</div>
                  </div>
                </div>
                <div className="text-center group col-span-2 sm:col-span-1">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-200">
                    <span className="block font-medium text-slate-700 mb-1">Colors</span>
                    <div className="text-3xl font-bold text-purple-600">{colorPalette.length}</div>
                  </div>
                </div>
              </div>
              {nodeIds.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <span className="block text-sm font-medium text-slate-700 mb-1">Node IDs:</span>
                  <div className="text-sm text-slate-600 font-mono">
                    {nodeIds.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info banner */}
          {info && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-4 shadow-sm animate-slide-in-right">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full mr-3 animate-pulse-slow shadow-sm"></div>
                <span className="text-blue-800 font-medium text-sm">{info}</span>
              </div>
            </div>
          )}


          {/* Maximum Degree Constraint */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-lg p-6 mb-8 border border-yellow-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-800">Graph Coloring Algorithm</h3>
              </div>
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
                {/* NEW: Edge Simulation Controls */}
                {/*<div className="w-full mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={sortNodesAnimated}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sort by ID (animate)
                  </button>
                  <button
                    onClick={simulateEdges}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Simulate Edges
                  </button>
                  <button
                    onClick={clearEdges}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Edges
                  </button>
                  <span className="text-xs text-slate-600 self-center">
                    Pattern: i → (i+1..i+r), undirected (no wrap). With k=r+1 colors, neighbors differ.
                  </span>
                </div>*/}

                <div className="w-full mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={sortNodesAnimated}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sort by ID (animate)
                  </button>

                  {/*<button
                    onClick={simulateEdges}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Simulate Edges (balanced)
                  </button>

                  <button
                    onClick={buildConflictProneEdges}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title="Favor edges within the same color class, respect r, avoid complete graphs"
                  >
                    Conflict-Prone Edges
                  </button>

                  <button
                    onClick={clearEdges}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Edges
                  </button>

                  <span className="text-xs text-slate-600 self-center">
                    Balanced: i→(i+1..i+r). Conflict-prone: favors same color class.
                  </span>*/}
                </div>

                {/* Bulk predefined edges */}
                {/*<div className="w-full mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bulk predefined edges (format: <code>1-2, 2-3, 5-1</code> or line-separated)
                  </label>
                  <textarea
                    value={bulkEdgesText}
                    onChange={(e) => setBulkEdgesText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="1-2, 2-3, 5-1"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={applyBulkEdgesFromText}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Apply Bulk Edges
                    </button>
                    <span className="text-xs text-slate-600 self-center">
                      Requires r. Every node must have ≥1 edge and ≤r.
                    </span>
                  </div>
                </div>*/}
            </div>
        </div>

          {/* Control Panel */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 mb-8 border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Node Operations */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-800">Node Operations</h3>
                </div>

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
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-emerald-200">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-800">Tools</h3>
                </div>

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

                {/* Example Graph */}
                <button
                  onClick={createExampleGraph}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors font-semibold"
                >
                  Example Graph
                </button>

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
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-3 border-b-2 border-amber-200">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h10M4 17h7" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-800">Edge Operations</h3>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bulk predefined edges (e.g. <code>1-2, 2-3, 5-1</code> or line-separated)
                  </label>
                  <textarea
                    value={bulkEdgesText}
                    onChange={(e) => setBulkEdgesText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="1-2, 2-3, 5-1"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={applyBulkEdgesFromText}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Apply Bulk Edges
                    </button>
                    <span className="text-xs text-slate-600">
                      Requires r. Every node must have ≥1 edge and ≤ r.
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* <button
                    onClick={simulateEdges}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title="Balanced pattern: i → (i+1..i+r), undirected (no wrap)"
                  >
                    Simulate Edges (balanced)
                  </button> */}

                  <button
                    onClick={buildConflictProneEdges}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title="Favor same-color adjacency, respect r, avoid complete graphs"
                  >
                    Conflict-Prone Edges
                  </button>

                  <button
                    onClick={clearEdges}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Edges
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Visualization */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-lg font-bold text-slate-800">Graph Visualization</h3>
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
                {showSortGuide && (() => {
                  const ordered = [...nodes].sort((a, b) => a.id - b.id);
                  const marginX = 60;
                  const y = height / 2;
                  const n = ordered.length;
                  const spacing = n > 1 ? (width - 2 * marginX) / (n - 1) : 0;
                  return (
                    <g opacity={0.5}>
                      <line x1={marginX} y1={y} x2={width - marginX} y2={y} stroke="#a78bfa" strokeWidth={3} strokeDasharray="6 6" />
                      {ordered.map((nd, idx) => {
                        const x = marginX + idx * spacing;
                        return (
                          <g key={`tick-${nd.id}`} transform={`translate(${x},${y})`}>
                            <circle r={6} fill="#a78bfa" />
                            <text y={-12} textAnchor="middle" fontSize={11} fill="#6b21a8" fontWeight="600">{nd.id}</text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
                {/* NEW: Edges (render behind nodes) */}
                {edges.map(({ a, b }) => {
                  const na = nodes.find(n => n.id === a);
                  const nb = nodes.find(n => n.id === b);
                  if (!na || !nb) return null;
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={na.x}
                      y1={na.y}
                      x2={nb.x}
                      y2={nb.y}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      opacity={0.9}
                    />
                  );
                })}

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

           {/* Quick Guide */}
           <div className="mt-8 bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl p-4 border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between text-sm text-slate-600">
               <span>🖱️ <strong>Drag</strong> nodes • <strong>Scroll</strong> to zoom • <strong>Drag background</strong> to pan</span>
               <span>🎨 <strong>Add nodes</strong> → <strong>Set max degree</strong> → <strong>Visualize colors</strong></span>
             </div>
           </div>
        </div>
      </div>
    </>
  );
}
