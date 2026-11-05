#!/usr/bin/env node
import { realpath, readFile } from 'fs/promises';
import { resolve } from 'path';
import { GameProjectSchema } from '@forgeax/engine-project';

function projectError(code, expected, hint, detail) {
  return { ok: false, error: { code, expected, hint, detail } };
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
function isValidStartupTimeoutMs(value) {
  return value === null || typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
}
function timeoutFromPackage(root, packageJson, key = "startupTimeoutMs") {
  const forgeax = packageJson.forgeax;
  const forgeaxConfig = forgeax !== null && typeof forgeax === "object" && !Array.isArray(forgeax) ? forgeax : void 0;
  const timeoutMs = forgeaxConfig?.[key];
  if (timeoutMs !== void 0 && !isValidStartupTimeoutMs(timeoutMs)) {
    return projectError(
      "package-manifest-invalid",
      `package.json#forgeax.${key} to be a positive timer-safe integer or null`,
      `Set a positive millisecond value or null to disable ${key} deadlines.`,
      { root, [key]: timeoutMs }
    );
  }
  return {
    ok: true,
    value: timeoutMs
  };
}
async function readProjectStartupTimeoutMs(rootInput = process.cwd()) {
  const root = resolve(rootInput);
  let packageValue;
  try {
    packageValue = await readJson(resolve(root, "package.json"));
  } catch (cause) {
    if (cause.code === "ENOENT") return { ok: true, value: void 0 };
    return projectError(
      "package-manifest-unreadable",
      "readable package.json",
      "Repair package.json before starting the Engine backend.",
      { root, reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }
  if (packageValue === null || typeof packageValue !== "object" || Array.isArray(packageValue)) {
    return projectError(
      "package-manifest-invalid",
      "package.json to contain an object",
      "Repair package.json before starting the Engine backend.",
      { root }
    );
  }
  return timeoutFromPackage(root, packageValue);
}
async function readProjectFacts(rootInput = process.cwd()) {
  const requestedRoot = resolve(rootInput);
  let root = requestedRoot;
  try {
    root = await realpath(requestedRoot);
  } catch {
  }
  let forgeValue;
  let packageValue;
  try {
    [forgeValue, packageValue] = await Promise.all([
      readJson(resolve(root, "forge.json")),
      readJson(resolve(root, "package.json"))
    ]);
  } catch (cause) {
    return projectError(
      "project-manifest-unreadable",
      "readable forge.json and package.json files",
      "Run the command from a ForgeaX game root or pass its directory.",
      { root, reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }
  if (forgeValue === null || typeof forgeValue !== "object") {
    return projectError(
      "project-manifest-invalid",
      "forge.json to contain an object",
      "Repair forge.json before running DevKit.",
      { root }
    );
  }
  if (packageValue === null || typeof packageValue !== "object") {
    return projectError(
      "package-manifest-invalid",
      "package.json to contain an object",
      "Repair package.json before running DevKit.",
      { root }
    );
  }
  const parsedForge = GameProjectSchema.safeParse(forgeValue);
  if (!parsedForge.success) {
    return projectError(
      "project-manifest-invalid",
      "forge.json to satisfy @forgeax/engine-project GameProjectSchema",
      "Repair the fields reported by the authoritative project schema.",
      { root, issues: parsedForge.error.issues }
    );
  }
  const forge = parsedForge.data;
  if (forge.id.length === 0 || forge.name.length === 0) {
    return projectError(
      "project-manifest-invalid",
      "forge.json to declare id and name",
      "Restore the project identity in the authoritative project manifest.",
      { root }
    );
  }
  const packageJson = packageValue;
  const startup = timeoutFromPackage(root, packageJson);
  if (!startup.ok) return startup;
  const frame = timeoutFromPackage(root, packageJson, "frameTimeoutMs");
  if (!frame.ok) return frame;
  return {
    ok: true,
    value: {
      root,
      id: forge.id,
      name: forge.name,
      roots: forge.roots,
      ...startup.value === void 0 ? {} : { startupTimeoutMs: startup.value },
      ...frame.value === void 0 ? {} : { frameTimeoutMs: frame.value },
      assetRoots: forge.assetRoots,
      packageJson
    }
  };
}
function commandError(cause, fallbackCode) {
  if (cause !== null && typeof cause === "object" && "code" in cause && "expected" in cause && "hint" in cause && "detail" in cause) {
    return cause;
  }
  return {
    code: fallbackCode,
    expected: "the ForgeaX command to complete",
    hint: "Inspect the underlying diagnostic and repair the owning input.",
    detail: {
      reason: cause instanceof Error ? cause.message : cause !== null && typeof cause === "object" && "message" in cause && typeof cause.message === "string" ? cause.message : String(cause)
    }
  };
}

export { commandError, isValidStartupTimeoutMs, readProjectFacts, readProjectStartupTimeoutMs };
//# sourceMappingURL=chunk-VNP4GISC.mjs.map
//# sourceMappingURL=chunk-VNP4GISC.mjs.map