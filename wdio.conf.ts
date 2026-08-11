import { lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

const dataDirectoryPrefix = "human-controller-e2e-";
const e2eDataDirectory = mkdtempSync(join(tmpdir(), dataDirectoryPrefix));
const binaryName = process.platform === "win32" ? "human-controller.exe" : "human-controller";

// The Tauri process inherits this variable. The E2E-only backend path override prevents tests
// from reading or writing a developer's real application database.
process.env.HUMAN_CONTROLLER_E2E_DATA_DIR = e2eDataDirectory;

function removeE2eDataDirectory() {
  const resolvedDirectory = realpathSync(e2eDataDirectory);
  const resolvedTempDirectory = realpathSync(tmpdir());
  const isExpectedDirectory =
    dirname(resolvedDirectory) === resolvedTempDirectory &&
    basename(resolvedDirectory).startsWith(dataDirectoryPrefix) &&
    !lstatSync(resolvedDirectory).isSymbolicLink();

  if (!isExpectedDirectory) {
    throw new Error(`Refusing to remove unexpected E2E data directory: ${resolvedDirectory}`);
  }

  rmSync(resolvedDirectory, { recursive: true });
}

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./e2e/specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: [{ browserName: "tauri" }],
  services: [
    [
      "@wdio/tauri-service",
      {
        appBinaryPath: join("src-tauri", "target", "debug", binaryName),
        captureBackendLogs: true,
        captureFrontendLogs: true,
        driverProvider: "embedded",
        embeddedPort: 4445,
        startTimeout: 60_000,
      },
    ],
  ],
  framework: "mocha",
  reporters: ["spec"],
  logLevel: "warn",
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  mochaOpts: {
    timeout: 60_000,
  },
  onComplete() {
    removeE2eDataDirectory();
  },
};
