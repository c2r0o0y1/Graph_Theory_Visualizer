# Graph Theory Visualizer

An interactive React app for exploring graph-theory algorithms. The flagship
feature is a step-by-step visualizer of the **Hajnal–Szemerédi theorem** via
the short proof by **Kierstead & Kostochka** (*A Short Proof of the
Hajnal–Szemerédi Theorem on Equitable Colouring*, 2008). The app runs the
full polynomial-time algorithm from Theorem 3.2 on the 16-vertex paper graph
and animates every move.

## Pages

- `/bfs` — Breadth-First Search visualizer
- `/hs-algo` — H-S Algorithm / Graph coloring visualizer (see below)

## H-S Algorithm Simulator

The H-S page (`src/Pages/HSAlgo.jsx`) includes a full simulator of the
Kierstead–Kostochka algorithm for equitable (r+1)-coloring of any graph with
Δ(G) ≤ r.

### The paper graph

A one-click button loads the exact graph from the paper notes:

- **16 vertices** `{0..15}` laid out to match the figure
- **22 edges**, including `{14,15}`, enumerated roughly in the order `{0,1}, {1,2}, {2,3}, {1,4}, …`
- **Δ(G) = 3**, so `r = 3` and the algorithm seeks an equitable `k = r + 1 = 4`
  coloring — four classes of four vertices each.

### What the simulator does

The simulator implements **Theorem 3.2** (the main polynomial-time algorithm):

1. Start from `G_0`, the empty graph, with an arbitrary equitable coloring
   `f_0` (classes of 4).
2. For each vertex `v_i`, `i = 1, …, n−1`:
   - Add every edge of `G` between `v_i` and `{v_0, …, v_{i−1}}` to form `G_i`.
   - If `v_i` has **no** neighbor in its own color class, keep
     `f_i := f_{i−1}`.
   - Otherwise, move `v_i` to a color class where it has no neighbors. This
     always exists because `d(v_i) ≤ r < k`. The result is a **nearly
     equitable** coloring `f′_{i−1}` of `G_i` (one `V+` of size `s+1`, one
     `V−` of size `s−1`, the rest of size `s`).
   - Apply `P′` (the sub-algorithm from Theorem 3.1) to `(G_i, f′_{i−1})` to
     restore equitability and obtain `f_i`.

The sub-algorithm `P′` is a loop over **Lemma 2.1**:

- Build the auxiliary digraph `H(G, f)`. Its vertices are the color classes,
  and an arc `V → W` exists whenever some vertex `y ∈ V` has no neighbor in
  `W` (i.e., `y` is movable from `V` to `W`).
- BFS from `V+` to find a path `V+ = V_1 → V_2 → … → V_k = V−`.
- Along the path, move a movable vertex from each `V_j` to `V_{j+1}`. This
  shrinks `V+` by one, grows `V−` by one, and leaves all other classes
  unchanged, restoring equitability in a single pass.

The proof also contains **Case 2** for the situation where `V+` is *not*
accessible to `V−` in `H`. For the paper graph, that branch is never reached,
so the simulator surfaces the situation with an explanatory message if it
were to happen on a custom graph.

### Step-by-step animation

Every snapshot of the algorithm (edge addition, conflict detection, vertex
move, Lemma 2.1 path discovery, equitability check) is precomputed and then
played back so you can:

- **Load Paper Graph** — populates the 16-vertex graph and initial coloring.
- **Compute H-S Steps** — precomputes every algorithm snapshot.
- **Run / Pause** — auto-plays the animation at adjustable speed.
- **Next / Back** — step one snapshot at a time.
- **Reset** — rewinds to the initial state.
- **Speed slider** — controls the delay between auto-played steps.

During playback:

- The **edge currently being added** is highlighted in green.
- A **conflict edge** (monochromatic, needs resolution) is highlighted in red.
- The **vertex being moved** gets a pulsing green ring.
- The **vertex currently being processed** (`v_i`) is ringed in indigo.
- A live phase banner describes what the algorithm is doing at each snapshot.

### Other features on the H-S page

- Add / delete / bulk-add nodes
- Bulk edge input (`1-2, 2-3, …`) with degree-cap validation
- "Simulate Edges" builder (connected graph up to max-degree)
- "Conflict-Prone Edges" builder (within-class chains + one cross-class edge)
- Standalone Lemma 2.1 button for ad-hoc graphs
- Sort by ID, Group by color classes (animated)
- Undo / Redo, drag-to-move nodes, zoom & pan

## Reference

- H. A. Kierstead & A. V. Kostochka, *A Short Proof of the
  Hajnal–Szemerédi Theorem on Equitable Colouring*, Combinatorics, Probability
  and Computing 17 (2008), 265–270.

## Getting started

```bash
npm install
npm start
```

Open <http://localhost:3000> and navigate to `/hs-algo`.

## Available Scripts

- `npm start` — dev server with hot reload
- `npm test` — Jest test runner
- `npm run build` — production build
