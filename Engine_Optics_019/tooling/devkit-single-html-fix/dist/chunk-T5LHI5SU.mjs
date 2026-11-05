#!/usr/bin/env node
import { execFileCommand } from './chunk-S3NGZOPR.mjs';
import { commandError } from './chunk-VNP4GISC.mjs';
import { readdir, mkdir, mkdtemp, readFile, rename, rm } from 'fs/promises';
import { resolve, dirname, basename } from 'path';

async function packageVersion() {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error("sdk-installer-version-missing");
  }
  return manifest.version;
}
async function sdkInstallCommand(options) {
  const root = resolve(options.root);
  let targetExists = true;
  let entries;
  try {
    entries = await readdir(root);
  } catch (cause) {
    if (cause === null || typeof cause !== "object" || !("code" in cause) || cause.code !== "ENOENT") {
      return { ok: false, error: commandError(cause, "sdk-install-failed") };
    }
    targetExists = false;
    entries = [];
  }
  if (entries.length > 0) {
    return {
      ok: false,
      error: {
        code: "sdk-target-not-empty",
        expected: "the SDK install target to be absent or empty",
        hint: "Choose an empty versioned SDK directory so existing files cannot be overwritten.",
        detail: { root }
      }
    };
  }
  const version = options.version ?? await packageVersion();
  const parent = dirname(root);
  await mkdir(parent, { recursive: true });
  let staging;
  let download;
  try {
    staging = await mkdtemp(resolve(parent, `.${basename(root)}.forgeax-sdk-staging-`));
    download = await mkdtemp(resolve(parent, `.${basename(root)}.forgeax-sdk-download-`));
    await execFileCommand(
      process.env.FORGEAX_NPM_CLIENT ?? "npm",
      [
        "install",
        "--prefix",
        download,
        "--ignore-scripts",
        "--no-package-lock",
        "--no-save",
        "--fund=false",
        "--audit=false",
        `@forgeax/engine-sdk@${version}`
      ],
      { env: { ...process.env, CI: "true" }, maxBuffer: 16 * 1024 * 1024 }
    );
    const carrier = resolve(download, "node_modules", "@forgeax", "engine-sdk", "sdk");
    const manifest = JSON.parse(await readFile(resolve(carrier, "sdk-manifest.json"), "utf8"));
    if (manifest.sdkVersion !== version) throw new Error("sdk-carrier-version-mismatch");
    for (const name of await readdir(carrier)) {
      await rename(resolve(carrier, name), resolve(staging, name));
    }
    if (!targetExists) {
      await rename(staging, root);
      staging = void 0;
    } else {
      for (const name of await readdir(staging)) {
        await rename(resolve(staging, name), resolve(root, name));
      }
    }
    return {
      ok: true,
      value: {
        root,
        sdkVersion: version,
        source: "@forgeax/engine-sdk",
        next: { cwd: root, argv: ["node", "./bin/forgeax.mjs", "project", "init"] }
      }
    };
  } catch (cause) {
    return { ok: false, error: commandError(cause, "sdk-install-failed") };
  } finally {
    if (staging !== void 0) await rm(staging, { recursive: true, force: true });
    if (download !== void 0) await rm(download, { recursive: true, force: true });
  }
}

export { sdkInstallCommand };
//# sourceMappingURL=chunk-T5LHI5SU.mjs.map
//# sourceMappingURL=chunk-T5LHI5SU.mjs.map