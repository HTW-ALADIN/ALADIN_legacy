import { Vertex, Edge, Graph, VertexParameters, EdgeParameters, GraphParameters } from "../../genericGraphs/Graph";
import { GraphGenerator } from "../../genericGraphs/GraphGeneration";
import { TaskConfig, TaskGenerator } from "../../genericGraphs/TaskGenerator";
import { Constructor } from "../../genericGraphs/Utility";
import { randomSample, RNG } from "../../helpers/NumberGenerators";

enum Gate {
    XOR = "XOR",
    OR = "OR",
    AND = "AND",
}

enum InformationObject {
    Document = "Document",
    Database = "Database",
}

enum OrganisationUnit {
    Role = "Role",
    Person = "Person",
}

enum ProcessUnit {
    Event = "Event",
    Function = "Function",
}

type EPKVertexType = keyof typeof Gate | keyof typeof InformationObject | keyof typeof OrganisationUnit | keyof typeof ProcessUnit;
type EPKVertexShape = "rectangle" | "hexagon" | "ellipse" | "circle";

interface EPKVertexParameters extends VertexParameters {
    type: EPKVertexType;
    shape: EPKVertexShape;
    nodeStyle?: "rounded" | "";
}
class EPKVertex extends Vertex {
    private type: EPKVertexType;
    private openGate: boolean = null;
    private nodeStyle: "rounded" | "";
    private rank: number;
    private value: string = "";

    constructor(args: EPKVertexParameters) {
        super(args);
        const { type, nodeStyle } = args;
        this.type = type;
        this.nodeStyle = nodeStyle || "";
        this.value = type;
    }

    public dotVertex(): string {
        return `${this.id} [ shape="${this.shape}" style="${this.style}" label="${this.value}" tooltip="${this.type}"]`;
    }
    public setRank(rank: number): void {
        this.rank = rank;
    }
    public getRank(): number {
        return this.rank;
    }
    public getType(): EPKVertexType {
        return this.type;
    }
    public isOpenGate() {
        return this.openGate;
    }
    public setOpenGate(isOpen: boolean) {
        this.openGate = isOpen;
    }
}

interface EPKEdgeParameters extends EdgeParameters {}
class EPKEdge extends Edge {
    constructor(args: EPKEdgeParameters) {
        super(args);
    }
}

interface EPKGraphParameters extends GraphParameters {}
class EPKGraph extends Graph<EPKVertex, EPKEdge> {
    private topology: Array<Array<EPKVertex>> = [];
    constructor(
        args: EPKGraphParameters,
        vertexConstructor: Constructor<EPKVertex> = EPKVertex,
        edgeConstructor: Constructor<EPKEdge> = EPKEdge
    ) {
        super(args, vertexConstructor, edgeConstructor);
    }

    public setInTopology(vertex: EPKVertex) {
        const rank = vertex.getRank();
        if (Object.keys(this.topology).includes(rank.toString())) this.topology[vertex.getRank()].push(vertex);
        else this.topology[rank] = [vertex];
    }
    public removeInTopology(vertex: EPKVertex) {
        this.topology[vertex.getRank()].filter((v) => v != vertex);
    }
    public getTopology() {
        return this.topology;
    }

    public dotGraph() {
        const topologyString = this.topology
            .map((rank) => {
                const idString = rank.map((vertex) => vertex.getId()).join(", ");
                return `{ rank=same; ${idString} }`;
            })
            .join("\n");
        const dotString = super.dotGraph();

        return dotString.substr(0, dotString.length - 1) + topologyString + "}";
    }
}

interface EPKMetaInformation {
    paths: Array<{
        path: Array<EPKVertex>;
        openGates: Array<EPKVertex>;
    }>;
}

interface Tail {
    possibleSuccessors: Array<EPKVertexType>;
    leaf: EPKVertex;
    openGates: Array<EPKVertex>;
    path: Array<EPKVertex>;
}

enum Trend {
    Converging = "Converging",
    Constant = "Constant",
    Diverging = "Diverging",
}

export interface EPKConfig extends TaskConfig {
    rootVertices: number;
    maxDepth: number;
    trendRange: Array<number>;
}
export class EPKGenerator extends GraphGenerator<EPKGraph, EPKConfig> {
    private vertexTypes: { [key in EPKVertexType]: EPKVertexParameters } = {
        [ProcessUnit.Event]: { type: ProcessUnit.Event, shape: "hexagon" },
        [ProcessUnit.Function]: { type: ProcessUnit.Function, shape: "rectangle", nodeStyle: "rounded" },
        [Gate.AND]: { type: Gate.AND, shape: "circle" },
        [Gate.OR]: { type: Gate.OR, shape: "circle" },
        [Gate.XOR]: { type: Gate.XOR, shape: "circle" },
        [OrganisationUnit.Person]: { type: OrganisationUnit.Person, shape: "ellipse" },
        [OrganisationUnit.Role]: { type: OrganisationUnit.Role, shape: "ellipse" },
        [InformationObject.Document]: { type: InformationObject.Document, shape: "rectangle" },
        [InformationObject.Database]: { type: InformationObject.Database, shape: "rectangle" },
    };

    public generateGraph(graphConstructor: Constructor<EPKGraph>, config: EPKConfig) {
        const graph = super.generateGraph(graphConstructor, config);

        const { rootVertices, maxDepth } = config;

        let meta = this.initializePaths(graph, rootVertices);

        // generate current rank vertices based upon meta information of previous paths
        for (let rank = 0; rank < maxDepth - 2; rank++) {
            meta = this.createRank(graph, meta, rank + 1);
        }
        // this.createEndingScenarios(graph, meta);

        return graph;
    }

    private initializePaths(graph: EPKGraph, verticeAmount: number): EPKMetaInformation {
        return Array(verticeAmount)
            .fill(null)
            .reduce(
                (meta) => {
                    const vertex = graph.createVertex(this.vertexTypes[ProcessUnit.Event]);
                    vertex.setRank(0);
                    graph.setInTopology(vertex);
                    meta.paths.push({ path: [vertex], openGates: [] });
                    meta.avgOutDegree = 1;
                    return meta;
                },
                { paths: [] }
            );
    }

    private getPriorTails(meta: EPKMetaInformation) {
        const { paths } = meta;
        return paths.map((metaPath) => {
            const { path, openGates } = metaPath;
            const currentLeaf = path[path.length - 1];
            const possibleSuccessorsByType = this.possibleSuccessorsByType(currentLeaf);
            return { possibleSuccessors: possibleSuccessorsByType, leaf: currentLeaf, openGates, path };
        });
    }

    private createRank(graph: EPKGraph, meta: EPKMetaInformation, rank: number) {
        const priorTails = this.getPriorTails(meta);
        const { singles, tuples, isEnding } = this.createScenarios(priorTails, rank);

        const newMeta: EPKMetaInformation = {
            paths: [],
        };
        for (let singleScenario of singles) {
            const { isLoop, types, tail } = singleScenario;
            for (let vertexType of types) {
                const { openGates, leaf } = tail;
                const vertex = this.graph.createVertex(this.vertexTypes[vertexType]);
                vertex.setRank(rank);
                graph.setInTopology(vertex);
                const newGates = openGates;
                if (Object.keys(Gate).includes(vertexType)) {
                    newGates.push(vertex);
                    vertex.setOpenGate(true);
                }
                newMeta.paths.push({ path: [...tail.path, vertex], openGates: newGates });

                graph.createEdge({ parentVertices: { [leaf.getId()]: leaf }, childVertices: { [vertex.getId()]: vertex } });

                if (vertexType === ProcessUnit.Function) {
                    const infoObjects = this.createInfoObjects();
                    for (let infoObject of infoObjects) {
                        const infoVertex = this.graph.createVertex(this.vertexTypes[infoObject.type]);
                        vertex.setRank(rank), graph.setInTopology(vertex);

                        graph.createEdge({
                            parentVertices: { [infoVertex.getId()]: infoVertex },
                            childVertices: { [vertex.getId()]: vertex },
                        });
                    }
                }
            }
        }

        for (let tupleScenario of tuples) {
            const { type, tuple } = tupleScenario;
            const vertex = this.graph.createVertex(this.vertexTypes[type]);
            vertex.setRank(rank);
            graph.setInTopology(vertex);
            let newGates = tuple[0].openGates;
            if (Object.keys(Gate).includes(type)) {
                newGates = newGates.filter((gate) => gate.getType() !== type);
                vertex.setOpenGate(true);
            }
            for (let tail of tuple) {
                const { leaf } = tail;
                graph.createEdge({ parentVertices: { [leaf.getId()]: leaf }, childVertices: { [vertex.getId()]: vertex } });
            }

            newMeta.paths.push({ path: [vertex], openGates: newGates });
        }

        return newMeta;
    }

    private createInfoObjects() {
        const infoObjects = [];
        if (this.rng.floatBetween(0, 1) > 0.8) {
            infoObjects.push({ type: InformationObject.Database });
        }
        if (this.rng.floatBetween(0, 1) > 0.8) {
            infoObjects.push({ type: OrganisationUnit.Person });
        }
        return infoObjects;
    }

    private possibleSuccessorsByType(predecessor: EPKVertex) {
        const sucessorMap: { [key in EPKVertexType]: Array<EPKVertexType> } = {
            [ProcessUnit.Event]: [Gate.AND, ProcessUnit.Function],
            [ProcessUnit.Function]: [Gate.AND, Gate.OR, Gate.XOR, ProcessUnit.Event],
            [Gate.AND]: [ProcessUnit.Function, ProcessUnit.Event, Gate.OR, Gate.XOR, Gate.AND],
            [Gate.OR]: [ProcessUnit.Function, ProcessUnit.Event, Gate.OR, Gate.XOR, Gate.AND],
            [Gate.XOR]: [ProcessUnit.Function, ProcessUnit.Event, Gate.OR, Gate.XOR, Gate.AND],
            [OrganisationUnit.Person]: [ProcessUnit.Function],
            [OrganisationUnit.Role]: [ProcessUnit.Function],
            [InformationObject.Document]: [ProcessUnit.Function],
            [InformationObject.Database]: [ProcessUnit.Function],
        };
        const predecessorType = predecessor.getType();
        let possibleSuccessors = sucessorMap[predecessorType];
        if (Object.keys(Gate).includes(predecessorType)) {
            const complementaryType = this.findTypeBeforeGate(predecessor);
            possibleSuccessors = possibleSuccessors.filter((type) => type !== complementaryType);
        }
        return possibleSuccessors;
    }

    private findTypeBeforeGate(gate: EPKVertex): EPKVertexType {
        const grandSuccessor = Object.values(gate.getParents())[0] as EPKVertex;
        const type = grandSuccessor.getType();
        if (Object.keys(Gate).includes(type)) return this.findTypeBeforeGate(grandSuccessor);
        return type;
    }

    private createScenarios(priorTails: Array<Tail>, currentRank: number) {
        // currently creating rank n-2
        if (this.config.maxDepth - currentRank < 2) {
            // return this.createEndingScenarios();
        }

        const { singleTails, tuples } = this.createConvergingScenarios(priorTails);
        const singleTailsScenarios = this.createSingleTailScenarios(singleTails);

        return { singles: singleTailsScenarios, tuples, isEnding: false };
    }

    private createEndingScenarios(graph: EPKGraph, meta: EPKMetaInformation) {
        const priorTails = this.getPriorTails(meta);
        for (let tail of priorTails) {
            const { leaf, possibleSuccessors, openGates, path } = tail;
            const leafType = leaf.getType();
            const isGate = this.isGate(leaf);

            if (isGate) {
                const priorProcessType = this.findTypeBeforeGate(leaf);
            }
        }
        return { isEnding: true };
    }

    private isGate(vertex: EPKVertex) {
        return Object.keys(Gate).includes(vertex.getType());
    }

    private createConvergingScenarios(priorTails: Array<Tail>) {
        const scenarios: { tuples: Array<{ type: Gate; tuple: Array<Tail> }>; singleTails: Array<Tail> } = {
            tuples: [],
            singleTails: priorTails,
        };
        const rankTrend = this.setTrend();

        if (rankTrend === Trend.Converging && priorTails.length > 1) {
            const { rest, tuples } = this.splitElligibleTuples(priorTails);
            scenarios.tuples = tuples.map((tuple) => {
                const inferredClosingGateType = this.inferClosingGateType(tuple);
                return { type: inferredClosingGateType, tuple };
            });
            scenarios.singleTails = rest;
        }

        return scenarios;
    }

    /**
     * creates scenarios for non converging tails
     * scenarios entail:
     * - "closing" loop with pending opening
     * - opening Gate
     * - assign n Vertices after Gate
     * - Constant Process.Unit toggle
     * @param priorTails
     */
    private createSingleTailScenarios(priorTails: Array<Tail>) {
        const successors = priorTails.map((tail) => {
            const { leaf, possibleSuccessors } = tail;
            const isGate = Object.keys(Gate).includes(leaf.getType());
            const isXOR = leaf.getType() === Gate.XOR;
            const isOpenGate = leaf.isOpenGate();
            const trendRange = isXOR ? [0.9, 1] : this.config.trendRange;
            const limit = this.config.trendRange[1];
            let tailTrend = this.setTrend(trendRange, limit);

            let isLoop = false;
            let types: Array<EPKVertexType> = [];
            // create Loop
            if (isXOR && tailTrend === Trend.Constant) {
                isLoop = true;
                types = [Gate.XOR];
                // create branches after Gate
            } else if (isGate && isOpenGate) {
                const width = this.rng.intBetween(2, this.config.maxDepth * 0.4);

                for (let i = 0; i < width; i++) {
                    tailTrend = this.setTrend([0.02, 1], 1);
                    const urn =
                        tailTrend === Trend.Diverging
                            ? possibleSuccessors.filter((successor) => Object.keys(Gate).includes(successor))
                            : possibleSuccessors.filter((successor) => !Object.keys(Gate).includes(successor));
                    types.push(...randomSample(urn, 1, true, this.rng));
                }
                // handle Constant if predecessor is no Gate
            } else if ((!isGate && tailTrend === Trend.Constant) || (!isOpenGate && tailTrend === Trend.Constant)) {
                types = possibleSuccessors.filter((successor) => !Object.keys(Gate).includes(successor));
                // handle Diverging if predecessor is no Gate
            } else {
                types = randomSample(
                    possibleSuccessors.filter((successor) => Object.keys(Gate).includes(successor)),
                    1,
                    true,
                    this.rng
                );
            }

            const isTrailing = this.rng.floatBetween(0, 1);
            if (isTrailing > 0.9 && priorTails.length > 1) {
                return { types: [], tail, isLoop: false };
            }
            return { types, tail, isLoop };
        });

        return successors;
    }

    /**
     * Builds valid tuples to form a closing gate connection from prior tails
     * and splits remaining tails.
     *
     * Does not infer type of closing gate!
     */
    private splitElligibleTuples(tails: Array<Tail>) {
        let { eventTails, functionTails } = this.filterByPriorType(tails);
        const result: { tuples: Array<Array<Tail>>; rest: Array<Tail> } = { tuples: [], rest: tails };
        const selectBase = () => {
            let base: Array<Tail> = [];
            let choseEvents = false;
            if (eventTails.length > 1 && functionTails.length > 1) {
                choseEvents = this.rng.coinFlip();
                base = choseEvents ? eventTails : functionTails;
            } else if (eventTails.length > 1) {
                choseEvents = true;
                base = eventTails;
            } else if (functionTails.length > 1) {
                choseEvents = false;
                base = functionTails;
            }
            return { base, choseEvents };
        };
        let { base, choseEvents } = selectBase();

        while (this.rng.coinFlip() && base.length) {
            const tupleSize = this.rng.intBetween(2, base.length);
            const tuple = randomSample(tails, tupleSize, true, this.rng);
            const parametrizedFilterCallback = (selectedTails: Array<Tail>) => (tail: Tail) =>
                !selectedTails.map((selectedTail) => selectedTail.leaf.getId()).includes(tail.leaf.getId());
            if (choseEvents) eventTails = eventTails.filter(parametrizedFilterCallback(tuple));
            else functionTails = functionTails.filter(parametrizedFilterCallback(tuple));
            ({ base, choseEvents } = selectBase());
            result.tuples.push(tuple);
            result.rest = [...eventTails, ...functionTails];
        }
        return result;
    }

    /**
     * infers closing gate type according to previously opened and not closed gates of all subPaths
     * @param tuple
     */
    private inferClosingGateType(tuple: Array<Tail>) {
        let gateType = Gate.OR;

        const ANDRules = () => {
            const exclusivity = allGates.filter((gates) => gates.length).every((gates) => gates.includes(Gate.AND));
            if (exclusivity) {
                return true;
            }
        };
        const XORRules = () => {
            const exclusivity = allGates.filter((gates) => gates.length).every((gates) => gates.includes(Gate.XOR));
            if (exclusivity) return true;
        };

        const allGates = tuple.map((tail) => tail.openGates.map((gate) => gate.getType()));
        if (ANDRules()) gateType = Gate.AND;
        if (XORRules()) gateType = Gate.XOR;

        return gateType;
    }

    private setTrend(trendRange: Array<number> = null, limit: number = null): Trend {
        const [divergingThreshold, constantThreshold, convergingThreshold] = trendRange || this.config.trendRange;
        const rand = this.rng.floatBetween(0, limit || 1);

        if (rand <= divergingThreshold) return Trend.Diverging;
        else if (rand <= constantThreshold) return Trend.Constant;
        else return Trend.Converging;
    }

    private filterByPriorType(tails: Array<Tail>) {
        const typeMap: { [key in ProcessUnit]: Array<Tail> } = {
            [ProcessUnit.Event]: [],
            [ProcessUnit.Function]: [],
        };

        for (let tail of tails) {
            let type = tail.leaf.getType() as ProcessUnit;
            if (Object.keys(Gate).includes(type)) type = this.findTypeBeforeGate(tail.leaf) as ProcessUnit;
            typeMap[type].push(tail);
        }
        return { functionTails: typeMap[ProcessUnit.Function], eventTails: typeMap[ProcessUnit.Event] };
    }
}

export class EPKTaskGenerator extends TaskGenerator<EPKGraph, EPKConfig> {
    constructor(graphConstructor: Constructor<EPKGraph> = EPKGraph, epkGeneratorConstructor: Constructor<EPKGenerator> = EPKGenerator) {
        super(graphConstructor, epkGeneratorConstructor);
    }

    public generateTask(config: EPKConfig) {
        config["type"] = "digraph";
        config["edgeDirection"] = "forward";
        const [min, max] = config["trendRange"];
        config["trendRange"] = [min, max - min, max];
        super.generateTask(config);

        const graphGenerator = new this.graphGeneratorConstructor(this.rng);
        const graph = graphGenerator.generateGraph(this.graphConstructor, config);

        const dotGraph = graph.dotGraph();

        return { dotDescription: dotGraph };
    }
}

// const gen = new EPKTaskGenerator();
// const task = gen.generateTask({
//     rootVertices: 2,
//     maxDepth: 10,
//     trendRange: [0.2, 0.8, 1],
//     type: "digraph",
//     edgeDirection: "forward",
//     seed: "321",
// });

// console.dir(task.graph.dotGraph());
// console.dir(task.graph.getEdges(), { depth: null });
