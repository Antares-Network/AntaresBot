import js from "@eslint/js";
import regexp from "eslint-plugin-regexp";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // docker/mongo-init runs inside mongosh, not Node.
  { ignores: ["dist/", "node_modules/", "coverage/", "docker/"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  // Regex correctness, and ReDoS: patterns that can backtrack for a very long time on crafted
  // input. Several regexes run on every chat message, so these are errors, not warnings.
  regexp.configs["flat/recommended"],
  {
    rules: {
      "regexp/no-super-linear-backtracking": "error",
      "regexp/no-super-linear-move": "error",
      "regexp/no-misleading-unicode-character": "error",
      // Purely stylistic rewrites of working patterns: not worth the churn.
      "regexp/prefer-d": "off",
      "regexp/prefer-w": "off",
      "regexp/prefer-range": "off",
      "regexp/use-ignore-case": "off",
      "regexp/negation": "off",
      "regexp/no-useless-non-capturing-group": "off",
      "regexp/no-unused-capturing-group": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Unawaited promises are how the old bot leaked unhandled rejections.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-extraneous-class": "off",
      "no-console": "error",
    },
  },
  {
    // Mongoose's documented schema syntax is plain object literals typed as SchemaTypeOptions
    // (a class). That is how the library is meant to be used, not an unsafe instance forgery.
    files: ["src/lib/db/models/**/*.ts", "tests/**/*.ts"],
    rules: { "@typescript-eslint/no-unsafe-class-instance-assignment": "off" },
  },
  {
    files: ["*.config.js", "*.config.ts", "scripts/**/*.mjs", "fuzz/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Plain Node scripts (not part of the TypeScript project).
    files: ["scripts/**/*.mjs", "fuzz/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly" } },
    rules: { "no-console": "off" },
  },
);
