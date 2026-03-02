import { wrapCode } from "../src/utils/code-runner";
import * as fs from "fs";

const p = { entryPoint: "exist" };
const userCode = `class Solution:
    def exist(self, board: list[list[str]], word: str) -> bool:
        pass`;
        
const wrapped = wrapCode(userCode, "python", p.entryPoint, "matrix");
fs.writeFileSync("/tmp/sim.py", wrapped.code);
console.log("Wrote /tmp/sim.py");
