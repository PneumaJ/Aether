// WebdriverIO 8 cannot load a .ts config inside a "type": "module" package
// (ts-node emits CJS but the loader treats .ts as ESM). Use a .cjs config.
const config = {
  runner: "local",
  hostname: "127.0.0.1",
  port: 4444,
  path: "/",
  specs: ["./e2e/specs/**/*.spec.ts"],
  // drag.spec.ts is excluded from the default run: dnd-kit reorder proved
  // unstable under WebDriver (drag never starts reliably). The scenario is
  // covered by tests/manual-checklist.md; the spec is kept for future work.
  exclude: ["./e2e/specs/drag.spec.ts"],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        // 相对仓库根目录解析，保证换机器/换目录可移植
        application: require("node:path").join(__dirname, "../src-tauri/target/debug/aether.exe"),
      },
    },
  ],
  logLevel: "info",
  outputDir: "e2e/.logs",
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
  reporters: ["spec"],
  autoCompileOpts: {
    tsNodeOpts: {
      project: "./e2e/tsconfig.json",
    },
  },
};

module.exports = { config };
