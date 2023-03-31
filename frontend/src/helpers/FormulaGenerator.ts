const mathlex = window.MathLex;

const syntaxTree = mathlex.parse("z = sum(v_i/w_i^p,i)/sum(1/w_i^p ,i)");

console.log(syntaxTree);

export { mathlex };
