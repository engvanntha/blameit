import { execFile } from "child_process";
import * as path from "path";

export interface BlameLine {
    author: string;
    commit: string;
    lineNumber: number;
    summary: string;
}

export async function blame(file: string, start: number, end: number): Promise<BlameLine[]> {
    const stdout = await runGitBlame(file, start, end);
    return parseBlamePorcelain(stdout);
}

function runGitBlame(file: string, start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const cwd = path.dirname(file);
        const args = [
            "blame",
            "--line-porcelain",
            `-L${start},${end}`,
            "--",
            file,
        ];

        execFile("git", args, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr.trim() || error.message));
                return;
            }

            resolve(stdout);
        });
    });
}

export function parseBlamePorcelain(output: string): BlameLine[] {
    const results: BlameLine[] = [];
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
