import * as fs from "node:fs/promises";
import * as path from "node:path";
import Mocha from "mocha";

async function collectTestFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                return collectTestFiles(fullPath);
            }

            return entry.name.endsWith(".test.js") ? [fullPath] : [];
        }),
    );

    return files.flat().sort();
}

export async function run(): Promise<void> {
    const mocha = new Mocha({
        color: true,
        ui: "tdd",
    });
    const testsRoot = path.resolve(__dirname, "..");
    const testFiles = await collectTestFiles(testsRoot);

    testFiles.forEach((file) => mocha.addFile(file));

    await new Promise<void>((resolve, reject) => {
        mocha.run((failures) => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
                return;
            }

            resolve();
        });
    });
}
