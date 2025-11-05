import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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

  // Visualization features
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // History (nodes-only, unchanged)
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Max degree & coloring UI
  const [enforceMaxDegree, setEnforceMaxDegree] = useState(false);
  const [maxDegree, setMaxDegree] = useState('');

  // Info banner
  const [info, setInfo] = useState('');

  const width = 800;
  const height = 500;
  const svgRef = useRef(null);

  // ---- NEW: coloring state + helpers ----
  // class index in [0..r] for each node id
  const [coloring, setColoring] = useState({}); // { [nodeId]: classIndex }
  const [auxGraphNodes, setAuxGraphNodes] = useState([]); // { id: classIdx, size: count, type: 'large' | 'small' | 'normal' }
  const [auxGraphEdges, setAuxGraphEdges] = useState([]); // { from: classIdx, to: classIdx }
  const [auxGraphPath, setAuxGraphPath] = useState([]);   // [classIdx, classIdx, ...]
  const [lemmaStatus, setLemmaStatus] = useState(''); // Info banner for lemma ops


  const mod = (a, m) => ((a % m) + m) % m;

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

  // k = r+1 if enforced and valid
  const k = useMemo(() => {
    const rInt = parseInt(maxDegree, 10);
    if (!enforceMaxDegree || isNaN(rInt) || rInt < 0) return 0;
    return rInt + 1;
  }, [enforceMaxDegree, maxDegree]);

  // Palette for k classes
  const colorPalette = useMemo(() => {
    if (!k) return [];
    return Array.from({ length: k }, (_, i) =>
      `hsl(${Math.round((360 * i) / k)}, 70%, 55%)`
    );
  }, [k]);

  // Keep coloring defined for all nodes & within range when k changes
  useEffect(() => {
    if (!k) return; // nothing to color
    setColoring(prev => {
      const next = { ...prev };
      let changed = false;
      for (const n of nodes) {
        if (next[n.id] == null) {
          next[n.id] = mod(n.id - 1, k); // trivial starting assignment
          changed = true;
        } else if (next[n.id] >= k || next[n.id] < 0) {
          next[n.id] = mod(next[n.id], k);
          changed = true;
        }
      }
      // drop stale entries
      for (const idStr of Object.keys(next)) {
        const id = Number(idStr);
        if (!nodes.some(n => n.id === id)) {
          delete next[idStr];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [nodes, k]);


  // 1. Adjacency Map for G
  const adjMap = useMemo(() => {
    const map = new Map();
    nodes.forEach(n => map.set(n.id, new Set()));
    edges.forEach(e => {
      map.get(e.a)?.add(e.b);
      map.get(e.b)?.add(e.a);
    });
    return map;
  }, [nodes, edges]);

  // 2. Nodes Grouped by Color Class
  const nodesByColorMap = useMemo(() => {
    const map = new Map();
    if (!k) return map;
    // Ensure all classes exist in the map
    for (let i = 0; i < k; i++) {
      map.set(i, []);
    }
    // Populate with nodes
    nodes.forEach(n => {
      const c = coloring[n.id];
      if (c != null) {
        map.get(c)?.push(n.id);
      }
    });
    return map;
  }, [nodes, coloring, k]);

  //3. Class sizes from current coloring
  const currentColorCounts = useMemo(() => {
    if (!k) return [];
    const counts = Array.from({ length: k }, () => 0);
    nodes.forEach(n => {
      const c = coloring[n.id];
      if (c != null && c >= 0 && c < k) counts[c]++;
    });
    return counts;
  }, [nodes, coloring, k]);

  // 4. Target equitable sizes
  const { q_base, r_rem } = useMemo(() => {
    if (k === 0 || nodes.length === 0) return { q_base: 0, r_rem: 0 };
    const n = nodes.length;
    return {
      q_base: Math.floor(n / k),
      r_rem: n % k
    };
  }, [nodes.length, k]);


  // Helper to find a movable vertex from vFrom to vTo
  const findMovableVertex = useCallback((vFrom, vTo, adj, nodesByColor) => {
    const nodesInVFrom = nodesByColor.get(vFrom) || [];
    const nodesInVTo = nodesByColor.get(vTo) || [];
    const nodesInVToSet = new Set(nodesInVTo);

    for (const nodeId_y of nodesInVFrom) {
      const neighborsOfY = adj.get(nodeId_y) || new Set();
      let hasNeighborInVTo = false;
      
      // Check for neighbors
      for (const neighbor of neighborsOfY) {
        if (nodesInVToSet.has(neighbor)) {
          hasNeighborInVTo = true;
          break;
        }
      }

      if (!hasNeighborInVTo) {
        return nodeId_y; // Found a movable vertex
      }
    }
    return null; // No movable vertex found
  }, []);

  // // === LEMMA 2.1 IMPLEMENTATION ===
  // const runLemma2_1 = () => {
  //   // --- 1. PRECONDITIONS ---
  //   if (!k || k < 2) {
  //     setLemmaStatus('Error: Enable "Enforce Max Degree" with r >= 1 (k >= 2).');
  //     return;
  //   }
  //   if (nodes.length === 0) {
  //     setLemmaStatus('Error: Add nodes to the graph.');
  //     return;
  //   }
  //   setLemmaStatus('Starting... 1. Resolving conflicts (Greedy Proper Coloring)...');

  //   // --- NEW STEP 2: Resolve Conflicts (Greedy Coloring) ---
  //   // This ensures the coloring 'f' is "proper" before we check if it's equitable.
  //   const newProperColoring = {};
  //   const sortedNodes = [...nodes].sort((a, b) => a.id - b.id);
  //   const localAdjMap = adjMap; // Use memoized version
    
  //   for (const node of sortedNodes) {
  //     const neighbors = localAdjMap.get(node.id) || new Set();
  //     const neighborColors = new Set();
      
  //     for (const neighborId of neighbors) {
  //       // As we build the new coloring, check against it.
  //       // This is a standard greedy approach.
  //       if (newProperColoring[neighborId] != null) {
  //         neighborColors.add(newProperColoring[neighborId]);
  //       }
  //     }
      
  //     let assignedColor = -1;
  //     for (let c = 0; c < k; c++) {
  //       if (!neighborColors.has(c)) {
  //         assignedColor = c;
  //         break;
  //       }
  //     }
      
  //     if (assignedColor === -1) {
  //       // This shouldn't happen if k = r+1 and deg(node) <= r.
  //       // But as a fallback, just assign 0. This indicates a failed proper coloring.
  //       assignedColor = 0; 
  //       setLemmaStatus(`Warning: Could not find proper color for node ${node.id}. Greedy algorithm failed.`);
  //       // Don't return, as we might still be able to make it equitable.
  //     }
      
  //     newProperColoring[node.id] = assignedColor;
  //   }
    
  //   // Apply the new proper coloring
  //   setColoring(newProperColoring);
  //   setLemmaStatus('1. Proper coloring applied. 2. Analyzing for equitability...');
    
  //   // --- 3. CALCULATE COUNTS *AFTER* GREEDY PASS ---
  //   // We must wait for the state update, or recalculate manually.
  //   // Let's recalculate manually to avoid async issues.
  //   const newCounts = Array(k).fill(0);
  //   for (const nodeId of Object.keys(newProperColoring)) {
  //     newCounts[newProperColoring[nodeId]]++;
  //   }
  //   const newNodesByColor = new Map();
  //   for (let i = 0; i < k; i++) newNodesByColor.set(i, []);
  //   for (const nodeId of Object.keys(newProperColoring)) {
  //     newNodesByColor.get(newProperColoring[nodeId]).push(Number(nodeId));
  //   }

  //   // --- 4. FIND V+ and V- (from new proper coloring) ---
  //   let vPlusId = -1, vMinusId = -1;
  //   let maxSize = -1, minSize = Infinity;
    
  //   newCounts.forEach((count, idx) => {
  //     if (count > maxSize) {
  //       maxSize = count;
  //       vPlusId = idx;
  //     }
  //     if (count < minSize) {
  //       minSize = count;
  //       vMinusId = idx;
  //     }
  //   });
    
  //   // Check if coloring is already equitable or close
  //   if (maxSize <= minSize + 1) {
  //     setLemmaStatus(`Proper coloring is already equitable (Max: ${maxSize}, Min: ${minSize}). No further action.`);
  //     setAuxGraphNodes([]);
  //     setAuxGraphEdges([]);
  //     setAuxGraphPath([]);
  //     return;
  //   }
    
  //   setLemmaStatus(`Proper coloring is nearly equitable: V+ = ${vPlusId} (size ${maxSize}), V- = ${vMinusId} (size ${minSize}). Building H(G, f)...`);

  //   // --- 5. BUILD H(G, f) (based on new proper coloring) ---
  //   const auxNodes = [];
  //   const auxEdges = [];
  //   const localNodesByColor = newNodesByColor; // Use manually calculated map
    
  //   for (let i = 0; i < k; i++) {
  //     let type = 'normal';
  //     if (i === vPlusId) type = 'large';
  //     if (i === vMinusId) type = 'small';
  //     auxNodes.push({ id: i, size: newCounts[i], type });
  //   }

  //   for (let i = 0; i < k; i++) {
  //     for (let j = 0; j < k; j++) {
  //       if (i === j) continue;
        
  //       // Check for edge i -> j
  //       const movableVertex = findMovableVertex(i, j, localAdjMap, localNodesByColor);
  //       if (movableVertex !== null) {
  //         auxEdges.push({ from: i, to: j });
  //       }
  //     }
  //   }
    
  //   setAuxGraphNodes(auxNodes);
  //   setAuxGraphEdges(auxEdges);
  //   setLemmaStatus(`Built H(G, f). Searching for path ${vPlusId} -> ${vMinusId}...`);
    
  //   // --- 6. FIND PATH V+ -> V- ---
  //   let foundPath = null;
  //   const queue = [[vPlusId]]; // Queue of paths
  //   const visited = new Set([vPlusId]);
    
  //   const auxAdj = new Map();
  //   auxEdges.forEach(e => {
  //     if (!auxAdj.has(e.from)) auxAdj.set(e.from, []);
  //     auxAdj.get(e.from).push(e.to);
  //   });

  //   while (queue.length > 0) {
  //     const currentPath = queue.shift();
  //     const lastNode = currentPath[currentPath.length - 1];

  //     if (lastNode === vMinusId) {
  //       foundPath = currentPath;
  //       break;
  //     }
      
  //     const neighbors = auxAdj.get(lastNode) || [];
  //     for (const neighbor of neighbors) {
  //       if (!visited.has(neighbor)) {
  //         visited.add(neighbor);
  //         queue.push([...currentPath, neighbor]);
  //       }
  //     }
  //   }
    
  //   // --- 7. PROCESS PATH & UPDATE COLORING ---
  //   if (!foundPath) {
  //     setLemmaStatus(`V+ (${vPlusId}) is not accessible to V- (${vMinusId}). Cannot apply lemma.`);
  //     setAuxGraphPath([]);
  //     return;
  //   }
    
  //   setLemmaStatus(`Path found: ${foundPath.join(' -> ')}. Applying recoloring...`);
  //   setAuxGraphPath(foundPath);
    
  //   const finalColoringFromProper = { ...newProperColoring };
  //   let finalNodesByColor = new Map(localNodesByColor); // Start with our new proper map
  //   // Create deep copy of arrays within map
  //   finalNodesByColor.forEach((val, key) => {
  //     finalNodesByColor.set(key, [...val]);
  //   });

  //   const moves = [];
  //   let possible = true;

  //   for (let j = 0; j < foundPath.length - 1; j++) {
  //     const vFrom = foundPath[j];
  //     const vTo = foundPath[j + 1];
      
  //     // Find movable vertex based on the *current* state of our move chain
  //     const y_j = findMovableVertex(vFrom, vTo, localAdjMap, finalNodesByColor);
      
  //     if (y_j === null) {
  //       setLemmaStatus(`Error: Path broken at ${vFrom} -> ${vTo}. No movable vertex found. Aborting.`);
  //       possible = false;
  //       break;
  //     }
      
  //     moves.push({ nodeId: y_j, fromClass: vFrom, toClass: vTo });
      
  //     // Update our temporary coloring map for the *next* iteration
  //     const fromList = finalNodesByColor.get(vFrom);
  //     finalNodesByColor.set(vFrom, fromList.filter(id => id !== y_j));
  //     finalNodesByColor.get(vTo).push(y_j);
  //   }

  //   if (possible) {
  //     // All moves are possible. Apply them to the *real* coloring.
  //     const finalColoring = { ...finalColoringFromProper };
  //     moves.forEach(move => {
  //       finalColoring[move.nodeId] = move.toClass;
  //     });
      
  //     setColoring(finalColoring);
  //     saveToHistory(nodes, 'Applied Proper Coloring & Lemma 2.1');
  //     setLemmaStatus(`Proper & Equitable coloring achieved! V+ lost 1, V- gained 1.`);
      
  //     // Clear the aux graph after a delay
  //     // setTimeout(() => {
  //     //   setLemmaStatus('Aux graph reset. Ready for next operation.');
  //     //   setAuxGraphNodes([]);
  //     //   setAuxGraphEdges([]);
  //     //   setAuxGraphPath([]);
  //     // }, 3000);
  //   } else {
  //     // Reset path if it failed
  //     setAuxGraphPath([]);
  //   }
  // };

  // === LEMMA 2.1 IMPLEMENTATION ===
  const runLemma2_1 = () => {
    // --- 1. PRECONDITIONS ---
    if (!k || k < 2) {
      setLemmaStatus('Error: Enable "Enforce Max Degree" with r >= 1 (k >= 2).');
      return;
    }
    if (nodes.length === 0) {
      setLemmaStatus('Error: Add nodes to the graph.');
      return;
    }
    setLemmaStatus('Analyzing coloring...');
    
    // --- 2. FIND V+ and V- ---
    let vPlusId = -1, vMinusId = -1;
    let maxSize = -1, minSize = Infinity;
    
    currentColorCounts.forEach((count, idx) => {
      if (count > maxSize) {
        maxSize = count;
        vPlusId = idx;
      }
      if (count < minSize) {
        minSize = count;
        vMinusId = idx;
      }
    });
    
    // Check if coloring is already equitable or close
    if (maxSize <= minSize + 1) {
      setLemmaStatus(`Coloring is already equitable (Max: ${maxSize}, Min: ${minSize}). No action taken.`);
      setAuxGraphNodes([]);
      setAuxGraphEdges([]);
      setAuxGraphPath([]);
      return;
    }
    
    setLemmaStatus(`Nearly equitable: V+ = ${vPlusId} (size ${maxSize}), V- = ${vMinusId} (size ${minSize}). Building H(G, f)...`);

    // --- 3. BUILD H(G, f) ---
    const auxNodes = [];
    const auxEdges = [];
    const localNodesByColor = nodesByColorMap; // Use memoized version
    const localAdjMap = adjMap; // Use memoized version
    
    for (let i = 0; i < k; i++) {
      let type = 'normal';
      if (i === vPlusId) type = 'large';
      if (i === vMinusId) type = 'small';
      auxNodes.push({ id: i, size: currentColorCounts[i], type });
    }

    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (i === j) continue;
        
        // Check for edge i -> j
        const movableVertex = findMovableVertex(i, j, localAdjMap, localNodesByColor);
        if (movableVertex !== null) {
          auxEdges.push({ from: i, to: j });
        }
      }
    }
    
    setAuxGraphNodes(auxNodes);
    setAuxGraphEdges(auxEdges);
    setLemmaStatus(`Built H(G, f). Searching for path ${vPlusId} -> ${vMinusId}...`);
    
    // --- 4. FIND PATH V+ -> V- ---
    let foundPath = null;
    const queue = [[vPlusId]]; // Queue of paths
    const visited = new Set([vPlusId]);
    
    const auxAdj = new Map();
    auxEdges.forEach(e => {
      if (!auxAdj.has(e.from)) auxAdj.set(e.from, []);
      auxAdj.get(e.from).push(e.to);
    });

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const lastNode = currentPath[currentPath.length - 1];

      if (lastNode === vMinusId) {
        foundPath = currentPath;
        break;
      }
      
      const neighbors = auxAdj.get(lastNode) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...currentPath, neighbor]);
        }
      }
    }
    
    // --- 5. PROCESS PATH & UPDATE COLORING ---
    if (!foundPath) {
      setLemmaStatus(`V+ (${vPlusId}) is not accessible to V- (${vMinusId}). Cannot apply lemma.`);
      setAuxGraphPath([]);
      return;
    }
    
    setLemmaStatus(`Path found: ${foundPath.join(' -> ')}. Applying recoloring...`);
    setAuxGraphPath(foundPath);

    // We need to find the *actual* vertices to move.
    // This is a chain reaction. We must find y_j based on the *updated* coloring.
    // The proof implies all y_j can be found from the *initial* coloring f.
    // "Vj contains a vertex yj that has no neighbours in Vj+1"
    // This is safer.
    
    const newColoring = { ...coloring };
    let finalNodesByColor = new Map(localNodesByColor); // Start with original
    // Create deep copy of arrays within map
    finalNodesByColor.forEach((val, key) => {
      finalNodesByColor.set(key, [...val]);
    });

    const moves = [];
    let possible = true;

    for (let j = 0; j < foundPath.length - 1; j++) {
      const vFrom = foundPath[j];
      const vTo = foundPath[j + 1];
      
      // Find movable vertex based on the *current* state of our move chain
      const y_j = findMovableVertex(vFrom, vTo, localAdjMap, finalNodesByColor);
      
      if (y_j === null) {
        setLemmaStatus(`Error: Path broken at ${vFrom} -> ${vTo}. No movable vertex found. Aborting.`);
        possible = false;
        break;
      }
      
      moves.push({ nodeId: y_j, fromClass: vFrom, toClass: vTo });
      
      // Update our temporary coloring map for the *next* iteration
      const fromList = finalNodesByColor.get(vFrom);
      finalNodesByColor.set(vFrom, fromList.filter(id => id !== y_j));
      finalNodesByColor.get(vTo).push(y_j);
    }

    if (possible) {
      // All moves are possible. Apply them to the *real* coloring.
      const finalColoring = { ...coloring };
      moves.forEach(move => {
        finalColoring[move.nodeId] = move.toClass;
      });
      
      setColoring(finalColoring);
      saveToHistory(nodes, 'Applied Lemma 2.1 Recoloring');
      setLemmaStatus(`Equitable coloring achieved! V+ lost 1, V- gained 1.`);
      
      // Clear the aux graph after a delay
      // setTimeout(() => {
      //   setLemmaStatus('Aux graph reset. Ready for next operation.');
      //   setAuxGraphNodes([]);
      //   setAuxGraphEdges([]);
      //   setAuxGraphPath([]);
      // }, 3000);
    } else {
      // Reset path if it failed
      setAuxGraphPath([]);
    }
  };

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
    setColoring({});
    setInfo('Graph cleared');
  };

  // Example graph for lemma 2.1
  const createExampleGraph = () => {
    const exampleNodes = [
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 200, y: 100 },
      { id: 3, x: 300, y: 100 },
      { id: 4, x: 400, y: 100 },
      { id: 5, x: 100, y: 200 },
      { id: 6, x: 200, y: 200 },
      { id: 7, x: 300, y: 200 },
      { id: 8, x: 400, y: 200 },
      { id: 9, x: 250, y: 300 },
    ];
    setNodes(exampleNodes);
    
    // Set r=3, k=4
    setEnforceMaxDegree(true);
    setMaxDegree('3');
    const r = 3;
    const k_val = r + 1;
    
    const newColoring = {
      1: 0, 
      2: 0, 
      3: 0, 
      4: 0, 
      5: 1, 
      6: 1, 
      7: 2, 
      8: 2, 
      9: 3, 
    };
    setColoring(newColoring);
    
    // Create edges that make a path 0 -> 1 -> 3
    // We need:
    // 1. A vertex in V+ (0) movable to V_mid (1). 
    //    Let's make node 1 (in V+) have NO neighbors in V_mid (1) (nodes 5, 6)
    // 2. A vertex in V_mid (1) movable to V- (3).
    //    Let's make node 5 (in V_mid 1) have NO neighbors in V- (3) (node 9)
    // 3. Add other edges to make it a graph.
    
    const exampleEdges = [
      // Edges for node 1 (V+):
      // No neighbors in {5, 6} (V_mid 1)
      { a: 1, b: 7 }, // Neighbor in V_mid 2
      { a: 1, b: 9 }, // Neighbor in V- 3
      
      // Edges for node 5 (V_mid 1):
      // No neighbors in {9} (V- 3)
      { a: 5, b: 2 }, // Neighbor in V+ 0
      { a: 5, b: 8 }, // Neighbor in V_mid 2
      
      // Other edges to connect
      { a: 2, b: 3 },
      { a: 3, b: 4 },
      { a: 6, b: 7 },
      { a: 7, b: 8 },
      { a: 8, b: 9 },
      { a: 2, b: 6 },
    ];
    
    setEdges(exampleEdges);
    setBulkEdgesText('');
    
    saveToHistory(exampleNodes, 'Created Lemma 2.1 Example');
    setInfo('Loaded example graph for Lemma 2.1 (r=3, k=4).');
    setLemmaStatus('Example loaded. V+ is Class 0 (size 4), V- is Class 3 (size 1). Path 0 -> 1 -> 3 should be possible.');
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

  // Stats
  const nodeIds = nodes.map(n => n.id).sort((a, b) => a - b);

  // Fill color from current coloring
  const getNodeFill = (id) => {
    if (!k || !colorPalette.length) return '#E5E7EB'; // neutral when not enforced
    const c = coloring[id];
    const idx = c == null ? mod(id - 1, k) : c;
    return colorPalette[idx];
  };

  // ==== Edge builders from your original code (simulateEdges kept; conflictProne kept) ====

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
      alert('Enter r > 1 to build conflict-prone edges.');
      return;
    }
    if (n < 2) {
      alert('Add at least 2 nodes.');
      return;
    }

    const ordered = [...nodes].sort((a, b) => a.id - b.id);
    const ids = ordered.map(n => n.id);
    const { addEdge, out, deg } = buildAddEdgeFn(r, ids);

    const kLocal = r + 1;
    const clsOf = (id) => mod(id - 1, kLocal);

    // Group ids by color class
    const groups = Array.from({ length: kLocal }, () => []);
    for (const id of ids) groups[clsOf(id)].push(id);

    // STEP 1: Within-class simple chains only (NO cross-class edges here)
    for (const g of groups) {
      for (let i = 0; i + 1 < g.length; i++) {
        addEdge(g[i], g[i + 1]);
      }
    }

    // Helper: pick lowest-degree available node from a class
    const pickFromClass = (c) => {
      const avail = groups[c].filter(u => (deg.get(u) ?? 0) < r);
      if (avail.length === 0) return null;
      // lowest degree first; stable by id
      avail.sort((a, b) => {
        const da = deg.get(a) ?? 0, db = deg.get(b) ?? 0;
        return da - db || a - b;
      });
      return avail[0];
    };

    // STEP 4: EXACTLY ONE CROSS-CLASS EDGE PER CLASS PAIR
    for (let c1 = 0; c1 < kLocal; c1++) {
      for (let c2 = c1 + 1; c2 < kLocal; c2++) {
        if (groups[c1].length === 0 || groups[c2].length === 0) continue;

        let u = pickFromClass(c1);
        let v = pickFromClass(c2);

        if (u == null || v == null) {
          alert(
            `Cannot place the required single cross-class edge between classes ${c1} and ${c2} without exceeding r=${r}.`
          );
          return;
        }

        if (!addEdge(u, v)) {
          const cand1 = groups[c1]
            .filter(x => (deg.get(x) ?? 0) < r)
            .sort((a, b) => (deg.get(a) ?? 0) - (deg.get(b) ?? 0) || a - b);
          const cand2 = groups[c2]
            .filter(x => (deg.get(x) ?? 0) < r)
            .sort((a, b) => (deg.get(a) ?? 0) - (deg.get(b) ?? 0) || a - b);

          let placed = false;
          for (const x of cand1) {
            if (placed) break;
            for (const y of cand2) {
              if (addEdge(x, y)) { placed = true; break; }
            }
          }
          if (!placed) {
            alert(
              `Unable to place the single cross-class edge between classes ${c1} and ${c2} within degree cap r=${r}.`
            );
            return;
          }
        }
      }
    }

    setEdges(out);
    saveToHistory(nodes, 'Conflict edges: within-class chains + exactly one edge per class pair');
    setInfo(
      `Built ${out.length} edges: within-class chains; exactly one edge for each pair of color classes; degree ≤ ${r}.`
    );
  };

  const clearEdges = () => {
    setEdges([]);
    setInfo('Cleared all edges.');
  };

  // yo chai change garera tyo color grp ko logic lagau ne
  const sortNodesAnimated = () => {
    if (nodes.length === 0) return;

    const cols = 5;
    const marginX = 60;
    const marginY = 60;
    const usableW = Math.max(0, width - 2 * marginX);
    const usableH = Math.max(0, height - 2 * marginY);

    const ordered = [...nodes].sort((a, b) => a.id - b.id);
    const n = ordered.length;
    const rows = Math.max(1, Math.ceil(n / cols));

    const gapX = cols > 1 ? usableW / (cols - 1) : 0;
    const gapY = rows > 1 ? usableH / (rows - 1) : 0;

    const target = new Map();
    for (let idx = 0; idx < n; idx++) {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = marginX + col * gapX;
      const y = marginY + row * gapY;
      target.set(ordered[idx].id, { x, y });
    }

    const start = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }]));
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

  // Group nodes by color classes
  const groupByColorClasses = () => {
    if (nodes.length === 0) return;
    if (!k || k === 0) {
      setInfo('Enable "Enforce Max Degree" and set max degree to group by color classes.');
      return;
    }

    const marginX = 60;
    const marginY = 60;
    const usableW = Math.max(0, width - 2 * marginX);
    const usableH = Math.max(0, height - 2 * marginY);

    // Group nodes by their color class
    const nodesByClass = new Map();
    for (let i = 0; i < k; i++) {
      nodesByClass.set(i, []);
    }

    nodes.forEach(n => {
      const c = coloring[n.id];
      if (c != null && c >= 0 && c < k) {
        nodesByClass.get(c).push(n);
      } else {
        // Fallback: assign to class 0 if no color assigned
        nodesByClass.get(0).push(n);
      }
    });

    // Sort nodes within each class by ID for consistency
    nodesByClass.forEach((nodeList, classIdx) => {
      nodeList.sort((a, b) => a.id - b.id);
    });

    // Arrange nodes: each color class gets its own column
    const cols = k;
    const gapX = cols > 1 ? usableW / (cols - 1) : 0;

    const target = new Map();
    let maxNodesInClass = 0;
    nodesByClass.forEach((nodeList) => {
      maxNodesInClass = Math.max(maxNodesInClass, nodeList.length);
    });

    nodesByClass.forEach((nodeList, classIdx) => {
      const x = marginX + classIdx * gapX;
      const rows = Math.max(1, nodeList.length);
      const gapY = rows > 1 ? usableH / (rows - 1) : 0;

      nodeList.forEach((node, idx) => {
        const y = marginY + idx * gapY;
        target.set(node.id, { x, y });
      });
    });

    const start = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }]));
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
        saveToHistory(newNodes, 'Grouped nodes by color classes');
        setInfo(`Nodes grouped by color classes (${k} classes).`);
      }
    };

    requestAnimationFrame(step);
  };

  // // ---- NEW: adjacency/targets helpers for recoloring ----
  // const adj = useMemo(() => {
  //   const m = new Map();
  //   nodes.forEach(n => m.set(n.id, new Set()));
  //   edges.forEach(({ a, b }) => {
  //     if (!m.has(a)) m.set(a, new Set());
  //     if (!m.has(b)) m.set(b, new Set());
  //     m.get(a).add(b);
  //     m.get(b).add(a);
  //   });
  //   return m;
  // }, [nodes, edges]);

  // const targetSizes = useMemo(() => {
  //   if (!k) return [];
  //   const n = nodes.length;
  //   const base = Math.floor(n / k), extra = n % k;
  //   return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
  // }, [nodes.length, k]);

  // const bucketsFrom = (col) => {
  //   const b = Array.from({ length: k }, () => new Set());
  //   for (const n of nodes) {
  //     const c = col[n.id];
  //     if (c != null && c >= 0 && c < k) b[c].add(n.id);
  //   }
  //   return b;
  // };

  // const canMove = (v, toClass, col) => {
  //   for (const u of adj.get(v) || []) {
  //     if (col[u] === toClass) return false;
  //   }
  //   return true;
  // };

  // const hasCapacity = (cls, buckets, targets) => {
  //   if (cls < 0 || cls >= buckets.length) return false;
  //   return buckets[cls].size < targets[cls];
  // };

  // // ---- NEW: Case 1 recoloring step ----
  // // ---- REPLACE your runCase1Step with this version ----
  // const runCase1Step = () => {
  //   const r = parseInt(maxDegree, 10);
  //   if (!enforceMaxDegree || isNaN(r) || r < 0) {
  //     setInfo('Enable "Enforce Max Degree" and set a valid r first.');
  //     return;
  //   }
  //   if (!k) { setInfo('Invalid number of color classes.'); return; }
  //   if (edges.length === 0) { setInfo('No edges to resolve.'); return; }

  //   // 1) Find a monochromatic (conflict) edge xy in class V
  //   const col0 = { ...coloring };
  //   let conflict = null;
  //   for (const { a, b } of edges) {
  //     if (col0[a] != null && col0[a] === col0[b]) { conflict = { x: a, y: b, V: col0[a] }; break; }
  //   }
  //   if (!conflict) {
  //     setInfo('Already a proper coloring (no monochromatic edges).');
  //     return;
  //   }
  //   const { x, y, V } = conflict;

  //   // Helpers
  //   const bucketsFrom = (col) => {
  //     const b = Array.from({ length: k }, () => new Set());
  //     for (const n of nodes) {
  //       const c = col[n.id];
  //       if (c != null && c >= 0 && c < k) b[c].add(n.id);
  //     }
  //     return b;
  //   };
  //   const canMove = (v, toClass, col) => {
  //     for (const u of adj.get(v) || []) {
  //       if (col[u] === toClass) return false;
  //     }
  //     return true;
  //   };
  //   const hasCapacity = (cls, buckets, targets) =>
  //     cls >= 0 && cls < buckets.length && buckets[cls].size < targets[cls];

  //   // 2) Primary move: move one endpoint (x or y) to some W != V
  //   //    IMPORTANT: do NOT require capacity for this move; allow a temporary overfull class
  //   let mover = null, W = null;
  //   const tryEndpoint = (v) => {
  //     for (let cls = 0; cls < k; cls++) if (cls !== V) {
  //       if (canMove(v, cls, col0)) return cls;
  //     }
  //     return null;
  //   };
  //   W = tryEndpoint(x); mover = x;
  //   if (W == null) { W = tryEndpoint(y); mover = y; }
  //   if (W == null) {
  //     setInfo('Case 1: neither endpoint can move to any other class without conflict.');
  //     return;
  //   }

  //   // apply mover -> W (nearly equitable allowed)
  //   const col1 = { ...col0 };
  //   col1[mover] = W;

  //   // 3) Now find z ∈ W and X ≠ W, such that:
  //   //    - X has capacity,
  //   //    - z can move to X,
  //   //    - there exists y1 ∈ V ∩ N(z) that becomes movable to W once z leaves W.
  //   const buckets1 = bucketsFrom(col1);   // after mover→W
  //   for (const z of buckets1[W]) {
  //     for (let X = 0; X < k; X++) if (X !== W) {
  //       if (!hasCapacity(X, buckets1, targetSizes)) continue;   // require capacity for z→X
  //       if (!canMove(z, X, col1)) continue;

  //       // S_z = neighbors of z in class V (under col1)
  //       const Sz = [...(adj.get(z) || [])].filter(u => col1[u] === V);
  //       for (const y1 of Sz) {
  //         // After z leaves W, does y1 have any neighbor remaining in W?
  //         let ok = true;
  //         for (const u of adj.get(y1) || []) {
  //           if (u === z) continue; // z will leave W
  //           if (col1[u] === W) { ok = false; break; }
  //         }
  //         if (!ok) continue;

  //         // Perform the two recolor moves:
  //         // (a) z: W -> X  (X had capacity)
  //         const col2 = { ...col1 };
  //         col2[z] = X;

  //         // (b) y1: V -> W (now safe because z left W)
  //         if (!canMove(y1, W, col2)) {
  //           // Safety; should be fine given the check above
  //           continue;
  //         }
  //         col2[y1] = W;

  //         setColoring(col2);
  //         setInfo(`Case 1: moved ${mover} to class ${W}; then ${z} ${W}→${X}; then ${y1} ${V}→${W}.`);
  //         return;
  //       }
  //     }
  //   }

  //   setInfo('Case 1: no suitable (z, X, y₁) found after the endpoint move. Try a different graph or r.');
  // };

   // Render map for aux graph
   const auxGraphLayout = useMemo(() => {
    const layout = new Map();
    const num = auxGraphNodes.length;
    if (num === 0) return layout;
    
    const w = 400, h = 400, R = 150, cX = w / 2, cY = h / 2;
    auxGraphNodes.forEach((node, i) => {
      const angle = (i / num) * 2 * Math.PI - Math.PI / 2;
      layout.set(node.id, {
        x: cX + R * Math.cos(angle),
        y: cY + R * Math.sin(angle)
      });
    });
    return layout;
  }, [auxGraphNodes]);
  
  const pathEdges = useMemo(() => {
    const set = new Set();
    for(let i=0; i < auxGraphPath.length - 1; i++) {
      set.add(`${auxGraphPath[i]}-${auxGraphPath[i+1]}`);
    }
    return set;
  }, [auxGraphPath]);


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
          {lemmaStatus && (
            <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mr-3 animate-pulse-slow shadow-sm"></div>
                <span className="text-purple-800 font-medium text-sm">{lemmaStatus}</span>
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

              {/* Legend with actual sizes vs targets */}
              {enforceMaxDegree && k > 0 && (
                <div className="w-full mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    {colorPalette.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-black/10" style={{ background: c }} />
                        <span className="text-xs text-slate-700">Class {i}: <b>{currentColorCounts[i] ?? 0}</b></span>
                    </div>
                    ))}
                    {q_base > 0 && (
                      <div className="w-full text-xs text-slate-600 pt-2 border-t border-yellow-300 mt-2">
                        Equitable Target: {r_rem} classes of size {q_base + 1}, {k - r_rem} classes of size {q_base}
                      </div>
                    )}
                </div>
              )}

              <div className="w-full mt-3 flex flex-wrap gap-2">
                <button
                  onClick={sortNodesAnimated}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Sort by ID (animate)
                </button>
                <button
                  onClick={groupByColorClasses}
                  disabled={!enforceMaxDegree || k === 0}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  title={!enforceMaxDegree || k === 0 ? "Enable 'Enforce Max Degree' and set max degree to use this feature" : "Group nodes by their color classes"}
                >
                  Group by Color Classes
                </button>
              </div>
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

                <button
                  onClick={addNode}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Add Single Node
                </button>

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

                <button
                  onClick={createExampleGraph}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors font-semibold"
                >
                  Example Graph for Lemma 2.1
                </button>

                <button
                  onClick={clearGraph}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Graph
                </button>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Display</label>
                  <div className="text-xs text-slate-600">
                    Scroll to zoom. Drag background to pan. Drag nodes to move.
                  </div>
                </div>
              </div>

              {/* Edge Operations */}
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
                  <button
                    onClick={buildConflictProneEdges}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title="Favor same-color adjacency, respect r, avoid complete graphs"
                  >
                    Conflict-Prone Edges
                  </button>

                  <button
                    onClick={simulateEdges}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title="Balanced pattern: i → (i+1..i+r), undirected (no wrap)"
                  >
                    Simulate Edges (balanced)
                  </button>

                  <button
                    onClick={clearEdges}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Edges
                  </button>

                  {/* NEW: Case 1 recoloring trigger */}
                  <button
                    onClick={runLemma2_1}
                    disabled={!enforceMaxDegree || k < 2}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    title=""
                  >
                    Apply Lemma 2.1
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

                {/* Edges */}
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
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Aux Graph Visualizer */}
          {/* <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Auxiliary Graph H on Lemma 2.1</h3>
            <svg
              viewBox={`0 0 400 400`}
              className="w-full h-auto border border-slate-300 rounded-lg bg-slate-50"
            >
              <defs>
                <marker
                  id="arrowhead"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrowhead-path"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#E11D48" />
                </marker>
              </defs>
              // Edges 
              <g>
                {auxGraphEdges.map(edge => {
                  const p1 = auxGraphLayout.get(edge.from);
                  const p2 = auxGraphLayout.get(edge.to);
                  if (!p1 || !p2) return null;
                  const isPath = pathEdges.has(`${edge.from}-${edge.to}`);
                  const stroke = isPath ? '#E11D48' : '#64748b';
                  const marker = isPath ? 'url(#arrowhead-path)' : 'url(#arrowhead)';
                  
                  // Offset for arrowhead
                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  const dist = Math.hypot(dx, dy);
                  const normX = dx / dist;
                  const normY = dy / dist;
                  const x2 = p2.x - normX * 30; // 30 is node radius
                  const y2 = p2.y - normY * 30;
                  
                  return (
                    <line
                      key={`${edge.from}-${edge.to}`}
                      x1={p1.x} y1={p1.y}
                      x2={x2} y2={y2}
                      stroke={stroke}
                      strokeWidth={isPath ? 3 : 1.5}
                      markerEnd={marker}
                    />
                  );
                })}
              </g>
              // Nodes 
              <g>
                {auxGraphNodes.map(node => {
                  const p = auxGraphLayout.get(node.id);
                  if (!p) return null;
                  const isPath = auxGraphPath.includes(node.id);
                  const fill = colorPalette[node.id] || '#E5E7EB';
                  
                  let stroke = '#1e293b';
                  let strokeWidth = 1;
                  if (isPath) { stroke = '#E11D48'; strokeWidth = 4; }
                  else if (node.type === 'large') { stroke = '#2563EB'; strokeWidth = 3; }
                  else if (node.type === 'small') { stroke = '#D97706'; strokeWidth = 3; }
                  
                  return (
                    <g key={node.id} transform={`translate(${p.x}, ${p.y})`}>
                      <circle
                        r="25"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                      />
                      <text
                        textAnchor="middle"
                        dy=".3em"
                        className="fill-slate-900 font-bold select-none"
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.id}
                      </text>
                      <text
                        textAnchor="middle"
                        dy="35"
                        className="fill-slate-600 text-sm select-node"
                        style={{ pointerEvents: 'none' }}
                      >
                        (n={node.size})
                      </text>
                    </g>
                  )
                })}
              </g>
              {auxGraphNodes.length === 0 && (
                <text x="200" y="200" textAnchor="middle" className="fill-slate-500">
                  Run Lemma 2.1 to build Aux
                </text>
              )}
            </svg>
        </div> */}

          {/* Quick Guide */}
          <div className="mt-8 bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>🖱️ <strong>Drag</strong> nodes • <strong>Scroll</strong> to zoom • <strong>Drag background</strong> to pan</span>
              <span>🎨 <strong>Add nodes</strong> → <strong>Set max degree</strong> → <strong>Case 1</strong> to repair conflicts</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
