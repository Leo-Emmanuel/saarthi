import { parseMathDictation } from './CommandParser.js';
import { toLatex } from './MathSerializer.js';

const ast = parseMathDictation("x squared plus 2x minus 3");
console.log(JSON.stringify(ast, null, 2));
console.log("Latex:", toLatex(ast));
