const NoiseGenerator = require("simplex-noise");
import { RNG, randomSample } from "../../helpers/NumberGenerators";

const generateNoise = (gridX: number, gridY: number, scale: number, seed: number): Array<Array<number>> => {
    const noiseGenerator = new NoiseGenerator(seed);

    const noiseGrid = [];
    for (let x = 0; x < gridX; x++) {
        noiseGrid[x] = [];
        for (let y = 0; y < gridY; y++) {
            const noise = (noiseGenerator.noise3D(x / 16, y / 16, 0 / 16) * 0.5 + 0.5) * scale;
            noiseGrid[x][y] = noise;
        }
    }
    return noiseGrid;
};

interface IGeoInterpolationOptions {
    scale: number;
    gridRange: Array<number>;
    measurementRange: Array<number>;
    seed?: number;
}

interface IMeasurementPoint {
    id: number;
    value: number;
    x: number;
    y: number;
    distance?: number;
}

interface IGeoInterpolationGraph {
    measurementPoints: Array<IMeasurementPoint>;
    unknownPoint: IMeasurementPoint;
}

export class InterpolationTaskGenerator {
    private rng: RNG;
    constructor(private options: IGeoInterpolationOptions) {
        this.rng = new RNG(options.seed || Math.random());
    }

    public generateInterpolationTask() {
        const { gridRange, measurementRange, seed } = this.options;
        const scale = 1;

        const grid = this.generateNoiseGrid(scale, gridRange, seed);
        const graph = this.generateGraph(grid, measurementRange);
        const dotDescription = this.generateDotDescription(graph);
        const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => v * scale);

        const p = 2;

        const { distances, values } = graph.measurementPoints.reduce(
            (filtered, point) => {
                filtered.distances.push(point.distance);
                filtered.values.push(point.value);
                return filtered;
            },
            { distances: [], values: [] }
        );

        const result = () => {
            const nominator = distances.reduce((result, distance, i) => result + values[i] / (distance ^ p), 0);
            const denominator = distances.reduce((result, distance) => result + 1 / (distance ^ p), 0);
            return nominator / denominator;
        };

        return { grid, thresholds, ...graph, dotDescription, p, distances, values, n: distances.length, result: result() };
    }

    private generateNoiseGrid(scale: number, gridRange: Array<number>, seed: number = Math.random()) {
        const [gridMin, gridMax] = gridRange;
        const gridSize = this.rng.intBetween(gridMin, gridMax);
        return generateNoise(gridSize, gridSize, scale, seed);
    }

    private generateGraph(grid: Array<Array<number>>, measurementRange: Array<number>): IGeoInterpolationGraph {
        const [measurementMin, measurementMax] = measurementRange;
        const measurementCount = this.rng.intBetween(measurementMin, measurementMax);

        const [x] = randomSample(grid.keys(), 1, true, this.rng);
        const [y] = randomSample(grid[x].keys(), 1, true, this.rng);
        const unknownPoint: IMeasurementPoint = { id: 0, x, y, value: grid[x][y] };

        const columnIndices = randomSample(grid.keys(), measurementCount, true, this.rng);
        const measurementPoints: Array<IMeasurementPoint> = columnIndices.map((columnIndex, i) => {
            const [rowIndex] = randomSample(grid[columnIndex].keys(), 1, true, this.rng);
            return {
                id: i + 1,
                value: parseFloat(grid[columnIndex][rowIndex].toFixed(2)),
                x: columnIndex,
                y: rowIndex,
                distance: this.euclidianDistance([unknownPoint.x, unknownPoint.y], [columnIndex, rowIndex]),
            };
        });

        return { unknownPoint, measurementPoints };
    }

    private euclidianDistance(v1: Array<number>, v2: Array<number>) {
        const [x1, y1] = v1;
        const [x2, y2] = v2;
        const distance = parseFloat(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)).toFixed(2));
        return distance;
    }

    private generateDotDescription(graph: IGeoInterpolationGraph) {
        const { unknownPoint, measurementPoints } = graph;

        const nodeString = [unknownPoint, ...measurementPoints]
            .map(({ id, value, x, y }, i) =>
                i ? `${id} [pos="${x},${y}!", tooltip="${value}"]` : `${id} [pos="${x},${y}!", color=blue tooltip="${value}"]`
            )
            .join(" ");

        const edgeString = measurementPoints.map(({ id, distance }) => `${unknownPoint.id} -- ${id} [label="${distance}"]`).join(" ");

        //node ---->   width=0.05, fixedsize=true
        return `graph { 
            layout="neato" 
            graph [bgcolor="transparent"]
            node [shape=circle labelloc=b fontsize=50 penwidth=5]
            edge [style=dashed fontsize=50 penwidth=5]
            ${nodeString}
            ${edgeString}
        }
        `;
    }
}

// (() => {
//     const g = new InterpolationTaskGenerator({ scale: 1, gridRange: [50, 50], measurementRange: [5, 10] });
//     const task = g.generateInterpolationTask();
//     console.dir(task, { depth: null });
// })();
