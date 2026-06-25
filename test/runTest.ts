import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "..", "..");
        const extensionTestsPath = path.resolve(__dirname, "suite", "index.js");

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: ["--disable-extensions"],
        });
    } catch (error) {
        console.error("Failed to run extension tests");
        if (error instanceof Error) {
            console.error(error.message);
        }

        process.exit(1);
    }
}

void main();
