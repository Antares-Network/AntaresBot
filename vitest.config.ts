import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // First run downloads a MongoDB binary for the integration tests.
    hookTimeout: 180_000,
    testTimeout: 20_000,
    // Integration tests share one in-memory MongoDB and module-level buffers.
    fileParallelism: false,
  },
});
