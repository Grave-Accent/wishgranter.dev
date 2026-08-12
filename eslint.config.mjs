// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import markdownlint from "eslint-plugin-markdownlint";
import markdownlintParser from "eslint-plugin-markdownlint/parser.js";
import eslintPluginYml from 'eslint-plugin-yml';

export default defineConfig([
    {
        files: ["**/*.{ts}","**/.*.{ts}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
    },
    {
        files: ["**/*.md"],
        plugins: { markdownlint },
        languageOptions: { parser: markdownlintParser },
        rules: {
            ...markdownlint.configs.recommended.rules,
            "markdownlint/md013": "off",
            "markdownlint/md033": "off",
            "markdownlint/md056": "off",
            "markdownlint/md055": "off",
            "markdownlint/md060": "off"
        },
    }
]);
