export function shortestPath(adjList, start, end) {
    const queue = [start];
    const visited = new Set([start]);
    const prev = {};
  
    while (queue.length) {
      const node = queue.shift();
      if (node === end) break;
      for (const neighbor of adjList[node] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          prev[neighbor] = node;
          queue.push(neighbor);
        }
      }
    }
  
    // Reconstruct path
    const path = [];
    let cur = end;
    while (cur !== undefined) {
      path.unshift(cur);
      if (cur === start) break;
      cur = prev[cur];
    }
    return path[0] === start ? path : [];
  }