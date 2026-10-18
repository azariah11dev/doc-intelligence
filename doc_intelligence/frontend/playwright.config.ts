import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts"],
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  }
});