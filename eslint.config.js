import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // docker/mongo-init runs inside mongosh, not Node.
  { ignores: ["dist/", "node_modules/", "coverage/", "docker/"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
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
    files: ["src/lib/db/models.ts", "tests/**/*.ts"],
    rules: { "@typescript-eslint/no-unsafe-class-instance-assignment": "off" },
  },
  {
    files: ["*.config.js", "*.config.ts"],
    ...tseslint.configs.disableTypeChecked,
  },
);
