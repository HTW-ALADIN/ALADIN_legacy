const randomDAG = (x, n) => {
    const length = (n * (n - 1)) / 2;

    const dag = new Array(length).fill(1);

    for (let i = 0; i < length; i++) {
        if (Math.random() < x) continue;
        dag[i] = 0;
        if (!isConnected(n, dag)) dag[i] = 1;
    }

    return dag;
};

const dagIndex = (n, i, j) => n * i + j - ((i + 1) * (i + 2)) / 2;

const isConnected = (n, dag) => {
    const reached = new Array(n).fill(false);

    reached[0] = true;

    const queue = [0];

    while (queue.length > 0) {
        const x = queue.shift();

        for (let i = 0; i < n; i++) {
            if (i === n || reached[i]) continue;
            const j = i < x ? dagIndex(n, i, x) : dagIndex(n, x, i);
            if (dag[j] === 0) continue;
            reached[i] = true;
            queue.push(i);
        }
    }

    return reached.every((x) => x); // return true if every vertex was reached
};

const dagToDot = (n, dag) => {
    let dot = "digraph {\n";

    for (let i = 0; i < n; i++) {
        dot += `    ${i};\n`;

        for (let j = i + 1; j < n; j++) {
            const k = dagIndex(n, i, j);
            if (dag[k]) dot += `    ${i} -> ${j};\n`;
        }
    }

    return dot + "}";
};

const dagToAdjacencyMatrix = (n, dag) => {
    let adjacencyMatrix = Array(n)
        .fill(null)
        .map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const k = dagIndex(n, i, j);

            if (dag[k]) adjacencyMatrix[j][i] = 1;
        }
    }
    return adjacencyMatrix;
};

const randomDot = (x, n) => dagToDot(n, randomDAG(x, n));
const adj = (x, n) => dagToAdjacencyMatrix(n, randomDAG(x, n));
console.log(randomDot(0.2, 10));
