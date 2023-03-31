import { TaskGenerator } from "../../genericGraphs/TaskGenerator";
import { PlanGraph, PlanVertex } from "./Graph";
import { Constructor } from "../../genericGraphs/Utility";
import { PlanGraphGenerator, PlanConfig } from "./GraphGenerator";

const TABLECOLUMNS = ["Vorgang", "Dauer", "Vorgänger"];

interface TerminationTuple {
    parent: PlanVertex;
    child: PlanVertex;
}
export class SchedulingTaskGenerator extends TaskGenerator<PlanGraph, PlanConfig> {
    constructor(
        graphConstructor: Constructor<PlanGraph> = PlanGraph,
        generatorConstructor: Constructor<PlanGraphGenerator> = PlanGraphGenerator
    ) {
        super(graphConstructor, generatorConstructor);
    }

    public generateTask(config: PlanConfig) {
        config["type"] = "digraph";
        config["edgeDirection"] = "forward";
        config.style = { graph: { rankdir: "LR", splines: "polyline" }, vertex: { shape: "plaintext" }, edge: {} };
        super.generateTask(config);

        const graphGenerator = new this.graphGeneratorConstructor(this.rng);
        this.graph = graphGenerator.generateGraph(this.graphConstructor, config);

        const vertices = Object.values(this.graph.getVertices());
        this.forwardTermination(vertices);
        this.backwardTermination(vertices);
        this.eliminateTriangles(vertices[0]);
        const criticalPath = this.findCriticalPath(vertices[0]);
        const table = this.generateTable(vertices);
        const gantt = this.generateGanttMatrix(vertices);

        const dotGraph = this.graph.dotGraph();
        const dummyGraph = this.graph.dotGraph(true);
        const dotEdges = Object.values(this.graph.getEdges()).map((edge) => edge.dotEdge({}));
        const dotVertexGraph = dummyGraph.replace(dotEdges.join("\n"), "");
        const serializedGraph = this.graph.serialize();

        return { dotDescription: dotGraph, graph: serializedGraph, table, criticalPath, dotVertexGraph, gantt, dummyGraph };
    }

    private generateTable(vertices: Array<PlanVertex>) {
        return vertices.map((vertex) => ({
            [TABLECOLUMNS[0]]: vertex.getProperty("ps" as keyof PlanVertex),
            [TABLECOLUMNS[1]]: vertex.getProperty("d" as keyof PlanVertex),
            [TABLECOLUMNS[2]]: Object.values(vertex.getParents())
                .map((vertex) => vertex.getProperty("ps" as keyof PlanVertex))
                .join(" "),
        }));
    }

    private generateGanttMatrix(vertices: Array<PlanVertex>) {
        const maxTime = vertices[vertices.length - 1].getProperty("let" as keyof PlanVertex);
        return vertices.reduce(
            (gantt, vertex) => {
                const EST = vertex.getProperty("est" as keyof PlanVertex);
                const D = vertex.getProperty("d" as keyof PlanVertex);
                const row = Array(maxTime).fill(0);
                row.splice(EST, D, ...Array(D).fill(1));
                gantt.matrix.push(row);
                gantt.events.push(vertex.getProperty("ps" as keyof PlanVertex));
                return gantt;
            },
            { matrix: [], events: [], maxTime }
        );
    }

    private forwardTermination(vertices: Array<PlanVertex>) {
        let queue: Array<TerminationTuple> = [{ parent: null, child: vertices[0] }];
        let EST = 0;
        while (queue.length) {
            const { parent, child } = queue.shift();
            const currentEST = child.getProperty("est" as keyof PlanVertex);

            if (parent) EST = parent.getProperty("eet" as keyof PlanVertex);
            if (!currentEST || currentEST < EST) {
                child.setProperty("est" as keyof PlanVertex, EST);
                const duration = child.getProperty("d" as keyof PlanVertex) as number;
                const EET = EST + duration;
                child.setProperty("eet" as keyof PlanVertex, EET);
            }

            const nextRank = Object.values(child.getChilds()).map((newChild) => ({ parent: child, child: newChild }));
            queue = [...queue, ...nextRank];
        }
    }

    private backwardTermination(vertices: Array<PlanVertex>) {
        const revertedVertices = [...vertices].reverse();
        const parent = revertedVertices[0];
        let queue: Array<TerminationTuple> = [{ parent, child: null }];
        let LET = parent.getProperty("eet" as keyof PlanVertex);
        while (queue.length) {
            const { child, parent } = queue.shift();
            const currentLET = parent.getProperty("let" as keyof PlanVertex);

            if (child) LET = child.getProperty("lst" as keyof PlanVertex);

            if (!currentLET || currentLET > LET) {
                parent.setProperty("let" as keyof PlanVertex, LET);
                const duration = parent.getProperty("d" as keyof PlanVertex) as number;
                const LST = LET - duration;
                parent.setProperty("lst" as keyof PlanVertex, LST);
                this.setBufferTimes(parent, child);
            }

            const previousRank = Object.values(parent.getParents()).map((newParent) => ({ parent: newParent, child: parent }));
            queue = [...queue, ...previousRank];
        }
    }

    private setBufferTimes(current: PlanVertex, child: PlanVertex) {
        const EST = current.getProperty("est" as keyof PlanVertex);
        const LST = current.getProperty("lst" as keyof PlanVertex);
        current.setProperty("tb" as keyof PlanVertex, LST - EST);

        const EET = current.getProperty("eet" as keyof PlanVertex);
        const childEST = child ? child.getProperty("est" as keyof PlanVertex) : current.getProperty("eet" as keyof PlanVertex);
        const currentFB = current.getProperty("fb" as keyof PlanVertex);
        const FB = childEST - EET;
        if (!currentFB || currentFB > FB) current.setProperty("fb" as keyof PlanVertex, FB);
    }

    private findCriticalPath(root: PlanVertex) {
        let queue: Array<PlanVertex> = [root];

        const criticalPath = [root.getId()];
        while (queue.length) {
            const current = queue.shift();
            const [nextCriticalVertex] = this.getCriticalVertex(current);
            if (nextCriticalVertex) {
                queue.push(nextCriticalVertex);
                criticalPath.push(nextCriticalVertex.getId());
            }
        }
        return criticalPath;
    }

    private isCriticalVertex(vertex: PlanVertex) {
        const TB = vertex.getProperty("tb" as keyof PlanVertex);
        const FB = vertex.getProperty("fb" as keyof PlanVertex);

        return TB === 0 && FB === 0;
    }

    private getCriticalVertex(vertex: PlanVertex) {
        return Object.values(vertex.getChilds()).filter((child) => this.isCriticalVertex(child));
    }

    private eliminateTriangles(root: PlanVertex) {
        let queue: Array<PlanVertex> = [root];

        while (queue.length) {
            const current = queue.shift();
            const childs = Object.values(current.getChilds());

            if (childs.length > 1) {
                childs.forEach((child) => {
                    const seperatePaths = childs.filter((c) => c.getId() !== child.getId());
                    this.eliminateTriangle(current, child, seperatePaths);
                });
            }

            queue = [...queue, ...childs];
        }
    }

    private eliminateTriangle(originator: PlanVertex, goal: PlanVertex, seperatePaths: Array<PlanVertex>) {
        const goalId = goal.getId();
        const originatorId = originator.getId();
        let queue = [...seperatePaths];

        while (queue.length) {
            const current = queue.shift();

            if (current.getId() === goalId) {
                const edgeId = `${originatorId}__${goalId}`;
                this.graph.removeEdge(edgeId);
            }

            const childs = Object.values(current.getChilds());
            queue = [...queue, ...childs];
        }
    }
}
