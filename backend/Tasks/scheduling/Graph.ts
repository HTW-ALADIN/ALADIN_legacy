import { Vertex, Edge, Graph, VertexParameters, EdgeParameters, GraphParameters } from "../../genericGraphs/Graph";
import { Constructor, mapAttributesToDot } from "../../genericGraphs/Utility";

//  * PS -> processStep/name
//  * D -> duration
//  * TB -> total buffer
//  * FB -> free buffer
//  * EST -> earliest start time
//  * EET -> earliest end time
//  * LST -> latest start time
//  * LET -> latest end time

export interface PlanVertexParameters extends VertexParameters {
    d: number;
}
export class PlanVertex extends Vertex {
    private letters = "abcdefghijklmnopqrstuvwxyz".toUpperCase().split("");
    private ps: string;
    private d: number;
    private tb: number;
    private fb: number;
    private est: number;
    private eet: number;
    private lst: number;
    private let: number;

    constructor(args: PlanVertexParameters) {
        super(args);
        this.ps = this.letters[this.id];
        this.d = args.d;
    }

    public getProperty(property: keyof PlanVertex): any {
        return this[property];
    }
    public setProperty(property: keyof PlanVertex, value: any) {
        this[property] = value;
    }
    public getChilds(): { [id: number]: PlanVertex } {
        return this.childs as { [id: number]: PlanVertex };
    }
    public getParents(): { [id: number]: PlanVertex } {
        return this.parents as { [id: number]: PlanVertex };
    }
    public serialize() {
        const serializedVertex = super.serialize();
        return {
            ...serializedVertex,
            ps: this.ps,
            d: this.d,
            tb: this.tb,
            fb: this.fb,
            est: this.est,
            eet: this.eet,
            lst: this.lst,
            let: this.let,
        };
    }

    /**
     * EST  ________________ EET
     *      | PS |         |
     *      | D  | TB | FB |
     * LST  ________________ LET
     */
    public dotVertex(style: VertexParameters["style"] = null, dummy: boolean = false): string {
        const tableStart = '<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="3">';
        const tableEnd = "</TABLE>>";
        const rowStart = "<TR>";
        const field = (
            colspan: number = 1,
            invisible: boolean = true,
            value: string = "",
            inPort: boolean = false,
            outPort: boolean = false,
            id: string = ""
        ) => {
            const border = invisible ? 0 : 1;
            const port = inPort ? "in" : outPort ? "out" : "";
            return `<TD COLSPAN="${colspan}" BORDER="${border}" PORT="${port}" ID="${id}" href="javascript:;"> ${value} </TD>`;
        };
        const rowEnd = "</TR>";
        const label = [
            tableStart,
            rowStart,
            field(1, true, dummy ? "FAZ" : this.est.toString(), false, false, "est"),
            // field(),
            field(3),
            field(1, true, dummy ? "FEZ" : this.eet.toString(), false, false, "eet"),
            // field(),
            rowEnd,
            rowStart,
            field(),
            field(1, false, this.ps.toString(), true, false, "ps"), // inPort
            field(2, false, "", false, true), // outPort
            rowEnd,
            rowStart,
            field(),
            field(1, false, this.d.toString(), true, false, "d"),
            field(1, false, dummy ? "GP" : this.tb.toString(), false, false, "tb"),
            field(1, false, dummy ? "FP" : this.fb.toString(), false, false, "fb"),
            rowEnd,
            rowStart,
            field(1, true, dummy ? "SAZ" : this.lst.toString(), false, false, "lst"),
            // field(),
            field(3),
            // field(),
            field(1, true, dummy ? "SEZ" : this.let.toString(), false, false, "let"),
            rowEnd,
            tableEnd,
        ].join("\n");

        return `${this.id} [ id="${this.id}" label=${label} tooltip="${this.ps}"]`;
        // `struct${this.id} [ id="${this.id}" label="{ ${this.processStep} | D } |{  | { TB | FB } }" tooltip="${this.id}"]`;
    }
}

export class PlanEdge extends Edge {
    private forward: number;
    private backward: number;
    private isDummyActivity: boolean = false;

    public setForward(weight: number) {
        this.forward = weight;
    }
    public getForward() {
        return this.forward;
    }
    public setBackward(weight: number) {
        this.backward = weight;
    }
    public getBackward() {
        return this.backward;
    }

    public dotEdge(style: EdgeParameters["style"] = null) {
        style = style || this.style;
        if (this.isDummyActivity) style = { ...style, style: "dotted" };
        const edgeAttributes = mapAttributesToDot(style);
        const parentId = Object.values(this.parentVertices)[0].getId();
        const childId = Object.values(this.childVertices)[0].getId();
        return `${this.shape} ${parentId}:out -> ${childId}:in [${edgeAttributes}]`;
    }
}

interface PlanGraphParameters extends GraphParameters {}
export class PlanGraph extends Graph<PlanVertex, PlanEdge> {
    constructor(
        args: PlanGraphParameters,
        vertexConstructor: Constructor<PlanVertex> = PlanVertex,
        edgeConstructor: Constructor<PlanEdge> = PlanEdge
    ) {
        super(args, vertexConstructor, edgeConstructor);
    }

    public serialize() {
        const serializedGraph = super.serialize();
        const vertices = Object.values(this.vertices).map((vertex) => vertex.serialize());
        return { ...serializedGraph, nodes: vertices };
    }

    public dotGraph(dummy: boolean = false) {
        const graphAttributes = mapAttributesToDot(this.style.graph);
        const vertexAttributes = mapAttributesToDot(this.style.vertex);
        const edgeAttributes = mapAttributesToDot(this.style.edge);
        const graphStyle = `graph [bgcolor="transparent" ${graphAttributes}]`;
        const vertexStyle = `node [${vertexAttributes}] `;
        const edgeStyle = `edge [dir="${this.edgeDirection}" ${edgeAttributes}] `;
        const vertexString = Object.values(this.vertices)
            .map((vertex) => vertex.dotVertex(null, dummy))
            .join("\n");
        const edgeString = Object.values(this.edges)
            .map((edge) => edge.dotEdge())
            .join("\n");

        return `${this.type} {
            ${graphStyle}
            ${vertexStyle}
            ${vertexString}
            ${edgeStyle}
            ${edgeString}
        }`;
    }
}
