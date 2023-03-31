// Algebraic Operations
const algebraicOperations = {
    multiply: (b: string, a: string = "") => `${a} * ${b}`,
    divide: (b: string, a: string = "") => `${a} / ${b}`,
    add: (b: string, a: string = "") => `${a} + ${b}`,
    subtract: (b: string, a: string = "") => `${a} - ${b}`,
    power: (b: string, a: string = "") => `${a} ^ ${b}`,
};

// Linear Algebra
// Matrix Operations
const matrixOperations = {
    invert: (a: string = "") => `${a}^^-1`,
};

interface IMaximaOperations {
    [key: string]: Function;
}

export const MaximaOperations: IMaximaOperations = { ...matrixOperations, ...algebraicOperations };
