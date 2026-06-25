import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        ignores: ["node_modules/**", "out/**"],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                suite: "readonly",
                test: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            "no-const-assign": "warn",
            "no-this-before-super": "warn",
            "no-unreachable": "warn",
            "constructor-super": "warn",
            "valid-typeof": "warn",
            "@typescript-eslint/no-unused-vars": "warn",
        },
    },
];
