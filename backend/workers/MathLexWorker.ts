if (typeof window === "undefined") {
    global.window = {} as Window & typeof globalThis;
}

interface Window {
    panzoom: any;
    delayed_methods: any;
    MathLex: any;
    MathJax: any;
}

const mathlex = require("./mathlex.js");

const abstractSyntaxTree = window.MathLex.parse("z < sum(v_i/w_i^p,i,0,n)/sum(1/w_i^p ,i)");
const rendered = window.MathLex.render(abstractSyntaxTree, "latex");

// z = sum(v_i,i)/sum(w_i^p ,i)

// z = \frac{\sum_{i} \frac{v\_i}{w\_i}}{\sum_{i} \frac{1}{w\_i^{p}}}

// z=frac(sum_(i)frac(v_i)(w_i^p))(sum_(i)frac(1)(w_i^p))

console.dir(abstractSyntaxTree, { depth: null });
console.log(rendered);

const variableTable: { [key: string]: any } = {
    v: [1, 2, 3],
    w: [10, 20, 30],
    p: 2,
};

const findVariables = (subtree: IParsedTree, variables: Array<string> = []) => {
    const [keys, values] = Object.entries(subtree);
    if (keys.includes("type") && values.includes("variable")) variables.push(subtree.name);
    for (const value in values) {
        const nestedTree = (value as unknown) as IParsedTree;
        findVariables(nestedTree, variables);
    }
};

const fractionHandler = () => {};
const functionHandler = (functionType: string, subtree: IParsedTree, parsedTree: IParsedTree) => {
    const variables: Array<string> = [];
    findVariables(subtree, variables);
    if (!variables.length) throw new Error(`"${functionType}" requires valid variables to loop over!`);

    const length = variableTable[variables[0]].length - 1;

    const operationTable: { [key: string]: string } = {
        sum: "+",
        product: "*",
    };

    const operation = operationTable[functionType];

    const fannedSubTree = {};
    for (let i = 0; i < length; i++) {
        Object.entries(subtree).reduce((node, [key, value]) => {
            return node;
        }, {} as IParsedTree);
    }
};

interface IExpressionHandler {
    [key: string]: Function;
}

const expressionHandler: IExpressionHandler = {
    Equal: fractionHandler,
    NotEqual: fractionHandler,
    Less: fractionHandler,
    LessEqual: fractionHandler,
    Greater: fractionHandler,
    GreaterEqual: fractionHandler,
    Function: (() => {
        // TODO in setup function inject VariableTable into functionHandler
        return functionHandler;
    })(),
};

type AbstractSyntaxTree = [string, AbstractSyntaxTree, AbstractSyntaxTree];

interface IVariableTable {
    [key: string]: number | Array<Object>;
}

interface IParsedTree {
    [key: string]: IParsedTree | any;
}

const ASTParser = (
    abstractSyntaxTree: AbstractSyntaxTree,
    variableTable: IVariableTable,
    parsedTree: IParsedTree = { leftTerm: "", comparisonOperator: "", rightTerm: "" }
): IParsedTree => {
    let [operation, operand1, operand2] = abstractSyntaxTree;

    if (typeof operand1 === "string") {
        if (operation === "Literal") return { type: "scalar", value: operand2 };
        if (operand1 === "sum" || "product") return operand1;
        return { type: "variable", name: operand1, value: variableTable[operand1] };
    }

    if (operation === "Function") operand2 = (operand2[0] as unknown) as AbstractSyntaxTree;

    const leftSubtree = ASTParser(operand1, variableTable, {});
    const rightSubtree = ASTParser(operand2, variableTable, {});

    return expressionHandler[operation](leftSubtree, rightSubtree, parsedTree);
};

const equation = {
    leftTerm: "",
    comparisonOperator: "",
    righTerm: "",
};
