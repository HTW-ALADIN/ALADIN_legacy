import { RNG, randomSample, minMaxScaler } from "../../helpers/NumberGenerators";
import { graphviz } from "@hpcc-js/wasm";
import { generateMatrix } from "../../helpers/DataStructures";

const combinations = (values: Array<any>, combinationLength: number = 2) => {
    const combinations: Array<Array<any>> = [];
    for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values.length; j++) {
            combinations.push([i, j]);
        }
    }
    return combinations;
};

interface IShortestPathOptions {
    nodeRange: Array<number>;
    degreeRange: Array<number>;
    hasTarget: boolean;
    seed?: number;
}

interface IEdge {
    distance: number;
    between: Array<number>;
}

interface INode {
    id: number;
    coordinates: Array<number>;
    neighbours: Array<number>;
}

interface IGraph {
    nodes: Array<INode>;
    edges: Array<IEdge>;
}

interface IRow {
    iteration: number;
    cost: Array<number | string>;
    predecessor: Array<number | string>;
}

type IAdjacencyMatrix = Array<Array<number>>;

enum controls {
    queue = "queue",
    done = "done",
    chosen = "chosen",
    successor = "successor",
}

type IControlObject = {
    [key in controls]: Array<number>;
};

export class ShortestPathTaskGenerator {
    private rng: RNG;
    constructor(private options: IShortestPathOptions) {
        this.rng = new RNG(options.seed || Math.random());
    }

    public async generateShortestPathTask() {
        const { nodeRange, degreeRange, hasTarget, seed } = this.options;
        const graph = this.generateStronglyConnectedGraph(this.parseRanges(nodeRange), this.parseRanges(degreeRange), 10);

        const [start, target] = this.furthestNodeByEdgeCount(graph.nodes);

        const dotDescription = this.generateDotDescription(graph, start, target, hasTarget, false);
        /* 
        build initial dot description with pre initialized coordinates from a 10X10 grid to improve the layouting algorithms chance to generate planar layout
        generate layout for the graph to find optimal coordinates to draw graph as planar as possible
        reassign coordinates and distances from the layouted graph
        regenerate dot description for use in the frontend
         */
        const fixedGraph = await this.fixLayout(dotDescription, graph);

        const adjacencyMatrix = generateMatrix(fixedGraph.nodes.length, fixedGraph.nodes.length, 0);
        fixedGraph.edges.forEach((edge) => {
            const [n1, n2] = edge.between;
            const { distance } = edge;
            adjacencyMatrix[n1][n2] = distance;
            adjacencyMatrix[n2][n1] = distance;
        });

        const solution = this.dijkstraStepSolver(fixedGraph.nodes, adjacencyMatrix, start, target, hasTarget);

        const initialRow: IRow = {
            iteration: 0,
            cost: fixedGraph.nodes.map((node) => (node.id === start.id ? 0 : "inf")),
            predecessor: fixedGraph.nodes.map((node) => "-"),
        };

        const controlObject: IControlObject = {
            queue: start.neighbours,
            done: [],
            chosen: [start.id],
            successor: start.neighbours,
        };

        return { ...fixedGraph, initialRow, controlObject, start, target, solution };
    }

    private dijkstraStepSolver(nodes: Array<INode>, adjacencyMatrix: IAdjacencyMatrix, start: INode, target: INode, hasTarget: boolean) {
        const allSteps = [];
        const allShortestPathTrees = [];

        const { distances, visited, predecessors } = nodes.reduce(
            (init, node, i) => {
                init.distances[i] = i === start.id ? 0 : Infinity;
                init.visited[i] = false;
                init.predecessors[i] = null;
                return init;
            },
            { distances: [], visited: [], predecessors: [] }
        );

        const dijkstra = (
            queue: Array<INode>,
            distances: Array<number>,
            visited: Array<boolean>,
            predecessors: Array<number>,
            steps: Array<{ row: IRow; controlObject: IControlObject }> = []
        ) => {
            const shortestPathTree: Array<Array<number>> = [];

            while (queue.length) {
                const current = queue.shift();

                // early stop for finding a shortest path between two nodes
                if (hasTarget && current.id === target.id) {
                    let previous = nodes[predecessors[current.id]];
                    shortestPathTree.push([current.id]);
                    while (previous) {
                        shortestPathTree[0].push(previous.id);
                        previous = nodes[predecessors[previous.id]];
                    }
                    return { steps, shortestPathTree };
                }

                for (const neighbourId of current.neighbours.filter((neighbourId) => !visited[neighbourId])) {
                    const length = distances[current.id] + adjacencyMatrix[current.id][neighbourId];
                    if (length < distances[neighbourId]) {
                        distances[neighbourId] = length;
                        predecessors[neighbourId] = current.id;
                    }

                    // TODO -> implement as priority-queue
                    if (!visited[neighbourId]) {
                        queue.push(nodes[neighbourId]);
                        queue = [...new Set(queue)].sort((a, b) => distances[a.id] - distances[b.id]);
                    }
                }

                // persist algorithms steps
                steps.push({
                    row: { iteration: steps.length, cost: distances, predecessor: predecessors },
                    controlObject: {
                        queue: queue.map((node) => node.id),
                        done: visited.map((node, i) => {
                            if (node) return i;
                        }),
                        chosen: [current.id],
                        successor: current.neighbours,
                    },
                });

                visited[current.id] = true;

                // find all possible shortest paths
                // let firstInQueue = queue[0];
                // for (let i = 1; i < queue.length; i++) {
                //     let nextInQueue = queue[i];
                //     if (distances[firstInQueue.id] === distances[nextInQueue.id]) {
                //         const shiftedQueue = dijkstra();
                //     }
                // }
            }

            predecessors.forEach((predecessorId, nodeId) => {
                let previous = predecessorId;
                shortestPathTree[nodeId] = [nodeId];
                while (previous) {
                    shortestPathTree[nodeId].push(previous);
                    previous = predecessors[previous];
                }
            });

            return { steps, shortestPathTree };
        };

        const { steps, shortestPathTree } = dijkstra([start], distances, visited, predecessors, []);

        return { steps, shortestPathTree };
    }

    private furthestNodeByEdgeCount(nodes: Array<INode>): Array<INode> {
        const distanceMatrix = [];
        for (const node of nodes) {
            const visited = nodes.map((_) => false);
            const distances = nodes.map((_) => 0);
            let queue = [node];

            visited[node.id] = true;
            while (queue.length) {
                let current = queue.shift();
                for (let neighbourId of current.neighbours) {
                    if (!visited[neighbourId]) {
                        visited[neighbourId] = true;
                        distances[neighbourId] = distances[current.id] + 1;
                        queue = [...new Set([...queue, nodes[neighbourId]])];
                    }
                }
            }
            distanceMatrix.push(distances);
        }

        let max = 0;
        let longestDistance: Array<INode> = [];
        for (let i = 0; i < distanceMatrix.length; i++) {
            for (let j = 0; j < nodes.length; j++) {
                const current = distanceMatrix[i][j];
                if (current > max) {
                    max = current;
                    longestDistance = [nodes[i], nodes[j]];
                }
            }
        }

        return longestDistance;
    }

    private async fixLayout(dotDescription: string, graph: IGraph) {
        const layout = await graphviz.layout(dotDescription, "dot", "neato");

        const [_, maxX, maxY] = layout.match(/bb="\d,\d,(\d+)\.?\d+,(\d+)\.?\d+"/).map((m, i) => parseInt(m));
        const scaleX = minMaxScaler(0, maxX, 0, 10);
        const scaleY = minMaxScaler(0, maxY, 0, 10);

        const nodeOrder = layout.match(/[^;>]\s+\d+\s+\[/g).map((id) => parseInt(id.split("[")[0].trim()));
        const nodes: Array<INode> = [];
        let i = 0;
        const fixedNodeLayout = layout.replace(/pos="(\d+\.?\d+),(\d+\.?\d+)!?"/g, (stringCoordinates) => {
            const id = nodeOrder[i];
            const coordinates = stringCoordinates
                .substring(5)
                .split(",")
                .map((coordinate, i) => (i ? scaleY(parseInt(coordinate)) : scaleX(parseInt(coordinate))));

            nodes[id] = { ...graph.nodes[id], coordinates };

            const fixedCoordinates = stringCoordinates.replace(/\d+\.?\d+,\d+\.?\d+!?"/, coordinates.join(",") + '!"');
            i++;

            return fixedCoordinates;
        });

        const edges: Array<IEdge> = [];
        const replaceWeightLabelsAndFixEdges = (dotDescription: string) => {
            return dotDescription.replace(/\d+\s\->\s\d+\s\[label=\d+,/g, (matched) => {
                const [_, head, tail] = matched.match(/(\d+)\s\->\s(\d+)/);
                const node1 = nodes[parseInt(head)];
                const node2 = nodes[parseInt(tail)];
                const edge = this.createEdge(node1, node2);
                edges.push(edge);
                return matched.replace(/\d+,/, `${edge.distance},`);
            });
        };
        const fixedDotDescription = replaceWeightLabelsAndFixEdges(fixedNodeLayout);

        return { nodes, edges, dotDescription: fixedDotDescription };
    }

    private parseRanges(range: Array<any>) {
        const intRange = range.map((value) => parseInt(value));
        return this.rng.intBetween(intRange[0], intRange[1]);
    }

    private generateDotDescription(graph: IGraph, start: INode, target: INode, hasTarget: boolean, fixedPosition: boolean) {
        const { nodes, edges } = graph;

        const startId = start.id;
        const targetId = hasTarget ? target.id : -1;

        const nodeString = nodes
            .map(({ id, coordinates }, i) => {
                const [x, y] = coordinates;
                if (i === startId) return `${id} [pos="${x},${y}${fixedPosition ? "!" : ""}", color=red]`;
                if (i === targetId) return `${id} [pos="${x},${y}${fixedPosition ? "!" : ""}", color=blue]`;
                return `${id} [pos="${x},${y}${fixedPosition ? "!" : ""}"]`;
            })
            .join(" ");

        const edgeString = edges
            .map(({ between, distance }) => {
                const [id1, id2] = between;
                return `${id1} -> ${id2} [label="${distance}"]`;
            })
            .join(" ");

        //node ---->   width=0.05, fixedsize=true
        // layouting issues with neato and overlapping edges https://stackoverflow.com/questions/3967600/how-to-prevent-edges-in-graphviz-to-overlap-each-other
        return `digraph { 
            layout="neato" 
            graph [bgcolor="transparent" overlap=false splines=true sep=1.2]
            node [shape=circle fontsize=15 penwidth=1 style=filled color=grey]
            edge [style=solid fontsize=15 penwidth=1 dir=both]
            ${nodeString}
            ${edgeString}
        }
        `;
    }

    private euclidianDistance(v1: Array<number>, v2: Array<number>) {
        const [x1, y1] = v1;
        const [x2, y2] = v2;
        const distance = Math.round(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)));
        return distance;
    }

    private createEdge(node1: INode, node2: INode) {
        const distance = this.euclidianDistance(node1.coordinates, node2.coordinates);
        const between = [node1.id, node2.id];
        return { distance, between };
    }

    private generateStronglyConnectedGraph(nodeCount: number, targetAvgDegree: number, gridSize: number): IGraph {
        const includesEdge = (currentEdge: Array<number>, edges: Array<IEdge>) => {
            for (let edge of edges) {
                const [id1, id2] = edge.between;
                if (currentEdge.includes(id1) && currentEdge.includes(id2)) return true;
            }
            return false;
        };

        const coordinates = combinations(Array.from(Array(gridSize).keys()));
        const nodeCoordinates = randomSample(coordinates, nodeCount, true, this.rng);

        const nodes: Array<INode> = Array(nodeCount)
            .fill(null)
            .map((n, i) => ({ id: i, coordinates: nodeCoordinates[i], neighbours: [] }));

        const edges: Array<IEdge> = [];

        const constructConnectedComponent = (components: Array<Array<INode>>) => {
            if (components.length < 2) return;

            const newComponents = [];
            const samples = randomSample(components, 2, false, this.rng);

            for (const sample of samples) {
                let [component1, component2] = sample;

                let isRedundantComponent = false;
                if (!component2) {
                    component2 = randomSample(newComponents, 1, true, this.rng)[0];
                    isRedundantComponent = true;
                }

                const [node1] = randomSample(component1, 1, true, this.rng);
                const [node2] = randomSample(component2, 1, true, this.rng);
                const edge = this.createEdge(node1, node2);
                if (!includesEdge([node1.id, node2.id], edges)) edges.push(edge);

                nodes[node1.id].neighbours.push(node2.id);
                nodes[node2.id].neighbours.push(node1.id);

                if (isRedundantComponent) component2 = [];
                newComponents.push([...component1, ...component2]);
            }
            constructConnectedComponent(newComponents);
        };

        constructConnectedComponent(nodes.map((node) => [node]));

        const avgDegree = () => (edges.length / nodes.length) * 2;
        const maxAvgDegree = nodes.length - 1;

        // "fillup" with random edges until target average degree reached or maximum average degree reached (n-1)
        while (avgDegree() < targetAvgDegree && avgDegree() < maxAvgDegree) {
            const [node1, node2] = randomSample(nodes, 2, true, this.rng);

            if (!includesEdge([node1.id, node2.id], edges)) {
                edges.push(this.createEdge(node1, node2));
                nodes[node1.id].neighbours.push(node2.id);
                nodes[node2.id].neighbours.push(node1.id);
            }
        }

        return { nodes, edges };
    }
}

// (async () => {
//     const gen = new ShortestPathTaskGenerator({ nodeRange: [5, 10], degreeRange: [1, 2], hasTarget: true, seed: 157239 });
//     const task = await gen.generateShortestPathTask();

//     console.log(task.solution);
//     console.log(task.dotDescription);
//     // console.dir(task.nodes, { depth: null });
// })();
