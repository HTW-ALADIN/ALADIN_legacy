import RandExp from "randexp";
import { RNG, randomSample } from "../helpers/NumberGenerators";

function* randomStringFromRegExp(regExp: RegExp) {
    const memo = new Set();
    while (true) {
        let uniqueInstances = memo.size;
        let regExpInstance;
        do {
            regExpInstance = new RandExp(regExp);
            uniqueInstances = memo.size;
            memo.add(regExpInstance);
        } while (uniqueInstances === memo.size);

        yield regExpInstance.gen();
    }
}

interface IDotProperties {
    style?: string;
    color?: string;
    label?: string;
}
interface IVertexDotProperties extends IDotProperties {
    tooltip?: string;
    shape?: string;
    labelloc?: string;
}
interface IEdgeDotProperties extends IDotProperties {
    dir?: string;
    edgetooltip?: string;
    labeltooltip?: string;
    arrowhead?: string;
    arrowtail?: string;
    weight?: string;
}
interface IGraphDotProperties extends IDotProperties {
    levels?: string;
    scale?: string;
    bgcolor?: string;
    rotate?: string;
}

interface IVertexProperties {
    dotProperties?: IVertexDotProperties;
    [key: string]: any;
}
interface IEdgeProperties {
    dotProperties?: IEdgeDotProperties;
    [key: string]: any;
}
interface IGraphProperties {
    dotProperties?: IGraphDotProperties;
    [key: string]: any;
}

interface IProperties {
    [key: string]: any;
}

class Vertex {
    static counter = 0;
    private id: number;

    constructor() {
        this.id = Vertex.counter++;
    }

    public getProperty(property: string): any {
        const attribute = property as keyof Vertex;
        if (Reflect.has(this, attribute)) {
            const value = this[attribute];
            Reflect.defineProperty(this, attribute, { value });
            return value;
        }
        return undefined;
    }

    public dotDescription(): string {
        const label = this.getProperty("label");
        const identifier = label ? label : this.id;
        const dotProperties = this.getProperty("dotProperties") || {};
        const dotPropertiesString =
            " [" +
            Object.entries(dotProperties)
                .map(([key, value]) => `${key}="${value}"`)
                .join(", ") +
            "]";
        return `${identifier}${dotPropertiesString}`;
    }
}
type VertexConstructor = typeof Vertex;

type VertexTuple = [Vertex, Vertex] | [Vertex, Vertex, Vertex];
type EdgeConstructor = typeof Edge;
class Edge {
    constructor(protected vertices: VertexTuple) {}

    public getProperty(property: string): any {
        const attribute = property as keyof Edge;
        if (Reflect.has(this, attribute)) {
            const value = this[attribute];
            Reflect.defineProperty(this, attribute, { value });
            return value;
        }
        return undefined;
    }

    public dotDescription: () => string;
}

class Graph {
    private isCyclic: boolean = undefined;
    private isWeighted: boolean = undefined;
    private isDirected: boolean = undefined;

    protected vertices: { [id: number]: Vertex } = {};
    protected edges: Set<Edge> = new Set();

    constructor(protected verticeConstructor: VertexConstructor, protected edgeConstructor: EdgeConstructor) {}

    public addVertex() {
        const vertex = new this.verticeConstructor();
        const id = vertex.getProperty("id");
        this.vertices[id] = vertex;
    }

    public removeVertex(id: number) {
        delete this.vertices[id];
    }

    public getVertex(id: number) {
        return this.vertices[id];
    }

    public getVertices() {
        return Object(this.vertices).values();
    }

    public addEdge(vertices: VertexTuple) {
        this.edges.add(new this.edgeConstructor(vertices));
    }

    public dotDescription: () => string;

    public adjacencyList: () => Array<number>;

    public adjacencyMatrix: () => Array<Array<number>>;

    public getProperty(property: string): any {
        const attribute = property as keyof Graph;
        if (Reflect.has(this, attribute)) {
            const value = this[attribute];
            Reflect.defineProperty(this, attribute, { value });
            return value;
        }
        return undefined;
    }
}

const getPropertyAccessor = (value: any, type: string) => {
    const propertyAccesssMethods: { [key: string]: Function } = {
        value: (value: any) => {
            return () => {
                return value;
            };
        },
        pattern: (pattern: any) => {
            const RegExpGenerator = randomStringFromRegExp(pattern);
            return () => RegExpGenerator.next().value;
        },
    };

    return propertyAccesssMethods[type](value);
};

type Constructor<T = {}> = new (...args: Array<any>) => T;
const classFactory = <T extends Constructor, IPropertyProxy>(baseClass: T, properties: IPropertyProxy): T => {
    return <T>class extends baseClass {
        constructor(...args: Array<any>) {
            super(...arguments);
            for (let [name, property] of Object.entries(properties)) {
                const { type, value } = property;
                const get = getPropertyAccessor(value, type);
                const descriptor: PropertyDescriptor = { enumerable: true, configurable: true, get };
                Reflect.defineProperty(this, name, descriptor);
            }
        }
    };
};

interface IPropertyProxy {
    [propertyName: string]: {
        type: "pattern" | "value";
        value: any;
    };
}

const vertexProxy: IPropertyProxy = {
    value: {
        value: /\d{1,3},\d{0,4}/,
        type: "pattern",
    },
    name: {
        value: /(Ereignis|Funktion|XOR)/,
        type: "pattern",
    },
    dotProperties: {
        value: {
            shape: "Diamond",
            label: "Ereignis",
            color: "red",
        },
        type: "value",
    },
};

const edgeProxy: IPropertyProxy = {
    weight: { value: /\d{1,3}/, type: "value" },
};

const graphProxy: IPropertyProxy = {
    isDirected: {
        value: true,
        type: "value",
    },
    isWeighted: {
        value: true,
        type: "value",
    },
};

const generateGraph = (verticeAmount: number, edgeAmount: number): Graph => {
    const rng = new RNG();
    const DecoratedVertex = classFactory(Vertex, vertexProxy);
    const DecoratedEdge = classFactory(Edge, edgeProxy);
    const DecoratedGraph = classFactory(Graph, graphProxy);

    const graph = new DecoratedGraph(DecoratedVertex, DecoratedEdge);
    for (let i = 0; i < verticeAmount; i++) {
        graph.addVertex();
    }

    for (let i = 0; i < edgeAmount; i++) {
        const [parentIndex, childIndex] = randomSample([...Array(verticeAmount).keys()] as Array<number>, 2, true);
        const parent = graph.getVertex(parentIndex);
        const child = graph.getVertex(childIndex);
        graph.addEdge([parent, child]);
    }
    return graph;
};

const graph = generateGraph(10, 15);

console.dir(graph, { depth: null });
// console.log(JSON.stringify(graph, null, 2));

interface IVertexProperties extends VertexProperties {}

class VertexProperties {
    private id: number;
    private label: string;

    constructor() {}

    public getProperty(property: string) {}

    // public getProperty(property: string): any {
    //     const attribute = property as keyof Vertex;
    //     if (Reflect.has(this, attribute)) {
    //         const value = this[attribute];
    //         Reflect.defineProperty(this, attribute, { value });
    //         return value;
    //     }
    //     return undefined;
    // }
}
