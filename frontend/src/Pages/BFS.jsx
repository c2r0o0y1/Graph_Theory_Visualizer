import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import Navbar from '../Components/NavBar';

// Custom CSS for professional scrollbars
const scrollbarStyles = `
  /* Webkit browsers (Chrome, Safari, Edge) */
  .custom-scrollbar::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #64748b, #475569);
    border-radius: 6px;
    border: 2px solid #f8fafc;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #475569, #334155);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: linear-gradient(135deg, #334155, #1e293b);
  }

  .custom-scrollbar::-webkit-scrollbar-corner {
    background: #f8fafc;
  }

  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #64748b #f8fafc;
  }

  /* Thin scrollbar for algorithm steps */
  .thin-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .thin-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  .thin-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border-radius: 4px;
    border: 1px solid #f1f5f9;
  }

  .thin-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
  }

  .thin-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 #f1f5f9;
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = scrollbarStyles;
  document.head.appendChild(styleSheet);
}

// Optimized Node Component
const DraggableNode = memo(({ 
  node, 
  isInPath, 
  isCurrentStep, 
  nodeColor, 
  isDragged,
  showCoordinates,
  showDegrees,
  degree,
  enforceMaxDegree,
  maxDegree,
  onMouseDown 
}) => {
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onMouseDown(e, node);
  }, [onMouseDown, node]);

  return (
    <g 
      onMouseDown={handleMouseDown}
      style={{ 
        cursor: isDragged ? 'grabbing' : 'grab',
        pointerEvents: 'all'
      }}
      className={isDragged ? '' : 'transition-all duration-200'}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={25}
        fill={isCurrentStep ? '#EF4444' : isInPath ? '#7C3AED' : (enforceMaxDegree ? nodeColor : '#E5E7EB')}
        stroke={isCurrentStep ? '#DC2626' : isInPath ? '#5B21B6' : '#6B7280'}
        strokeWidth={isCurrentStep ? 4 : isInPath ? 3 : 2}
        className="hover:stroke-slate-400"
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dy=".3em"
        fontSize={14}
        fontWeight="bold"
        fill={isCurrentStep || isInPath || (enforceMaxDegree && degree > 0) ? '#FFFFFF' : '#374151'}
        className="select-none pointer-events-none"
      >
        {node.id}
      </text>
      {showCoordinates && (
        <text
          x={node.x}
          y={node.y + 40}
          textAnchor="middle"
          fontSize={10}
          fill="#6B7280"
          className="pointer-events-none select-none"
        >
          ({node.x.toFixed(0)}, {node.y.toFixed(0)})
        </text>
      )}
      {showDegrees && (
        <text
          x={node.x}
          y={node.y - 35}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill={enforceMaxDegree && maxDegree && degree >= parseInt(maxDegree) ? '#DC2626' : '#059669'}
          className="pointer-events-none select-none"
        >
          deg: {degree}
        </text>
      )}
    </g>
  );
});

// Optimized BFS Node Component
const BFSNode = memo(({ 
  node, 
  isInPath, 
  isVisited, 
  isCurrent, 
  isInQueue, 
  distance 
}) => {
  let nodeColor = '#E5E7EB';
  let strokeColor = '#6B7280';
  let strokeWidth = 2;
  
  if (isCurrent) {
    nodeColor = '#EF4444';
    strokeColor = '#DC2626';
    strokeWidth = 4;
  } else if (isInPath) {
    nodeColor = '#7C3AED';
    strokeColor = '#5B21B6';
    strokeWidth = 3;
  } else if (isInQueue) {
    nodeColor = '#F59E0B';
    strokeColor = '#D97706';
    strokeWidth = 3;
  } else if (isVisited) {
    nodeColor = '#10B981';
    strokeColor = '#059669';
    strokeWidth = 2;
  }

  return (
    <g className="transition-all duration-300">
      <circle
        cx={node.x}
        cy={node.y}
        r={25}
        fill={nodeColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dy=".3em"
        fontSize={14}
        fontWeight="bold"
        fill={isCurrent || isInPath || isInQueue || isVisited ? '#FFFFFF' : '#374151'}
        className="select-none pointer-events-none"
      >
        {node.id}
      </text>
      {isVisited && distance !== undefined && (
        <text
          x={node.x}
          y={node.y - 35}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill="#059669"
          className="pointer-events-none select-none"
        >
          d: {distance}
        </text>
      )}
    </g>
  );
});

export default function BFS() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Input states for dropdown operations
  const [showNodeInput, setShowNodeInput] = useState('');
  const [showEdgeInput, setShowEdgeInput] = useState('');
  const [showPathInput, setShowPathInput] = useState(false);
  const [inputErrors, setInputErrors] = useState({});
  const [tempInputs, setTempInputs] = useState({
    bulkCount: '',
    deleteNodeId: '',
    edgeFrom: '',
    edgeTo: '',
    randomEdgeCount: '',
    pathStart: '',
    pathEnd: ''
  });
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
  
  // BFS Animation specific state
  const [bfsSteps, setBfsSteps] = useState([]);
  const [currentBfsStep, setCurrentBfsStep] = useState(0);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms
  const [bfsQueue, setBfsQueue] = useState([]);
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [currentNode, setCurrentNode] = useState(null);
  const [distances, setDistances] = useState({});
  
  // Split screen zoom/pan for auxiliary graph
  const [zoom2, setZoom2] = useState(1);
  const [pan2, setPan2] = useState({ x: 0, y: 0 });
  const [isPanning2, setIsPanning2] = useState(false);
  const [panStart2, setPanStart2] = useState({ x: 0, y: 0 });
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


  // Color nodes based on degree (for visualization)
  const colorNodesByDegree = useCallback(() => {
    if (!enforceMaxDegree || !maxDegree) {
      setNodeColors({});
      return;
    }
    
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];
    const newColors = {};
    
    nodes.forEach(node => {
      const degree = getNodeDegree(node.id);
      const colorIndex = Math.min(degree, colors.length - 1);
      newColors[node.id] = colors[colorIndex];
    });
    
    setNodeColors(newColors);
  }, [enforceMaxDegree, maxDegree, nodes, edges]);

  // Update colors when edges or max degree changes
  useEffect(() => {
    colorNodesByDegree();
  }, [colorNodesByDegree]);


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
      const newX = Math.random() * (width - 80) + 40;
      const newY = Math.random() * (height - 80) + 40;
      x = newX;
      y = newY;
      attempts++;
    } while (attempts < maxAttempts && nodes.some(node => {
      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      return distance < minDistance;
    }));
    
    const newNodes = [...nodes, { id, x, y }];
    setNodes(newNodes);
    saveToHistory(newNodes, edges, `Added node ${id}`);
  };

  const addBulkNodes = (nodeCount = bulkNodeCount) => {
    const count = parseInt(nodeCount);
    if (isNaN(count) || count <= 0 || count > 50) {
      return; // Validation is handled in the UI
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
        const newX = Math.random() * (width - 80) + 40;
        const newY = Math.random() * (height - 80) + 40;
        x = newX;
        y = newY;
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

  const addEdge = (fromNodeId = addEdgeFrom, toNodeId = addEdgeTo) => {
    const fromId = parseInt(fromNodeId);
    const toId = parseInt(toNodeId);
    if (isNaN(fromId) || isNaN(toId) || fromId === toId) return false;
    
    // Check if nodes exist
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    if (!fromNode || !toNode) {
      setInputErrors(prev => ({ ...prev, edge: 'One or both nodes do not exist!' }));
      return false;
    }
    
    // Check if edge already exists
    const edgeExists = edges.some(e => 
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    );
    
    if (edgeExists) {
      setInputErrors(prev => ({ ...prev, edge: 'Edge already exists!' }));
      return false;
    }
    
    // Check max degree constraint
    if (enforceMaxDegree && maxDegree) {
      const maxDeg = parseInt(maxDegree);
      const fromDegree = getNodeDegree(fromId);
      const toDegree = getNodeDegree(toId);
      
      if (fromDegree >= maxDeg) {
        setInputErrors(prev => ({ ...prev, edge: `Cannot add edge: Node ${fromId} already has maximum degree of ${maxDeg}` }));
        return false;
      }
      if (toDegree >= maxDeg) {
        setInputErrors(prev => ({ ...prev, edge: `Cannot add edge: Node ${toId} already has maximum degree of ${maxDeg}` }));
        return false;
      }
    }
    
    const newEdges = [...edges, { from: fromId, to: toId }];
    setEdges(newEdges);
    saveToHistory(nodes, newEdges, `Added edge ${fromId} → ${toId}`);
    setAddEdgeFrom('');
    setAddEdgeTo('');
    return true;
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

  // Enhanced BFS with step-by-step tracking
  const computeBFS = (startNode = start, endNode = end) => {
    if (!startNode || !endNode) return false;
    
    const startId = parseInt(startNode);
    const endId = parseInt(endNode);
    
    const startNodeObj = nodes.find(n => n.id === startId);
    const endNodeObj = nodes.find(n => n.id === endId);
    
    if (!startNodeObj || !endNodeObj) {
      setInputErrors(prev => ({ ...prev, path: 'Start or end node does not exist!' }));
      return false;
    }
    
    // Build adjacency list
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    
    edges.forEach(({ from, to }) => {
      if (adj[from] && adj[to]) {
        adj[from].push(to);
        adj[to].push(from);
      }
    });
    
    // Run BFS with step tracking
    const steps = [];
    const queue = [startId];
    const visited = new Set([startId]);
    const parent = {};
    const dist = { [startId]: 0 };
    
    steps.push({
      step: 0,
      action: 'initialize',
      description: `Initialize BFS with start node ${startId}`,
      queue: [...queue],
      visited: new Set(visited),
      current: startId,
      neighbors: [],
      parent: {...parent},
      distances: {...dist},
      pathFound: false,
      finalPath: []
    });
    
    let stepCount = 1;
    let pathFound = false;
    let finalPath = [];
    
    while (queue.length > 0 && !pathFound) {
      const current = queue.shift();
      
      steps.push({
        step: stepCount++,
        action: 'dequeue',
        description: `Dequeue node ${current} from front of queue`,
        queue: [...queue],
        visited: new Set(visited),
        current,
        neighbors: [],
        parent: {...parent},
        distances: {...dist},
        pathFound: false,
        finalPath: []
      });
      
      if (current === endId) {
        // Reconstruct path
        const path = [];
        let node = endId;
        while (node !== undefined) {
          path.unshift(node);
          node = parent[node];
        }
        finalPath = path;
        pathFound = true;
        
        steps.push({
          step: stepCount++,
          action: 'found',
          description: `Target node ${endId} found! Reconstructing path...`,
          queue: [...queue],
          visited: new Set(visited),
          current,
          neighbors: [],
          parent: {...parent},
          distances: {...dist},
          pathFound: true,
          finalPath: [...finalPath]
        });
        break;
      }
      
      const neighbors = adj[current] || [];
      const newNeighbors = [];
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          parent[neighbor] = current;
          dist[neighbor] = dist[current] + 1;
          newNeighbors.push(neighbor);
        }
      }
      
      if (newNeighbors.length > 0) {
        steps.push({
          step: stepCount++,
          action: 'explore',
          description: `Exploring neighbors of ${current}: [${neighbors.join(', ')}]. Adding unvisited: [${newNeighbors.join(', ')}]`,
          queue: [...queue],
          visited: new Set(visited),
          current,
          neighbors: newNeighbors,
          parent: {...parent},
          distances: {...dist},
          pathFound: false,
          finalPath: []
        });
    } else {
        steps.push({
          step: stepCount++,
          action: 'no_neighbors',
          description: `Node ${current} has no unvisited neighbors`,
          queue: [...queue],
          visited: new Set(visited),
          current,
          neighbors: [],
          parent: {...parent},
          distances: {...dist},
          pathFound: false,
          finalPath: []
        });
      }
    }
    
    if (!pathFound) {
      steps.push({
        step: stepCount++,
        action: 'not_found',
        description: `Queue is empty. No path exists from ${startId} to ${endId}`,
        queue: [],
        visited: new Set(visited),
        current: null,
        neighbors: [],
        parent: {...parent},
        distances: {...dist},
        pathFound: false,
        finalPath: []
      });
    }
    
    setBfsSteps(steps);
    setCurrentBfsStep(0);
    setIsAnimating(true);
    
    // Set initial state
    const firstStep = steps[0];
    setBfsQueue(firstStep.queue);
    setVisitedNodes(firstStep.visited);
    setCurrentNode(firstStep.current);
    setDistances(firstStep.distances);
    setPath(firstStep.finalPath);
    
    setAlgorithmInfo(firstStep.description);
    
    return true;
  };

  // Legacy compute function for compatibility
  const compute = computeBFS;

  // BFS Animation Controls
  const nextBfsStep = () => {
    if (currentBfsStep < bfsSteps.length - 1) {
      const newStep = currentBfsStep + 1;
      setCurrentBfsStep(newStep);
      updateBfsState(bfsSteps[newStep]);
    }
  };

  const prevBfsStep = () => {
    if (currentBfsStep > 0) {
      const newStep = currentBfsStep - 1;
      setCurrentBfsStep(newStep);
      updateBfsState(bfsSteps[newStep]);
    }
  };

  const updateBfsState = (step) => {
    setBfsQueue(step.queue);
    setVisitedNodes(step.visited);
    setCurrentNode(step.current);
    setDistances(step.distances);
    setPath(step.finalPath);
    setAlgorithmInfo(step.description);
  };

  const playAnimation = () => {
    setIsPlayingAnimation(true);
  };

  const pauseAnimation = () => {
    setIsPlayingAnimation(false);
  };

  const resetAnimation = () => {
    setIsPlayingAnimation(false);
    setCurrentBfsStep(0);
    if (bfsSteps.length > 0) {
      updateBfsState(bfsSteps[0]);
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < bfsSteps.length) {
      setCurrentBfsStep(stepIndex);
      updateBfsState(bfsSteps[stepIndex]);
    }
  };

  // Auto-play animation
  React.useEffect(() => {
    let interval;
    if (isPlayingAnimation && isAnimating && currentBfsStep < bfsSteps.length - 1) {
      interval = setInterval(() => {
        setCurrentBfsStep(prev => {
          const newStep = prev + 1;
          if (newStep < bfsSteps.length) {
            updateBfsState(bfsSteps[newStep]);
            return newStep;
          } else {
            setIsPlayingAnimation(false);
            return prev;
          }
        });
      }, animationSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlayingAnimation, isAnimating, currentBfsStep, bfsSteps, animationSpeed]);


  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / documentHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    
    // Clear BFS animation state
    setBfsSteps([]);
    setCurrentBfsStep(0);
    setIsPlayingAnimation(false);
    setBfsQueue([]);
    setVisitedNodes(new Set());
    setCurrentNode(null);
    setDistances({});
    
    setAlgorithmInfo('Graph cleared');
  };

  // Auto-generate random edges
  const generateRandomEdges = (edgeCount = autoEdgeCount) => {
    if (nodes.length < 2) {
      setInputErrors(prev => ({ ...prev, edge: 'Need at least 2 nodes to create edges' }));
      return false;
    }

    const count = parseInt(edgeCount);
    if (isNaN(count) || count <= 0) {
      setInputErrors(prev => ({ ...prev, edge: 'Please enter a valid number of edges' }));
      return false;
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
    return true;
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
        setAlgorithmInfo(`Cannot create complete graph: Maximum degree ${maxDeg} is less than required ${nodes.length - 1}`);
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
        setAlgorithmInfo(`Cannot create cycle graph: Maximum degree ${maxDeg} is less than required 2`);
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
        setAlgorithmInfo(`Cannot create star graph: Maximum degree ${maxDeg} is less than required ${nodes.length - 1} for center node`);
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

  // Create the example grid graph from the image
  const createExampleGraph = () => {
    // Clear existing graph
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

    const exampleEdges = [
      // Top row horizontal connections
      { from: 6, to: 5 },
      { from: 5, to: 4 },
      { from: 4, to: 3 },
      { from: 3, to: 8 },
      
      // Vertical connections from top to middle
      { from: 6, to: 7 },
      { from: 5, to: 0 },
      { from: 4, to: 1 },
      { from: 3, to: 2 },
      { from: 8, to: 9 },
      
      // Middle row horizontal connections
      { from: 7, to: 0 },
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      
      // Vertical connections from middle to bottom
      { from: 7, to: 12 },
      
      // Bottom row horizontal connections
      { from: 12, to: 13 },
      { from: 13, to: 14 },
      { from: 14, to: 11 },
      { from: 11, to: 10 },
      
      // Diagonal and special connections
      { from: 2, to: 15 },
      { from: 2, to: 13 },
      { from: 15, to: 14 },
      { from: 15, to: 9 },
      { from: 15, to: 11 },
      { from: 9, to: 10 }
    ];

    setNodes(exampleNodes);
    setEdges(exampleEdges);
    saveToHistory(exampleNodes, exampleEdges, 'Created example grid graph');
    setAlgorithmInfo('Loaded example graph - try BFS from node 6 to node 10!');
    
    // Set suggested start and end points
    setStart('6');
    setEnd('10');
  };

  // Mathematical zoom and pan
  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handleWheel = (e) => {
    // Only zoom when hovering over the main SVG graph area
    if (e.target.closest('#main-svg')) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
    }
  };

  // Auxiliary graph zoom and pan
  const handleZoom2 = (delta) => {
    setZoom2(prev => Math.max(0.3, Math.min(5, prev + delta)));
  };

  const handleWheel2 = (e) => {
    if (e.target.closest('#aux-svg')) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom2(delta);
    }
  };

  const handlePanStart = (e) => {
    if (e.target.tagName === 'circle') return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePanStart2 = (e) => {
    if (e.target.tagName === 'circle') return;
    setIsPanning2(true);
    setPanStart2({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = useCallback((e, node) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setDraggedNode(node.id);
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y
    });
  }, []);

  const handleMouseMove = (e) => {
    if (draggedNode) {
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newX = Math.max(25, Math.min(width - 25, mouseX - dragOffset.x));
      const newY = Math.max(25, Math.min(height - 25, mouseY - dragOffset.y));
      
      // Update nodes immediately without triggering effects
      setNodes(prev => prev.map(node => 
        node.id === draggedNode 
          ? { ...node, x: newX, y: newY }
          : node
      ));
    } else if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (isPanning2) {
      const deltaX = e.clientX - panStart2.x;
      const deltaY = e.clientY - panStart2.y;
      setPan2(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart2({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      saveToHistory(nodes, edges, `Moved node ${draggedNode}`);
    }
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setIsPanning(false);
    setIsPanning2(false);
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
    <>
    <Navbar />
      
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-slate-200 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 custom-scrollbar overflow-y-auto scroll-smooth">
        <div className="container mx-auto px-4 py-8 custom-scrollbar">
          
          {/* Navigation Progress Indicator */}
          <div className="fixed top-20 right-4 z-10 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 p-2">
            <div className="flex flex-col gap-2">
              <div 
                className="w-2 h-2 rounded-full bg-blue-500 cursor-pointer hover:bg-blue-600 transition-colors" 
                title="Graph Header"
                onClick={() => document.querySelector('.graph-header')?.scrollIntoView({ behavior: 'smooth' })}
              />
              <div 
                className="w-2 h-2 rounded-full bg-yellow-500 cursor-pointer hover:bg-yellow-600 transition-colors" 
                title="Controls"
                onClick={() => document.querySelector('.controls-section')?.scrollIntoView({ behavior: 'smooth' })}
              />
              <div 
                className="w-2 h-2 rounded-full bg-green-500 cursor-pointer hover:bg-green-600 transition-colors" 
                title="Visualization"
                onClick={() => document.querySelector('.visualization-section')?.scrollIntoView({ behavior: 'smooth' })}
              />
              {isAnimating && (
                <div 
                  className="w-2 h-2 rounded-full bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors" 
                  title="Algorithm Steps"
                  onClick={() => document.querySelector('.steps-section')?.scrollIntoView({ behavior: 'smooth' })}
                />
              )}
            </div>
          </div>
        {/* Mathematical Header */}
        <div className="text-center mb-8 graph-header animate-fade-in-up">
          <div className="mb-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-2">
              Graph Theory Visualizer
            </h1>
            <p className="text-slate-600 text-xl font-medium animate-slide-in-right">Interactive BFS Algorithm Explorer</p>
            <p className="text-slate-500 text-sm mt-2">Visualize shortest path finding with step-by-step animation</p>
          </div>
          <div className="mt-6 p-6 bg-white rounded-xl shadow-lg border border-slate-200 backdrop-blur-sm bg-white/80 animate-fade-in-up">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
              <div className="text-center group">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-200">
                  <span className="block font-medium text-slate-700 mb-1">Nodes</span>
                  <div className="text-3xl font-bold text-blue-600">{graphProps.nodeCount}</div>
                </div>
              </div>
              <div className="text-center group">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 group-hover:from-green-100 group-hover:to-green-200 transition-all duration-200">
                  <span className="block font-medium text-slate-700 mb-1">Edges</span>
                  <div className="text-3xl font-bold text-green-600">{graphProps.edgeCount}</div>
                </div>
              </div>
              <div className="text-center group">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-200">
                  <span className="block font-medium text-slate-700 mb-1">Components</span>
                  <div className="text-3xl font-bold text-purple-600">{graphProps.connectedComponents}</div>
                </div>
              </div>
              <div className="text-center group">
                <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100 group-hover:from-red-100 group-hover:to-red-200 transition-all duration-200">
                  <span className="block font-medium text-slate-700 mb-1">Max Degree</span>
                  <div className="text-3xl font-bold text-red-600">{graphProps.maxCurrentDegree}</div>
                </div>
              </div>
              <div className="text-center group col-span-2 md:col-span-1">
                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 group-hover:from-orange-100 group-hover:to-orange-200 transition-all duration-200">
                  <span className="block font-medium text-slate-700 mb-1">Avg Degree</span>
                  <div className="text-3xl font-bold text-orange-600">{graphProps.averageDegree}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Information */}
        {algorithmInfo && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm animate-slide-in-right">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mr-3 animate-pulse-slow shadow-sm"></div>
              <span className="text-blue-800 font-medium text-sm">{algorithmInfo}</span>
            </div>
          </div>
        )}

        {/* Maximum Degree Constraint */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl shadow-lg p-6 mb-6 border border-yellow-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-800">Maximum Degree Constraint</h3>
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
         <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 mb-8 border border-slate-200 controls-section">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Node Operations */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-blue-200">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-bold text-slate-800">Node Operations</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Node Actions</label>
                <select
                  value={showNodeInput}
                  onChange={(e) => {
                    const action = e.target.value;
                    if (action === 'add-single') {
                      addNode();
                      setShowNodeInput('');
                    } else {
                      setShowNodeInput(action);
                      setTempInputs(prev => ({ ...prev, bulkCount: '', deleteNodeId: '' }));
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="">Select Node Operation...</option>
                  <option value="add-single">Add Single Node</option>
                  <option value="add-bulk">Add Multiple Nodes</option>
                  <option value="delete">Delete Node</option>
                </select>

                                {/* Bulk Nodes Input */}
                {showNodeInput === 'add-bulk' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of nodes to add (1-50)</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="number"
                  min="1"
                  max="50"
                        value={tempInputs.bulkCount}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTempInputs(prev => ({ ...prev, bulkCount: value }));
                          
                          // Clear error when user starts typing
                          if (inputErrors.bulkCount) {
                            setInputErrors(prev => ({ ...prev, bulkCount: '' }));
                          }
                        }}
                        placeholder="Enter count..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.bulkCount 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                            const count = parseInt(tempInputs.bulkCount);
                            if (isNaN(count) || count < 1 || count > 50) {
                              setInputErrors(prev => ({ ...prev, bulkCount: 'Please enter a number between 1 and 50' }));
                              return;
                            }
                            addBulkNodes(tempInputs.bulkCount);
                            setShowNodeInput('');
                            setInputErrors(prev => ({ ...prev, bulkCount: '' }));
                    }
                  }}
                />
                      <div className="flex gap-2 flex-shrink-0">
                <button 
                          onClick={() => {
                            const count = parseInt(tempInputs.bulkCount);
                            if (isNaN(count) || count < 1 || count > 50) {
                              setInputErrors(prev => ({ ...prev, bulkCount: 'Please enter a number between 1 and 50' }));
                              return;
                            }
                            addBulkNodes(tempInputs.bulkCount);
                            setShowNodeInput('');
                            setInputErrors(prev => ({ ...prev, bulkCount: '' }));
                          }}
                          disabled={!tempInputs.bulkCount}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowNodeInput('');
                            setInputErrors(prev => ({ ...prev, bulkCount: '' }));
                          }}
                          className="px-2 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          ✕
                </button>
              </div>
              </div>
                    {inputErrors.bulkCount && (
                      <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        {inputErrors.bulkCount}
                      </div>
                    )}
                  </div>
                )}

                {/* Delete Node Input */}
                {showNodeInput === 'delete' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Node ID to delete</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="number"
                        value={tempInputs.deleteNodeId}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, deleteNodeId: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.deleteNode) {
                            setInputErrors(prev => ({ ...prev, deleteNode: '' }));
                          }
                        }}
                        placeholder="Enter node ID..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.deleteNode 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-red-500 focus:border-red-500'
                        }`}
                        autoFocus
                  onKeyPress={(e) => {
                          if (e.key === 'Enter' && tempInputs.deleteNodeId) {
                            setDeleteNodeId(tempInputs.deleteNodeId);
                      deleteNode();
                            setShowNodeInput('');
                    }
                  }}
                />
                      <div className="flex gap-2 flex-shrink-0">
                <button 
                          onClick={() => {
                            if (tempInputs.deleteNodeId) {
                              setDeleteNodeId(tempInputs.deleteNodeId);
                              deleteNode();
                              setShowNodeInput('');
                            }
                          }}
                          disabled={!tempInputs.deleteNodeId}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            setShowNodeInput('');
                            setInputErrors(prev => ({ ...prev, deleteNode: '' }));
                          }}
                          className="px-2 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          ✕
                </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edge Operations */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-green-200">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h3 className="text-lg font-bold text-slate-800">Edge Operations</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Edge Actions</label>
                <select
                  value={showEdgeInput}
                  onChange={(e) => {
                    const action = e.target.value;
                    setShowEdgeInput(action);
                    setTempInputs(prev => ({ 
                      ...prev, 
                      edgeFrom: '', 
                      edgeTo: '', 
                      randomEdgeCount: '' 
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="">Select Edge Operation...</option>
                  <option value="add">Add Edge</option>
                  <option value="delete">Delete Edge</option>
                  <option value="generate">Generate Random Edges</option>
                </select>

                                {/* Add Edge Input */}
                {showEdgeInput === 'add' && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Add edge between nodes</label>
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input 
                    type="number"
                        value={tempInputs.edgeFrom}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, edgeFrom: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.edge) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                          }
                        }}
                        placeholder="From node..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.edge 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-green-500 focus:border-green-500'
                        }`}
                        autoFocus
                  />
                  <input 
                    type="number"
                        value={tempInputs.edgeTo}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, edgeTo: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.edge) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                          }
                        }}
                        placeholder="To node..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.edge 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-green-500 focus:border-green-500'
                        }`}
                    onKeyPress={(e) => {
                          if (e.key === 'Enter' && tempInputs.edgeFrom && tempInputs.edgeTo) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                            const success = addEdge(tempInputs.edgeFrom, tempInputs.edgeTo);
                            if (success) {
                              setShowEdgeInput('');
                            }
                      }
                    }}
                  />
                </div>
                    <div className="flex gap-2 flex-shrink-0">
                <button 
                        onClick={() => {
                          if (tempInputs.edgeFrom && tempInputs.edgeTo) {
                            setInputErrors(prev => ({ ...prev, edge: '' })); // Clear previous errors
                            
                            const success = addEdge(tempInputs.edgeFrom, tempInputs.edgeTo);
                            if (success) {
                              setShowEdgeInput('');
                            }
                          }
                        }}
                        disabled={!tempInputs.edgeFrom || !tempInputs.edgeTo}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Add Edge
                </button>
                      <button
                        onClick={() => {
                          setShowEdgeInput('');
                          setInputErrors(prev => ({ ...prev, edge: '' }));
                        }}
                        className="px-2 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        ✕
                </button>
              </div>
                    {inputErrors.edge && (
                      <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        {inputErrors.edge}
                      </div>
                    )}
                  </div>
                )}

                                {/* Delete Edge Input */}
                {showEdgeInput === 'delete' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Delete edge between nodes</label>
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input 
                    type="number"
                        value={tempInputs.edgeFrom}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, edgeFrom: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.edge) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                          }
                        }}
                        placeholder="From node..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.edge 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-red-500 focus:border-red-500'
                        }`}
                        autoFocus
                  />
                  <input 
                    type="number"
                        value={tempInputs.edgeTo}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, edgeTo: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.edge) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                          }
                        }}
                        placeholder="To node..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.edge 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-red-500 focus:border-red-500'
                        }`}
                    onKeyPress={(e) => {
                          if (e.key === 'Enter' && tempInputs.edgeFrom && tempInputs.edgeTo) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                            setDeleteEdgeFrom(tempInputs.edgeFrom);
                            setDeleteEdgeTo(tempInputs.edgeTo);
                        deleteEdge();
                            setShowEdgeInput('');
                      }
                    }}
                  />
                </div>
                    <div className="flex gap-2 flex-shrink-0">
                <button 
                        onClick={() => {
                          if (tempInputs.edgeFrom && tempInputs.edgeTo) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                            setDeleteEdgeFrom(tempInputs.edgeFrom);
                            setDeleteEdgeTo(tempInputs.edgeTo);
                            deleteEdge();
                            setShowEdgeInput('');
                          }
                        }}
                        disabled={!tempInputs.edgeFrom || !tempInputs.edgeTo}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Delete Edge
                </button>
                      <button
                        onClick={() => {
                          setShowEdgeInput('');
                          setInputErrors(prev => ({ ...prev, edge: '' }));
                        }}
                        className="px-2 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        ✕
                </button>
              </div>
                    {inputErrors.edge && (
                      <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        {inputErrors.edge}
                      </div>
                    )}
                  </div>
                )}

                                {/* Generate Random Edges Input */}
                {showEdgeInput === 'generate' && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of random edges to generate</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="number"
                        min="1"
                        value={tempInputs.randomEdgeCount}
                        onChange={(e) => setTempInputs(prev => ({ ...prev, randomEdgeCount: e.target.value }))}
                        placeholder="Enter count..."
                        className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                    onKeyPress={(e) => {
                          if (e.key === 'Enter' && tempInputs.randomEdgeCount > 0) {
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                            const success = generateRandomEdges(tempInputs.randomEdgeCount);
                            if (success) {
                              setShowEdgeInput('');
                            }
                      }
                    }}
                  />
                      <div className="flex gap-2 flex-shrink-0">
                  <button 
                          onClick={() => {
                            if (tempInputs.randomEdgeCount > 0) {
                              setInputErrors(prev => ({ ...prev, edge: '' }));
                              const success = generateRandomEdges(tempInputs.randomEdgeCount);
                              if (success) {
                                setShowEdgeInput('');
                              }
                            }
                          }}
                          disabled={!tempInputs.randomEdgeCount || tempInputs.randomEdgeCount <= 0}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Generate
                  </button>
                  <button 
                          onClick={() => {
                            setShowEdgeInput('');
                            setInputErrors(prev => ({ ...prev, edge: '' }));
                          }}
                          className="px-2 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          ✕
                  </button>
                </div>
                    </div>
                    {inputErrors.edge && (
                      <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        {inputErrors.edge}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Graph Templates</label>
                <select
                  onChange={(e) => {
                    const template = e.target.value;
                    if (template === 'example') createExampleGraph();
                    else if (template === 'complete') createCompleteGraph();
                    else if (template === 'cycle') createCycleGraph();
                    else if (template === 'star') createStarGraph();
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="" className="text-slate-500">Select Graph Template...</option>
                  <option value="example">Example Graph</option>
                  <option value="complete">Complete Graph</option>
                  <option value="cycle">Cycle Graph</option>
                  <option value="star">Star Graph</option>
                </select>
              </div>
            </div>

            {/* Path Operations */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-purple-200">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <h3 className="text-lg font-bold text-slate-800">Path Finding</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Path Actions</label>
                <select
                  value={showPathInput ? 'find-path' : ''}
                  onChange={(e) => {
                    const action = e.target.value;
                    if (action === 'find-path') {
                      setShowPathInput(true);
                      setTempInputs(prev => ({ ...prev, pathStart: '', pathEnd: '' }));
                    } else if (action === 'clear') {
                      clearGraph();
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="">Select Path Operation...</option>
                  <option value="find-path">Find Shortest Path</option>
                  <option value="clear">Clear Graph</option>
                </select>

                                {/* Path Finding Input */}
                {showPathInput && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Find shortest path between nodes</label>
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input 
                    type="number"
                        value={tempInputs.pathStart}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, pathStart: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.path) {
                            setInputErrors(prev => ({ ...prev, path: '' }));
                          }
                        }}
                        placeholder="Start node..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.path 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-purple-500 focus:border-purple-500'
                        }`}
                        autoFocus
                  />
                  <input 
                    type="number"
                        value={tempInputs.pathEnd}
                        onChange={(e) => {
                          setTempInputs(prev => ({ ...prev, pathEnd: e.target.value }));
                          // Clear error when user starts typing
                          if (inputErrors.path) {
                            setInputErrors(prev => ({ ...prev, path: '' }));
                          }
                        }}
                        placeholder="End node..."
                        className={`flex-1 min-w-0 px-3 py-2 border rounded-lg focus:ring-2 ${
                          inputErrors.path 
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-purple-500 focus:border-purple-500'
                        }`}
                    onKeyPress={(e) => {
                          if (e.key === 'Enter' && tempInputs.pathStart && tempInputs.pathEnd) {
                            setInputErrors(prev => ({ ...prev, path: '' }));
                            const success = compute(tempInputs.pathStart, tempInputs.pathEnd);
                            if (success) {
                              setShowPathInput(false);
                            }
                      }
                    }}
                  />
                </div>
                    <div className="flex gap-2 flex-shrink-0">
                <button 
                        onClick={() => {
                          if (tempInputs.pathStart && tempInputs.pathEnd) {
                            setInputErrors(prev => ({ ...prev, path: '' }));
                            const success = compute(tempInputs.pathStart, tempInputs.pathEnd);
                            if (success) {
                              setShowPathInput(false);
                            }
                          }
                        }}
                        disabled={!tempInputs.pathStart || !tempInputs.pathEnd}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        Find Path
                </button>
                <button 
                        onClick={() => {
                          setShowPathInput(false);
                          setInputErrors(prev => ({ ...prev, path: '' }));
                        }}
                        className="px-2 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        ✕
                </button>
                    </div>
                    {inputErrors.path && (
                      <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        {inputErrors.path}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mathematical Controls */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-indigo-200">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-bold text-slate-800">Mathematical Tools</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">History Actions</label>
                <select
                  onChange={(e) => {
                    const action = e.target.value;
                    if (action === 'undo' && currentStep > 0) undo();
                    else if (action === 'redo' && currentStep < history.length) redo();
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="" className="text-slate-500">Select History Action...</option>
                  <option value="undo" disabled={currentStep === 0}>Undo {currentStep > 0 ? `(${currentStep} available)` : '(none)'}</option>
                  <option value="redo" disabled={currentStep >= history.length}>Redo {currentStep < history.length ? `(${history.length - currentStep} available)` : '(none)'}</option>
                </select>
              </div>



                             {/* BFS Animation Controls */}
               {isAnimating && bfsSteps.length > 0 && (
                 <div className="space-y-3">
                   <label className="text-sm font-medium text-slate-700">BFS Animation</label>
                   
                   {/* Play/Pause Controls */}
                   <div className="grid grid-cols-3 gap-2">
                <button 
                       onClick={isPlayingAnimation ? pauseAnimation : playAnimation}
                       disabled={currentBfsStep >= bfsSteps.length - 1}
                       className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                     >
                       {isPlayingAnimation ? '⏸️' : '▶️'}
                </button>
                <button 
                       onClick={resetAnimation}
                       className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg transition-colors"
                >
                       ⏮️
                </button>
                     <div className="text-xs text-slate-600 flex items-center justify-center">
                       {currentBfsStep + 1}/{bfsSteps.length}
                     </div>
              </div>

                   {/* Step Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                       onClick={prevBfsStep}
                       disabled={currentBfsStep === 0}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                       ⏪ Previous
                    </button>
                    <button 
                       onClick={nextBfsStep}
                       disabled={currentBfsStep >= bfsSteps.length - 1}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                       Next ⏩
                    </button>
                  </div>

                   {/* Speed Control */}
                <div className="space-y-1">
                     <label className="text-xs font-medium text-slate-700">Speed: {(1000 / animationSpeed).toFixed(1)}x</label>
                    <input 
                       type="range"
                       min="200"
                       max="2000"
                       step="100"
                       value={animationSpeed}
                       onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
                       className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between text-xs text-slate-500">
                       <span>Fast</span>
                       <span>Slow</span>
                </div>
              </div>

                   {/* Step Progress Bar */}
                   <div className="w-full bg-gray-200 rounded-full h-2">
                     <div 
                       className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                       style={{ width: `${((currentBfsStep + 1) / bfsSteps.length) * 100}%` }}
                     ></div>
                  </div>
                </div>
              )}

              {/* Mathematical Display Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Display Options</label>
                <select
                  onChange={(e) => {
                    const option = e.target.value;
                    if (option === 'coordinates') setShowCoordinates(!showCoordinates);
                    else if (option === 'distances') setShowDistance(!showDistance);
                    else if (option === 'degrees') setShowDegrees(!showDegrees);
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="" className="text-slate-500">Toggle Display Options...</option>
                  <option value="coordinates">Coordinates {showCoordinates ? '(ON)' : '(OFF)'}</option>
                  <option value="distances">Distances {showDistance ? '(ON)' : '(OFF)'}</option>
                  <option value="degrees">Node Degrees {showDegrees ? '(ON)' : '(OFF)'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Stats */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-wrap gap-8 text-sm text-slate-600">
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

                 {/* Split-Screen Graph Visualization */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 visualization-section">
           {/* Main Graph */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
               <h3 className="text-lg font-semibold text-slate-800">Main Graph</h3>
              <div className="flex items-center gap-4">
                 {path.length > 0 && (
                  <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                     Path: {path.join(' → ')} (Length: {path.length - 1})
                  </div>
                )}
                <div className="text-sm text-slate-500">
                   Zoom: ×{zoom.toFixed(1)}
                </div>
              </div>
            </div>
          
             <div className="flex justify-center overflow-x-auto custom-scrollbar">
                          <svg 
                 id="main-svg"
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
                   cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab'
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
                     <DraggableNode
                    key={n.id}
                       node={n}
                       isInPath={isInPath}
                       isCurrentStep={isCurrentStep}
                       nodeColor={nodeColor}
                       isDragged={draggedNode === n.id}
                       showCoordinates={showCoordinates}
                       showDegrees={showDegrees}
                       degree={degree}
                       enforceMaxDegree={enforceMaxDegree}
                       maxDegree={maxDegree}
                       onMouseDown={handleMouseDown}
                     />
                   );
                 })}
               </svg>
             </div>
           </div>

           {/* BFS Algorithm Visualization */}
           <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-slate-200">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
               <h3 className="text-lg font-semibold text-slate-800">BFS Algorithm State</h3>
               <div className="text-sm text-slate-500">
                 Zoom: ×{zoom2.toFixed(1)}
               </div>
             </div>

             {/* BFS State Info */}
             {isAnimating && bfsSteps.length > 0 && (
               <div className="mb-4 space-y-2">
                 <div className="bg-blue-50 p-3 rounded-lg">
                   <div className="text-sm font-medium text-blue-800 mb-2">Current State:</div>
                   <div className="grid grid-cols-2 gap-4 text-xs">
                     <div>
                       <span className="font-medium text-slate-700">Queue:</span>
                       <div className="bg-white p-2 rounded border">
                         {bfsQueue.length > 0 ? `[${bfsQueue.join(', ')}]` : 'Empty'}
                       </div>
                     </div>
                     <div>
                       <span className="font-medium text-slate-700">Visited:</span>
                       <div className="bg-white p-2 rounded border">
                         {visitedNodes.size > 0 ? `{${Array.from(visitedNodes).join(', ')}}` : 'None'}
                       </div>
                     </div>
                   </div>
                   {currentNode && (
                     <div className="mt-2">
                       <span className="font-medium text-slate-700">Current Node:</span>
                       <span className="ml-2 bg-yellow-200 px-2 py-1 rounded text-slate-800">{currentNode}</span>
                     </div>
                   )}
                 </div>
               </div>
             )}

             <div className="flex justify-center overflow-x-auto custom-scrollbar">
               <svg 
                 id="aux-svg"
                 width={width} 
                 height={height} 
                 className="border-2 border-slate-300 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 min-w-full"
                 viewBox={`0 0 ${width} ${height}`}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
                 onMouseDown={handlePanStart2}
                 onWheel={handleWheel2}
                 style={{
                   transform: `scale(${zoom2}) translate(${pan2.x}px, ${pan2.y}px)`,
                   transformOrigin: 'center',
                   transition: isPanning2 ? 'none' : 'transform 0.1s ease-out',
                   cursor: isPanning2 ? 'grabbing' : 'grab'
                 }}
               >
                 {/* Edges */}
                 {edges.map((e, i) => {
                   const a = nodes.find(n => n.id === e.from);
                   const b = nodes.find(n => n.id === e.to);
                   if (!a || !b) return null;
                   
                   const isInPath = path.includes(e.from) && path.includes(e.to);
                   const isTraversed = visitedNodes.has(e.from) && visitedNodes.has(e.to);
                   
                   return (
                     <g key={i}>
                       <line
                         x1={a.x}
                         y1={a.y}
                         x2={b.x}
                         y2={b.y}
                         stroke={isInPath ? '#7C3AED' : isTraversed ? '#10B981' : '#D1D5DB'}
                         strokeWidth={isInPath ? 4 : isTraversed ? 3 : 2}
                         className="transition-all duration-300"
                       />
                  </g>
                );
              })}

                 {/* Nodes */}
                 {nodes.map(n => {
                   const isInPath = path.includes(n.id);
                   const isVisited = visitedNodes.has(n.id);
                   const isCurrent = currentNode === n.id;
                   const isInQueue = bfsQueue.includes(n.id);
                   const distance = distances[n.id];
                   
                   return (
                     <BFSNode
                       key={n.id}
                       node={n}
                       isInPath={isInPath}
                       isVisited={isVisited}
                       isCurrent={isCurrent}
                       isInQueue={isInQueue}
                       distance={distance}
                     />
                );
              })}
            </svg>
             </div>

             {/* Legend */}
             {isAnimating && (
               <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full bg-red-500"></div>
                   <span>Current</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                   <span>In Queue</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full bg-green-500"></div>
                   <span>Visited</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                   <span>Final Path</span>
                 </div>
               </div>
             )}
          </div>
        </div>

         {/* BFS Algorithm Steps */}
         {isAnimating && bfsSteps.length > 0 && (
           <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-slate-200 steps-section">
             <h4 className="font-semibold text-slate-800 mb-4">BFS Algorithm Steps</h4>
             <div className="max-h-64 overflow-y-auto space-y-2 thin-scrollbar">
               {bfsSteps.map((step, index) => (
                 <div 
                   key={index} 
                   className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                     index === currentBfsStep 
                       ? 'bg-blue-100 border-blue-300 text-blue-800' 
                       : index < currentBfsStep
                       ? 'bg-green-50 border-green-200 text-green-800'
                       : 'bg-gray-50 border-gray-200 text-gray-600'
                   }`}
                   onClick={() => goToStep(index)}
                 >
                   <div className="flex items-start gap-3">
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                       index === currentBfsStep 
                         ? 'bg-blue-500 text-white' 
                         : index < currentBfsStep
                         ? 'bg-green-500 text-white'
                         : 'bg-gray-300 text-gray-600'
                     }`}>
                       {index}
                     </div>
                     <div className="flex-1">
                       <div className="text-sm font-medium">{step.action.toUpperCase()}</div>
                       <div className="text-xs mt-1">{step.description}</div>
                       {step.queue.length > 0 && (
                         <div className="text-xs mt-2 bg-white px-2 py-1 rounded border">
                           Queue: [{step.queue.join(', ')}]
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* Quick Guide */}
         <div className="mt-8 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between text-sm text-slate-600">
             <span>🖱️ <strong>Drag</strong> nodes • <strong>Scroll</strong> to zoom • <strong>Drag background</strong> to pan</span>
             <span>🎯 <strong>Build graph</strong> → <strong>Set path</strong> → <strong>Watch BFS</strong></span>
           </div>
         </div>
      </div>
    </div>
    </>
  );
}