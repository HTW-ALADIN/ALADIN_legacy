import { PlanGraph, PlanVertex } from "./Graph";
import { GraphGenerator } from "../../genericGraphs/GraphGeneration";
import { Constructor, flatten } from "../../genericGraphs/Utility";
import { TaskConfig } from "../../genericGraphs/TaskGenerator";
import { randomSample } from "../../helpers/NumberGenerators";
import { ensureType } from "../../helpers/helperFunctions";

export interface PlanConfig extends TaskConfig {
    nodeAmount: number;
    durationRange: [number, number];
}

export class PlanGraphGenerator extends GraphGenerator<PlanGraph, PlanConfig> {
    public generateGraph(graphConstructor: Constructor<PlanGraph>, config: PlanConfig) {
        PlanVertex.resetCounter();
        config.type = "digraph";
        const graph = super.generateGraph(graphConstructor, config);

        const nodeAmount = ensureType("int", config.nodeAmount);
        const durationRange = config.durationRange.map((value) => ensureType("int", value)) as PlanConfig["durationRange"];

        const vertices = this.generateVertices(nodeAmount, durationRange);
        const ranks = this.generateRanks(vertices);
        this.generateEdges(ranks, nodeAmount);

        return graph;
    }

    private generateVertices(n: number, durationRange: PlanConfig["durationRange"]) {
        return Array(n)
            .fill(null)
            .map((_, i) => {
                const duration = this.rng.intBetween(...durationRange);
                return this.graph.createVertex({ d: duration });
            });
    }

    private generateRanks(vertices: Array<PlanVertex>) {
        const startVertex = vertices.shift();
        const endVertex = vertices.pop();

        let rankDistribution = Array(vertices.length).fill(0);
        for (let i = 0; i < vertices.length; i++) {
            const index = this.rng.intBetween(0, vertices.length - 1);
            rankDistribution[index]++;
        }
        const ranks = [[startVertex], ...rankDistribution.filter((v) => v).map((rankSize) => vertices.splice(0, rankSize)), [endVertex]];
        return ranks;
    }

    private generateEdges(ranks: Array<Array<PlanVertex>>, nodeAmount: number) {
        ranks.forEach((rank, i) => {
            // handle last vertex
            if (i === ranks.length - 1) {
                Object.values(this.graph.getVertices())
                    .filter((vertex) => !Object.keys(vertex.getParents()).length && vertex.getId() !== 0)
                    .forEach((vertex) => this.graph.createEdge({ parentVertices: [vertex], childVertices: rank }));
            } else {
                // handle all other vertices
                rank.forEach((vertex) => {
                    // prohibit root and leaf node edge
                    const forwardRankIndex = !i ? ranks.length - 2 : ranks.length + 1;
                    this.generateForwardEdges(vertex, ranks.slice(i + 1, forwardRankIndex));
                    // do only if not rootNode and no edges to any previous ranks are present
                    if (i && !Object.keys(vertex.getParents()).length) {
                        this.generateBackwardEdge(vertex, ranks[i - 1]);
                    }
                });
            }
        });
    }

    private generateForwardEdges(vertex: PlanVertex, followingRanks: Array<Array<PlanVertex>>) {
        const followingVertices = flatten(followingRanks, Infinity);
        const max = Math.min(1, followingVertices.length);
        const outwardEdges = this.rng.intBetween(1, max);
        randomSample(followingVertices, outwardEdges, true, this.rng).forEach((sampledVertex) =>
            this.graph.createEdge({ parentVertices: [vertex], childVertices: [sampledVertex] })
        );
    }

    private generateBackwardEdge(vertex: PlanVertex, previousRank: Array<PlanVertex>) {
        const previousVertices = flatten(previousRank, Infinity);
        randomSample(previousVertices, 1, true, this.rng).forEach((sampledVertex) =>
            this.graph.createEdge({ parentVertices: [sampledVertex], childVertices: [vertex] })
        );
    }
}
