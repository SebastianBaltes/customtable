import { defineConfig } from "@playwright/test";

// Overridable so the suite can run on a machine where 5173 is taken by another
// project's dev server (reuseExistingServer would otherwise hand the tests over
// to that foreign server).
const port = Number(process.env.PW_PORT ?? 5173);

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    cwd: ".",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
  ],
});
