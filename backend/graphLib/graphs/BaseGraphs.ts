function* idGenerator() {
    let i = 0;
    while (true) {
        yield i++;
    }
}

export interface INode {
    id: number;
    value?: string | number;
    label?: string;
    [key: string]: any;
}

export interface INodes {
    [id: string]: INode;
}

export interface IEdge {
    between: [INode["id"], INode["id"]];
    weight?: string | number;
}

export abstract class Graph {
    nodes: INodes = {};
    edges: Array<IEdge> = [];
    dotDescription: string;
    idGenerator: Generator;
    adjacencyMatrix: Array<Array<number>>;
    valueVector: Array<number | string>[];
    labelVector?: Array<string>;

    constructor() {
        this.idGenerator = idGenerator();
    }

    public createNode(attributes?: {}): INode["id"] {
        const id = this.idGenerator.next()["value"];
        this.nodes[id] = { id, ...attributes };
        return id;
    }

    public createEdge(ancestor: INode["id"], descendant: INode["id"], attributes?: {}) {
        this.edges.push({ between: [ancestor, descendant], ...attributes });
    }

    public createAdjacencyMatrix() {
        const nodeAmount = Object.keys(this.nodes).length;
        function initArray(n: number, v: number | [number]) {
            return Array<typeof v>(n).fill(v);
        }
        const adjacencyMatrix: Array<Array<number>> = Array<Array<number>>(nodeAmount)
            .fill([0])
            .map(() => Array<number>(nodeAmount).fill(0));
        this.edges.forEach((edge) => {
            const [from, to] = edge.between;
            if (edge.weight && typeof edge.weight === "number") {
                adjacencyMatrix[from][to] = edge.weight;
            } else {
                adjacencyMatrix[from][to]++;
            }
        });
        this.adjacencyMatrix = adjacencyMatrix;
    }

    public createValueVector() {
        this.valueVector = [Object.entries(this.nodes).map(([id, node]) => node.value)];
    }

    public createLabelVector() {
        this.labelVector = Object.values(this.nodes).map((node) => node.label);
    }

    public serialiseToJson() {}

    public generateDotDescription(): string {
        return "";
    }
}

export class DiGraph extends Graph {
    isDirected: boolean = true;
    paths: Array<Array<IEdge>>;
}

export class MultiGraph extends Graph {}

export class MultiDiGraph extends Graph {}

export class DAG extends DiGraph {
    topology: Array<Array<INode["id"]>>;
    longestPath?: number;
}
