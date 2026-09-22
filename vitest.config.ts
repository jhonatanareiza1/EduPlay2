import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",

        include: [
            "tests/**/*.test.ts",
        ],

        exclude: [
            "**/node_modules/**",
            "**/lib/**",
            "**/.git/**",
        ],

        testTimeout: 10000,

        fileParallelism: false,
        maxWorkers: 1,
        minWorkers: 1,
    },
});