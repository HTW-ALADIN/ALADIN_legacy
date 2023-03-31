import { DAG, INode, IEdge } from "../graphs/BaseGraphs";
import GraphGenerator from "./RandomGenerators";

interface IGozintographNode extends INode {
    isLeaf?: boolean;
    label?: string;
    value?: number;
}

interface IGozintographParameters {
    depth: [number, number];
    weight: [number, number];
    edgeDensity: [number, number];
    width: [number, number];
    value: [number, number];
}

export class GozintographGenerator extends GraphGenerator {
    private graph: DAG;
    private depth: number;
    private edgeDensity: number;
    private weight: [number, number];
    private width: [number, number];
    private value: [number, number];

    constructor(params: IGozintographParameters, seed?: any) {
        const { value, depth, edgeDensity, weight, width } = params;
        super(seed);
        this.value = value;
        this.weight = weight;
        this.width = width;
        this.depth = this.rng.intBetween(...depth);
        this.edgeDensity = this.rng.floatBetween(...edgeDensity);
    }

    public generateGraph() {
        this.graph = new DAG();
        this.graph.topology = this.populateTopology();
        this.createEdges();
        this.graph.paths = this.graph.topology[0].reduce((paths: [], node: INode["id"]) => {
            return [...this.findPaths(node, [], paths)];
        }, []);
        this.assignNodeAttributes();
        this.graph.createAdjacencyMatrix();
        this.graph.createValueVector();
        this.graph.createLabelVector();
        this.graph.dotDescription = this.generateDOTDescription();
        this.graph.longestPath = this.graph.paths.reduce((longestPath, path) => {
            const pathLength = path.length;
            if (pathLength > longestPath) longestPath = pathLength;
            return longestPath;
        }, 0);
        return this.graph;
    }

    private populateTopology() {
        return Array(this.depth)
            .fill(null)
            .map(() =>
                Array(this.rng.intBetween(...this.width))
                    .fill(null)
                    .map(() => this.graph.createNode())
            );
    }

    private createEdges() {
        if (Object.keys(this.graph.nodes).length <= 1) return;
        const bottomUpTopology = this.graph.topology.slice(1).reverse();
        bottomUpTopology.forEach((currentLayer, currentIndex) => {
            currentLayer.forEach((currentID) => {
                let edgeCreated = false;
                const possibleLayers = this.graph.topology.slice(0, this.depth - (currentIndex + 1));
                possibleLayers.forEach((layer) => {
                    layer.forEach((id) => {
                        if (this.rng.floatBetween() < this.edgeDensity) {
                            edgeCreated = true;
                            const weight = this.rng.intBetween(...this.weight);
                            this.graph.createEdge(currentID, id, { weight });
                        }
                    });
                });
                if (!edgeCreated) {
                    const layerIndex = this.rng.intBetween(0, possibleLayers.length - 1);
                    const nodeIndex = this.rng.intBetween(0, possibleLayers[layerIndex].length - 1);
                    const weight = this.rng.intBetween(...this.weight);
                    const id = possibleLayers[layerIndex][nodeIndex];
                    this.graph.createEdge(currentID, id, { weight });
                }
            });
        });

        this.graph.topology[0].forEach((currentID) => {
            let edgeCreated = false;
            for (let i = 0; i < this.graph.edges.length; i++) {
                if (this.graph.edges[i].between[1] === currentID) {
                    edgeCreated = true;
                }
            }
            if (!edgeCreated) {
                const possibleLayers = this.graph.topology.slice(1);
                const layerIndex = this.rng.intBetween(0, possibleLayers.length - 1);
                const nodeIndex = this.rng.intBetween(0, possibleLayers[layerIndex].length - 1);
                const weight = this.rng.intBetween(...this.weight);
                const id = possibleLayers[layerIndex][nodeIndex];
                this.graph.createEdge(id, currentID, { weight });
            }
        });
    }

    private findPaths(node: INode["id"], path: Array<IEdge>, paths: Array<Array<IEdge>>) {
        const edgesToAncestors = this.graph.edges.filter((edge) => edge.between[1] === node);
        if (edgesToAncestors.length) {
            edgesToAncestors.forEach((edge) => {
                let newPath = [...path];
                newPath.push(edge);
                this.findPaths(edge.between[0], newPath, paths);
            });
        } else if (path.length) {
            paths.push(path);
            path = [];
        }
        return paths;
    }

    private searchLeafs() {
        this.graph.topology.forEach((layer, index) => {
            layer.forEach((id) => {
                if (!index) this.graph.nodes[id].isLeaf = false;
                else this.graph.nodes[id].isLeaf = true;
            });
        });
        this.graph.paths.forEach((path) => {
            path.forEach((edge) => {
                const id = edge["between"][1];
                this.graph.nodes[id].isLeaf = false;
            });
        });
    }

    private assignValue() {
        this.graph.topology.forEach((layer, i) =>
            layer.forEach((id) => {
                if (!i) this.graph.nodes[id].value = this.rng.intBetween(1, this.value[1]);
                else this.graph.nodes[id].value = this.rng.intBetween(...this.value);
            })
        );
    }

    private assignLabels() {
        function* statefulCounter() {
            let i = 0;
            while (true) yield i++;
        }
        // P: end-product, B: assembly-group, K: buying-part, R: commodity
        const labels = {
            P: statefulCounter(),
            B: statefulCounter(),
            K: statefulCounter(),
            R: statefulCounter(),
        };
        this.graph.topology.forEach((layer, index) =>
            layer.forEach((id) => {
                if (index === 0) this.graph.nodes[id].label = `P${labels["P"].next().value}`;
                else if (!this.graph.nodes[id].isLeaf) this.graph.nodes[id].label = `B${labels["B"].next().value}`;
                else if (this.rng.floatBetween(0, 1) > 0.5) this.graph.nodes[id].label = `K${labels["K"].next().value}`;
                else this.graph.nodes[id].label = `R${labels["R"].next().value}`;
            })
        );
    }

    private assignNodeAttributes() {
        this.searchLeafs();
        this.assignLabels();
        this.assignValue();
    }

    private generateDOTDescription() {
        const graphType = this.graph.isDirected ? "digraph\n" : "graph\n";
        const graphStyle = 'graph [bgcolor="transparent"]';
        const nodeStyle = `node [shape="circle", style="filled"]\n`;
        const edgeDirection = '\n edge [dir="back"]\n';
        const nodes = this.graph.nodes;
        const nodeString = Object.entries(nodes)
            .map(([id, { label, value }]) => {
                `${label} [tooltip="${value}"]`;
            })
            .join("\n");
        const edgeString = this.graph.edges.reduce((edgeString, edge) => {
            const parentLabel = nodes[edge.between[1]].label;
            const childLabel = nodes[edge.between[0]].label;
            return `${edgeString} ${parentLabel} -> ${childLabel} [label=" ${edge.weight}"]\n`;
        }, "");
        const topologyString = this.graph.topology.reduce((topologyString, layer) => {
            const layerString = layer.map((id) => this.graph.nodes[id].label).join(",");
            return `${topologyString} { rank=same; ${layerString} }\n`;
        }, "");
        return `
            ${graphType} {
            ${graphStyle}
            ${nodeStyle}
            ${nodeString}
            ${edgeDirection}
            ${edgeString}
            ${topologyString}
            }
        `;
    }
}

// const g = new GozintographGenerator({ depth: [1, 2], weight: [10, 50], width: [1, 2], value: [5, 10], edgeDensity: [0.001, 0.4] });

// console.dir(g.generateGraph(), { depth: null });
