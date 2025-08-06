import React, { useState, useRef, useEffect } from 'react';
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

  // Maximum degree constraint
  const [maxDegree, setMaxDegree] = useState('');
  const [enforceMaxDegree, setEnforceMaxDegree] = useState(false);
  
  
  // Mathematical visualization features
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPath, setAnimationPath] = useState([]);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showDistance, setShowDistance] = useState(false);
  const [algorithmInfo, setAlgorithmInfo] = useState('');
  const [autoEdgeCount, setAutoEdgeCount] = useState('');
  const [nodeColors, setNodeColors] = useState({});
  const [showDegrees, setShowDegrees] = useState(false);
  const width = 800;
  const height = 500;
  const svgRef = useRef(null);

   // Calculate degree of a node
   const getNodeDegree = (nodeId) => {
    return edges.filter(e => e.from === nodeId || e.to === nodeId).length;
  };

  // Get all node degrees
  const getNodeDegrees = () => {
    const degrees = {};
    nodes.forEach(node => {
      degrees[node.id] = getNodeDegree(node.id);
    });
    return degrees;
  };

  // Check if adding an edge would violate max degree
  const wouldViolateMaxDegree = (fromId, toId) => {
    if (!enforceMaxDegree || !maxDegree) return false;
    
    const maxDeg = parseInt(maxDegree);
    const fromDegree = getNodeDegree(fromId);
    const toDegree = getNodeDegree(toId);
    
    return fromDegree >= maxDeg || toDegree >= maxDeg;
  };

  // Color nodes based on degree (for visualization)
  const colorNodesByDegree = () => {
    if (!enforceMaxDegree || !maxDegree) {
      setNodeColors({});
      return;
    }
    
    const maxDeg = parseInt(maxDegree);
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];
    const newColors = {};
    
    nodes.forEach(node => {
      const degree = getNodeDegree(node.id);
      const colorIndex = Math.min(degree, colors.length - 1);
      newColors[node.id] = colors[colorIndex];
    });
    
    setNodeColors(newColors);
  };

  // Update colors when edges or max degree changes
  useEffect(() => {
    colorNodesByDegree();
  }, [edges.length, nodes.length, maxDegree, enforceMaxDegree]);

  // Mathematical coordinate system
  const transformPoint = (x, y) => ({
    x: (x - pan.x) / zoom,
    y: (y - pan.y) / zoom
  });

  const inverseTransformPoint = (x, y) => ({
    x: x * zoom + pan.x,
    y: y * zoom + pan.y
  });

  // History management for mathematical operations
  const saveToHistory = (newNodes, newEdges, operation = '') => {
    const timestamp = Date.now();
    setHistory(prev => [...prev.slice(0, currentStep), { 
      nodes: newNodes, 
      edges: newEdges, 
      operation,
      timestamp 
    }]);
    setCurrentStep(prev => prev + 1);
  };

  const undo = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const previousState = history[newStep - 1] || { nodes: [], edges: [] };
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setCurrentStep(newStep);
      setPath([]);
      setAlgorithmInfo(`Undone: ${previousState.operation || 'Previous operation'}`);
    }
  };

  const redo = () => {
    if (currentStep < history.length) {
      const nextState = history[currentStep];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setCurrentStep(prev => prev + 1);
      setPath([]);
      setAlgorithmInfo(`Redone: ${nextState.operation || 'Next operation'}`);
    }
  };

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
    
    const newNodes = [...nodes, { id, x, y }];
    setNodes(newNodes);
    saveToHistory(newNodes, edges, `Added node ${id}`);
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

    const finalNodes = [...nodes, ...newNodes];
    setNodes(finalNodes);
    setBulkNodeCount('');
    saveToHistory(finalNodes, edges, `Added ${count} nodes (${startId}-${startId + count - 1})`);
  };

  const deleteNode = () => {
    const id = parseInt(deleteNodeId);
    if (isNaN(id)) return;
    const newNodes = nodes.filter(n => n.id !== id);
    const newEdges = edges.filter(e => e.from !== id && e.to !== id);
    setNodes(newNodes);
    setEdges(newEdges);
    setDeleteNodeId('');
    saveToHistory(newNodes, newEdges, `Deleted node ${id}`);
  };

  const addEdge = () => {
    const fromId = parseInt(addEdgeFrom);
    const toId = parseInt(addEdgeTo);
    if (isNaN(fromId) || isNaN(toId) || fromId === toId) return;
    
    // Check if nodes exist
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    if (!fromNode || !toNode) {
      alert('One or both nodes do not exist!');
      return;
    }
    
    // Check if edge already exists
    const edgeExists = edges.some(e => 
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    
    if (edgeExists) {
      alert('Edge already exists!');
      return;
    }
    
    // Check max degree constraint
    if (enforceMaxDegree && maxDegree) {
      const maxDeg = parseInt(maxDegree);
      const fromDegree = getNodeDegree(fromId);
      const toDegree = getNodeDegree(toId);
      
      if (fromDegree >= maxDeg) {
        alert(`Cannot add edge: Node ${fromId} already has maximum degree of ${maxDeg}`);
        return;
      }
      if (toDegree >= maxDeg) {
        alert(`Cannot add edge: Node ${toId} already has maximum degree of ${maxDeg}`);
        return;
      }
    }
    
    const newEdges = [...edges, { from: fromId, to: toId }];
    setEdges(newEdges);
    saveToHistory(nodes, newEdges, `Added edge ${fromId} → ${toId}`);
    setAddEdgeFrom('');
    setAddEdgeTo('');
  };

  const deleteEdge = () => {
    const fromId = parseInt(deleteEdgeFrom);
    const toId = parseInt(deleteEdgeTo);
    if (isNaN(fromId) || isNaN(toId)) return;
    const newEdges = edges.filter(e => 
      !((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId))
    );
    setEdges(newEdges);
    setDeleteEdgeFrom('');
    setDeleteEdgeTo('');
    saveToHistory(nodes, newEdges, `Deleted edge ${fromId} ↔ ${toId}`);
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
    
    if (result.length > 0) {
      setAnimationPath(result);
      setAnimationIndex(0);
      setIsAnimating(true);
      setAlgorithmInfo(`Found path: ${result.join(' → ')} (Length: ${result.length - 1})`);
    } else {
      setAlgorithmInfo('No path found between specified nodes');
    }
  };

  // Mathematical step-by-step animation
  const nextStep = () => {
    if (animationIndex < animationPath.length - 1) {
      setAnimationIndex(prev => prev + 1);
      setAlgorithmInfo(`Step ${animationIndex + 2}: Visiting node ${animationPath[animationIndex + 1]}`);
    } else {
      setIsAnimating(false);
      setAlgorithmInfo('Animation complete');
    }
  };

  const prevStep = () => {
    if (animationIndex > 0) {
      setAnimationIndex(prev => prev - 1);
      setAlgorithmInfo(`Step ${animationIndex}: Back to node ${animationPath[animationIndex - 1]}`);
    }
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
    setAutoEdgeCount('');
    setDraggedNode(null);
    setHistory([]);
    setCurrentStep(0);
    setIsAnimating(false);
    setAnimationPath([]);
    setAnimationIndex(0);
    setAlgorithmInfo('Graph cleared');
  };

  // Auto-generate random edges
  const generateRandomEdges = () => {
    if (nodes.length < 2) {
      setAlgorithmInfo('Need at least 2 nodes to create edges');
      return;
    }

    const count = parseInt(autoEdgeCount);
    if (isNaN(count) || count <= 0) {
      setAlgorithmInfo('Please enter a valid number of edges');
      return;
    }

    const newEdges = [...edges];
    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    let edgesToAdd = Math.min(count, maxPossibleEdges - edges.length);

    if (edgesToAdd <= 0) {
      setAlgorithmInfo('Graph is already complete or too many edges requested');
      return;
    }

    let attempts = 0;
    const maxAttempts = edgesToAdd * 20;
    let addedCount = 0;

    while (addedCount < edgesToAdd && attempts < maxAttempts) {
      const fromIndex = Math.floor(Math.random() * nodes.length);
      const toIndex = Math.floor(Math.random() * nodes.length);
      
      if (fromIndex !== toIndex) {
        const fromId = nodes[fromIndex].id;
        const toId = nodes[toIndex].id;
        
        const edgeExists = newEdges.some(e => 
          (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
        );
        
        if (!edgeExists) {
          // Check max degree constraint
          if (enforceMaxDegree && maxDegree) {
            const maxDeg = parseInt(maxDegree);
            const fromDegree = newEdges.filter(e => e.from === fromId || e.to === fromId).length;
            const toDegree = newEdges.filter(e => e.from === toId || e.to === toId).length;
            
            if (fromDegree < maxDeg && toDegree < maxDeg) {
              newEdges.push({ from: fromId, to: toId });
              addedCount++;
            }
          } else {
            newEdges.push({ from: fromId, to: toId });
            addedCount++;
          }
        }
      }
      attempts++;
    }

    setEdges(newEdges);
    setAutoEdgeCount('');
    saveToHistory(nodes, newEdges, `Generated ${addedCount} random edges`);
    const constraintMsg = enforceMaxDegree ? ` (respecting max degree ${maxDegree})` : '';
    setAlgorithmInfo(`Added ${addedCount} random edges${constraintMsg}`);
  };

  // Create complete graph (all nodes connected to all others)
  const createCompleteGraph = () => {
    if (nodes.length < 2) {
      setAlgorithmInfo('Need at least 2 nodes to create a complete graph');
      return;
    }

    if (enforceMaxDegree && maxDegree) {
      const maxDeg = parseInt(maxDegree);
      if (maxDeg < nodes.length - 1) {
        alert(`Cannot create complete graph: Maximum degree ${maxDeg} is less than required ${nodes.length - 1}`);
        return;
      }
    }

    const newEdges = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        newEdges.push({ from: nodes[i].id, to: nodes[j].id });
      }
    }

    setEdges(newEdges);
    saveToHistory(nodes, newEdges, `Created complete graph with ${newEdges.length} edges`);
    setAlgorithmInfo(`Created complete graph with ${newEdges.length} edges`);
  };

  // Create a cycle graph
  const createCycleGraph = () => {
    if (nodes.length < 3) {
      setAlgorithmInfo('Need at least 3 nodes to create a cycle');
      return;
    }

    if (enforceMaxDegree && maxDegree) {
      const maxDeg = parseInt(maxDegree);
      if (maxDeg < 2) {
        alert(`Cannot create cycle graph: Maximum degree ${maxDeg} is less than required 2`);
        return;
      }
    }

    const newEdges = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const nextIndex = (i + 1) % nodes.length;
      newEdges.push({ from: nodes[i].id, to: nodes[nextIndex].id });
    }

    setEdges(newEdges);
    saveToHistory(nodes, newEdges, `Created cycle graph with ${newEdges.length} edges`);
    setAlgorithmInfo(`Created cycle graph with ${newEdges.length} edges`);
  };


  // Create a star graph (one central node connected to all others)
  const createStarGraph = () => {
    if (nodes.length < 2) {
      setAlgorithmInfo('Need at least 2 nodes to create a star graph');
      return;
    }

    if (enforceMaxDegree && maxDegree) {
      const maxDeg = parseInt(maxDegree);
      if (maxDeg < nodes.length - 1) {
        alert(`Cannot create star graph: Maximum degree ${maxDeg} is less than required ${nodes.length - 1} for center node`);
        return;
      }
    }

    const newEdges = [];
    const centerNode = nodes[0].id;
    
    for (let i = 1; i < nodes.length; i++) {
      newEdges.push({ from: centerNode, to: nodes[i].id });
    }

    setEdges(newEdges);
    saveToHistory(nodes, newEdges, `Created star graph with ${newEdges.length} edges`);
    setAlgorithmInfo(`Created star graph with ${newEdges.length} edges (center: node ${centerNode})`);
  };

  // Mathematical zoom and pan
  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handleWheel = (e) => {
    // Only zoom when hovering over the SVG graph area
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
      saveToHistory(nodes, edges, `Moved node ${draggedNode}`);
    }
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setIsPanning(false);
  };

  // Mathematical path calculation
  const getCurrentPath = () => {
    if (!isAnimating) return path;
    return animationPath.slice(0, animationIndex + 1);
  };

  const currentPath = getCurrentPath();

  // Calculate mathematical properties
  const calculateGraphProperties = () => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const connectedComponents = calculateConnectedComponents();
    const degrees = getNodeDegrees();
    const maxCurrentDegree = nodeCount > 0 ? Math.max(...Object.values(degrees)) : 0;
    const averageDegree = edgeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    
    return {
      nodeCount,
      edgeCount,
      connectedComponents,
      maxCurrentDegree,
      averageDegree: averageDegree.toFixed(2)
    };
  };

  const calculateConnectedComponents = () => {
    if (nodes.length === 0) return 0;
    
    const visited = new Set();
    let components = 0;
    
    const dfs = (nodeId) => {
      visited.add(nodeId);
      const neighbors = edges
        .filter(e => e.from === nodeId || e.to === nodeId)
        .map(e => e.from === nodeId ? e.to : e.from);
      
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      });
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
        components++;
      }
    });
    
    return components;
  };

  const graphProps = calculateGraphProperties();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Mathematical Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Graph Theory Visualizer</h1>
          <p className="text-slate-600 text-lg">Interactive shortest path finder</p>
          <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <span className="font-semibold text-slate-700">Nodes:</span>
                <div className="text-2xl font-bold text-blue-600">{graphProps.nodeCount}</div>
              </div>
              <div className="text-center">
                <span className="font-semibold text-slate-700">Edges:</span>
                <div className="text-2xl font-bold text-green-600">{graphProps.edgeCount}</div>
              </div>
              <div className="text-center">
                <span className="font-semibold text-slate-700">Components:</span>
                <div className="text-2xl font-bold text-purple-600">{graphProps.connectedComponents}</div>
              </div>
              <div className="text-center">
                <span className="font-semibold text-slate-700">Max Degree:</span>
                <div className="text-2xl font-bold text-red-600">{graphProps.maxCurrentDegree}</div>
              </div>
              <div className="text-center">
                <span className="font-semibold text-slate-700">Avg Degree:</span>
                <div className="text-2xl font-bold text-orange-600">{graphProps.averageDegree}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Information */}
        {algorithmInfo && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-blue-800 font-medium">{algorithmInfo}</span>
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
                placeholder="Max degree"
                value={maxDegree}
                onChange={(e) => setMaxDegree(e.target.value)}
                min="1"
                disabled={!enforceMaxDegree}
                className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
              {enforceMaxDegree && maxDegree && (
                <span className="text-sm text-slate-600 bg-yellow-100 px-2 py-1 rounded">
                  Max degree: {maxDegree} (for graph coloring: {parseInt(maxDegree) + 1} colors needed)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
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
                <label className="text-sm font-medium text-slate-700">Delete Node</label>
                <input 
                  type="number"
                  placeholder="Node ID to Delete"
                  value={deleteNodeId}
                  onChange={(e) => setDeleteNodeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">Edge Operations</h3>
              
              {/* Add Edge */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Add Edge</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    placeholder="From"
                    value={addEdgeFrom}
                    onChange={(e) => setAddEdgeFrom(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input 
                    type="number"
                    placeholder="To"
                    value={addEdgeTo}
                    onChange={(e) => setAddEdgeTo(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <label className="text-sm font-medium text-slate-700">Delete Edge</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    placeholder="From"
                    value={deleteEdgeFrom}
                    onChange={(e) => setDeleteEdgeFrom(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <input 
                    type="number"
                    placeholder="To"
                    value={deleteEdgeTo}
                    onChange={(e) => setDeleteEdgeTo(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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

              {/* Auto Edge Generation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Auto Edge Generation</label>
                <div className="space-y-2">
                  <input 
                    type="number"
                    placeholder="Number of random edges"
                    value={autoEdgeCount}
                    onChange={(e) => setAutoEdgeCount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        generateRandomEdges();
                      }
                    }}
                  />
                  <button 
                    onClick={generateRandomEdges}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Generate Random Edges
                  </button>
                </div>
              </div>

              {/* Graph Templates */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Graph Templates</label>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={createCompleteGraph}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Complete Graph
                  </button>
                  <button 
                    onClick={createCycleGraph}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cycle Graph
                  </button>
                  <button 
                    onClick={createStarGraph}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Star Graph
                  </button>
                </div>
              </div>
            </div>

            {/* Path Operations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">Path Finding</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number"
                    placeholder="Start"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input 
                    type="number"
                    placeholder="End"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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

            {/* Mathematical Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">Mathematical Tools</h3>
              
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



              {/* Animation Controls */}
              {isAnimating && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Step Animation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={prevStep}
                      disabled={animationIndex === 0}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={nextStep}
                      disabled={animationIndex >= animationPath.length - 1}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                  <div className="text-xs text-slate-600 text-center">
                    Step {animationIndex + 1} of {animationPath.length}
                  </div>
                </div>
              )}

              {/* Mathematical Display Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Display Options</label>
                <div className="space-y-1">
                  <label className="flex items-center text-sm">
                    <input 
                      type="checkbox" 
                      checked={showCoordinates}
                      onChange={(e) => setShowCoordinates(e.target.checked)}
                      className="mr-2"
                    />
                    Show Coordinates
                  </label>
                  <label className="flex items-center text-sm">
                    <input 
                      type="checkbox" 
                      checked={showDistance}
                      onChange={(e) => setShowDistance(e.target.checked)}
                      className="mr-2"
                    />
                    Show Distances
                  </label>
                  <label className="flex items-center text-sm">
                    <input 
                      type="checkbox" 
                      checked={showDegrees}
                      onChange={(e) => setShowDegrees(e.target.checked)}
                      className="mr-2"
                    />
                    Show Node Degrees
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Stats */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border border-slate-200">
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
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
            {enforceMaxDegree && maxDegree && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Max Degree Limit:</span>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{maxDegree}</span>
              </div>
            )}
          </div>
        </div>

        {/* Graph Visualization */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-lg font-semibold text-slate-800">Graph Visualization</h3>
              <div className="flex items-center gap-4">
                {currentPath.length > 0 && (
                  <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Path: {currentPath.join(' → ')} (Length: {currentPath.length - 1})
                  </div>
                )}
                <div className="text-sm text-slate-500">
                  Zoom: ×{zoom.toFixed(1)} | Mouse wheel to zoom
                </div>
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
              {/* Edges */}
              {edges.map((e, i) => {
                const a = nodes.find(n => n.id === e.from);
                const b = nodes.find(n => n.id === e.to);
                if (!a || !b) return null;
                
                const idxA = currentPath.indexOf(e.from);
                const idxB = currentPath.indexOf(e.to);
                const isOnPath = idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1;
                const isCurrentStep = isAnimating && idxA === animationIndex && idxB === animationIndex + 1;
                
                // Calculate distance for display
                const distance = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                
                return (
                  <g key={i}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isCurrentStep ? '#EF4444' : isOnPath ? '#7C3AED' : '#9CA3AF'}
                      strokeWidth={isCurrentStep ? 4 : isOnPath ? 3 : 2}
                      className="transition-all duration-300"
                    />
                    {showDistance && (
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        dy="-5"
                        fontSize={10}
                        fill="#6B7280"
                        className="pointer-events-none"
                      >
                        {distance.toFixed(0)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(n => {
                const isInPath = currentPath.includes(n.id);
                const isCurrentStep = isAnimating && n.id === animationPath[animationIndex];
                const degree = getNodeDegree(n.id);
                const nodeColor = nodeColors[n.id] || '#E5E7EB';
                return (
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
                      fill={isCurrentStep ? '#EF4444' : isInPath ? '#7C3AED' : (enforceMaxDegree ? nodeColor : '#E5E7EB')}
                      stroke={isCurrentStep ? '#DC2626' : isInPath ? '#5B21B6' : '#6B7280'}
                      strokeWidth={isCurrentStep ? 4 : isInPath ? 3 : 2}
                      className="transition-all duration-300 hover:stroke-slate-400"
                    />
                    <text
                      x={n.x}
                      y={n.y}
                      textAnchor="middle"
                      dy=".3em"
                      fontSize={14}
                      fontWeight="bold"
                      fill={isCurrentStep || isInPath || (enforceMaxDegree && degree > 0) ? '#FFFFFF' : '#374151'}
                      className="transition-all duration-300 select-none"
                    >
                      {n.id}
                    </text>
                    {showCoordinates && (
                      <text
                        x={n.x}
                        y={n.y + 40}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#6B7280"
                        className="pointer-events-none"
                      >
                        ({n.x.toFixed(0)}, {n.y.toFixed(0)})
                      </text>
                    )}
                    {showDegrees && (
                      <text
                        x={n.x}
                        y={n.y - 35}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="bold"
                        fill={enforceMaxDegree && maxDegree && degree >= parseInt(maxDegree) ? '#DC2626' : '#059669'}
                        className="pointer-events-none"
                      >
                        deg: {degree}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h4 className="font-semibold text-slate-800 mb-2">Mathematical Instructions:</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Add single nodes with "Add Single Node" or multiple nodes at once with "Add Bulk Nodes"</li>
            <li>• For bulk addition, enter a number between 1-50 and click "Add Bulk Nodes"</li>
            <li>• Drag nodes around to reposition them and avoid overlaps</li>
            <li>• Create edges by entering node IDs and clicking "Add Edge"</li>
            <li>• Delete nodes or edges by entering IDs and clicking respective delete buttons</li>
            <li>• Find shortest path by entering start and end node IDs</li>
            <li>• Path nodes and edges will be highlighted in purple</li>
            <li>• Use zoom controls and pan by dragging on empty areas</li>
            <li>• Step through the algorithm with Previous/Next buttons</li>
            <li>• View current graph stats (nodes, edges, node IDs) above the visualization</li>
            <li>• Use "Clear Graph" to start over</li>
            <li>• <strong>Maximum Degree Constraint:</strong> Enable to limit the number of edges per node (useful for graph coloring algorithms)</li>
            <li>• When max degree is enforced, nodes are colored by their degree (green → red gradient)</li>
            <li>• For graph coloring: If max degree is r, you need at most r+1 colors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}