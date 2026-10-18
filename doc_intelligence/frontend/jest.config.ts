const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",

  // IMPORTANT: this runs BEFORE test files load
  setupFiles: ["<rootDir>/jest.setup.ts"],

  // This runs AFTER test environment is ready
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  testPathIgnorePatterns: ["<rootDir>/tests/"],
};

module.exports = createJestConfig(customJestConfig);