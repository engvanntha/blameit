import * as assert from "node:assert";
import { parseBlamePorcelain } from "../src/git";

suite("git parser", () => {
    test("extracts one author per blamed line", () => {
        const output = [
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 1 1 1",
            "author Alice",
            "summary Add first line",
            "\tconst a = 1;",
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb 2 2 1",
            "author Bob",
            "summary Add second line",
            "\tconst b = 2;",
        ].join("\n");

        assert.deepStrictEqual(parseBlamePorcelain(output), [
            {
                author: "Alice",
                commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                lineNumber: 1,
                summary: "Add first line",
            },
            {
                author: "Bob",
                commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                lineNumber: 2,
                summary: "Add second line",
            },
        ]);
    });
});
