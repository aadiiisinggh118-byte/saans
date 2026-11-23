import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  // Pure logic and API routes run in node; component tests opt into jsdom
  // with a `@jest-environment jsdom` docblock.
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  coverageProvider: "v8",
  collectCoverageFrom: [
    "lib/**/*.js",
    "services/**/*.js",
    "server/**/*.js",
    "ai/**/*.js",
    "components/**/*.{js,jsx}",
    "app/**/*.{js,jsx}",
  ],
};

export default createJestConfig(config);
