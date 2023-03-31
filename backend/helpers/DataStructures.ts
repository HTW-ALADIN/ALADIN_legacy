class PriorityQueue {
    private heap: [];
    constructor(private comparator = (a: number, b: number): boolean => a > b) {}

    length() {
        return this.heap.length;
    }

    isEmpty() {
        return this.length() === 0;
    }
}

export const generateMatrix = (nRow: number, nCol: number, init: number) =>
    Array(nRow)
        .fill(0)
        .map((row) => Array(nCol).fill(init));
