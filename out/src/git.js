"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.blame = blame;
exports.parseBlamePorcelain = parseBlamePorcelain;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
async function blame(file, start, end) {
    const stdout = await runGitBlame(file, start, end);
    return parseBlamePorcelain(stdout);
}
function runGitBlame(file, start, end) {
    return new Promise((resolve, reject) => {
        const cwd = path.dirname(file);
        const args = [
            "blame",
            "--line-porcelain",
            `-L${start},${end}`,
            "--",
            file,
        ];
        (0, child_process_1.execFile)("git", args, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr.trim() || error.message));
                return;
            }
            resolve(stdout);
        });
    });
}
function parseBlamePorcelain(output) {
    const results = [];
    const lines = output.split(/\r?\n/);
    let currentAuthor = "Unknown";
    let currentCommit = "";
    let currentLineNumber = 0;
    let currentSummary = "";
    for (const line of lines) {
        if (/^[0-9a-f^]{40}\s+\d+\s+\d+\s+\d+/.test(line)) {
            const [commit, , finalLine] = line.trim().split(/\s+/);
            currentCommit = commit;
            currentLineNumber = Number(finalLine);
            currentAuthor = "Unknown";
            currentSummary = "";
            continue;
        }
        if (line.startsWith("author ")) {
            currentAuthor = line.slice("author ".length).trim() || "Unknown";
            continue;
        }
        if (line.startsWith("summary ")) {
            currentSummary = line.slice("summary ".length).trim();
            continue;
        }
        if (line.startsWith("\t")) {
            results.push({
                author: currentAuthor,
                commit: currentCommit,
                lineNumber: currentLineNumber,
                summary: currentSummary,
            });
        }
    }
    return results;
}
//# sourceMappingURL=git.js.map