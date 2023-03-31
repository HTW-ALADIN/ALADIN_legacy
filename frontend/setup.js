const fs = require("fs");

const from = "./node_modules/d3-graphviz/node_modules/@hpcc-js/wasm/dist/";
const to = "./public/js/";
const target = "graphvizlib.wasm";

if (!fs.existsSync(to)) fs.mkdirSync(to);
fs.copyFileSync(from + target, to + target);
