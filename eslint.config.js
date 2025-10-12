import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ["custom_components/**", "dist/**", "node_modules/**"],
  },
  ...compat.config({
    env: {
      browser: true,
      es2022: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: ["./tsconfig.json"],
      tsconfigRootDir: __dirname,
      sourceType: "module",
    },
    plugins: ["@typescript-eslint"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier",
    ],
    overrides: [
      {
        files: ["*.ts", "*.tsx"],
        rules: {
          "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
          "@typescript-eslint/no-unused-vars": [
            "error",
            {
              args: "after-used",
              argsIgnorePattern: "^_",
              varsIgnorePattern: "^_",
              caughtErrors: "none",
              caughtErrorsIgnorePattern: "^_",
            },
          ],
          "@typescript-eslint/ban-ts-comment": "off",
          "no-empty": ["error", { allowEmptyCatch: true }],
          "no-useless-escape": "off",
        },
      },
      {
        files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
        rules: {
          "@typescript-eslint/consistent-type-imports": "off",
          "@typescript-eslint/no-floating-promises": "off",
          "@typescript-eslint/no-misused-promises": "off",
        },
      },
    ],
  }),
];
