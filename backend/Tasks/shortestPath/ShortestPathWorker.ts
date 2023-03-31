import { RNG, randomSample } from "../../helpers/NumberGenerators";

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
    gridRange: Array<number>;
    nodeRange: Array<number>;
    densityRange: Array<number>;
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
    predecessor: Array<string>;
}

enum controls {
    queue = "queue",
    done = "done",
    chosen = "chosen",
    successor = "successor",
}

type IControlObject = {
    [key in controls]: { label: string; values: Array<number> };
};

export class ShortestPathTaskGenerator {
    private rng: RNG;
    constructor(private options: IShortestPathOptions) {
        this.rng = new RNG(options.seed || Math.random());
    }

    public generateShortestPathTask() {
        const { gridRange, nodeRange, densityRange, seed } = this.options;
        // const grid = this.generateGrid(gridRange);
        const graph = this.generateConnectedGraph(this.parseRanges(nodeRange), this.parseRanges(densityRange), this.parseRanges(gridRange));
        const motherNode = this.findMotherNode(graph);
        const dotDescription = this.generateDotDescription(graph, motherNode);

        const initialRow: IRow = {
            iteration: 0,
            cost: graph.nodes.map((node) => (node.id === motherNode.id ? 0 : "inf")),
            predecessor: graph.nodes.map((node) => "-"),
        };

        const controlObject: IControlObject = {
            queue: { label: "Warteschlange", values: [motherNode.id] },
            done: { label: "Erledigt", values: [] },
            chosen: { label: "Ausgewählt", values: [motherNode.id] },
            successor: { label: "Nachfolger", values: motherNode.neighbours },
        };

        return { ...graph, dotDescription, initialRow, controlObject };
    }

    private parseRanges(range: Array<any>) {
        return range.map((value) => parseInt(value));
    }

    private generateDotDescription(graph: IGraph, motherNode: INode) {
        const { nodes, edges } = graph;

        const motherNodeId = motherNode.id;

        const nodeString = nodes
            .map(({ id, coordinates }, i) => {
                const [x, y] = coordinates;
                return i == motherNodeId ? `${id} [pos="${x},${y}!", color=red]` : `${id} [pos="${x},${y}!"]`;
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
            node [shape=circle fontsize=15 penwidth=2 style=filled color=grey]
            edge [style=solid fontsize=15 penwidth=2 dir=both]
            ${nodeString}
            ${edgeString}
        }
        `;
    }

    private euclidianDistance(v1: Array<number>, v2: Array<number>) {
        const [x1, y1] = v1;
        const [x2, y2] = v2;
        const distance = parseFloat(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)).toFixed(2));
        return distance;
    }

    // based on the Kosaraju algorithm to find strongly connected components --> http://www-sop.inria.fr/teams/marelle/personnel/Laurent.Thery/Kosaraju/Kosaraju.pdf
    private findMotherNode({ nodes, edges }: IGraph) {
        const dfs = (nodes: Array<INode>, currentNode: INode, visited: Array<boolean>): Array<boolean> => {
            visited[currentNode.id] = true;
            for (let neighbourId of currentNode.neighbours) {
                const neighbour = nodes[neighbourId];
                if (!visited[neighbourId]) return dfs(nodes, neighbour, visited);
            }
            return visited;
        };

        let motherNode = null;
        const visited: Array<boolean> = [];
        for (let node of nodes) {
            if (!visited[node.id]) {
                dfs(nodes, node, visited);
                motherNode = node;
            }
        }

        const isMotherNode = dfs(nodes, motherNode, []).every((visitedNode) => visitedNode);
        // is always true, due to the graph being generated from a spanning tree
        return isMotherNode ? motherNode : null;
    }

    private generateConnectedGraph(nodeRange: Array<number>, densityRange: Array<number>, gridRange: Array<number>) {
        const [nodeMin, nodeMax] = nodeRange;
        const nodeCount = this.rng.intBetween(nodeMin, nodeMax);

        const [densityMin, densityMax] = densityRange;
        const density = this.rng.intBetween(densityMin, densityMax);

        const [gridMin, gridMax] = gridRange;
        let gridSize = this.rng.intBetween(gridMin, gridMax);
        if (gridSize < nodeCount) gridSize = nodeCount;

        const coordinates = combinations(Array.from(Array(gridSize).keys()));
        const nodeCoordinates = randomSample(coordinates, nodeCount, true);

        const nodes: Array<INode> = Array(nodeCount)
            .fill(null)
            .map((n, i) => ({ id: i, coordinates: nodeCoordinates[i], neighbours: [] }));
        const nodesCopy = JSON.parse(JSON.stringify(nodes));

        const fetchNode = (nodes: Array<any>, nodeAmount: number = 1) => nodes.splice(this.rng.intBetween(0, nodes.length - 1), nodeAmount);

        const visited = fetchNode(nodesCopy);
        const edges: Array<IEdge> = [];

        // build spanning tree -> http://www.cs.cmu.edu/~15859n/RelatedWork/RandomTrees-Wilson.pdf
        while (nodesCopy.length) {
            let currentNode = visited[visited.length - 1];
            let [neighbourNode] = fetchNode(nodesCopy);

            visited.push(neighbourNode);
            const distance = this.euclidianDistance(currentNode.coordinates, neighbourNode.coordinates);
            const between = [currentNode.id, neighbourNode.id];
            edges.push({ between, distance });

            nodes[currentNode.id].neighbours.push(neighbourNode.id);
        }

        const avgDegree = () => (edges.length / nodes.length) * 2;
        const completeGraphEdgeCount = (nodes.length * (nodes.length - 1)) / 2;

        // "fillup" with random edges until edgeCount reached (or (n*(n-1)) / 2 if edgeCount > number of possible edges in a complete graph)
        let i = 0;
        while (avgDegree() < density && avgDegree() < completeGraphEdgeCount && i < 10) {
            const [node1, node2] = randomSample(nodes, 2, true);

            console.log(node1, node2);

            const includesEdge = (currentEdge: Array<number>, edges: Array<IEdge>) => {
                for (let edge of edges) {
                    const [id1, id2] = edge.between;
                    if (currentEdge.includes(id1) && currentEdge.includes(id2)) return true;
                }
                return false;
            };

            if (!includesEdge([node1.id, node2.id], edges)) {
                const distance = this.euclidianDistance(node1.coordinates, node2.coordinates);
                const between = [node1.id, node2.id];
                edges.push({ between, distance });

                nodes[node1.id].neighbours.push(node2.id);
            }
            i++;
        }

        return { nodes, edges };
    }
}

const gen = new ShortestPathTaskGenerator({ gridRange: [10, 10], nodeRange: [4, 20], densityRange: [5, 10] });
gen.generateShortestPathTask();
