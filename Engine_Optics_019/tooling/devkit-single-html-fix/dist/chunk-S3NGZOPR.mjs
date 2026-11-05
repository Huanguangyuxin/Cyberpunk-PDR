#!/usr/bin/env node
import { execFile } from 'child_process';
import { basename, extname } from 'path';
import { promisify } from 'util';

var execFileAsync = promisify(execFile);
function commandInvocation(command, args, platform = process.platform, comSpec = process.env.ComSpec ?? process.env.COMSPEC ?? "cmd.exe") {
  if (platform !== "win32" || /\.exe$/i.test(command)) {
    return { file: command, args, options: {} };
  }
  return {
    file: comSpec,
    args: ["/d", "/s", "/c", command, ...args],
    options: { windowsVerbatimArguments: false }
  };
}
function execFileCommand(command, args, options = {}) {
  const manager = options.env?.npm_execpath ?? process.env.npm_execpath;
  const invocation = command === "pnpm" && manager && /^pnpm(?:-native)?(?:\.[cm]?js|\.exe)?$/i.test(basename(manager)) ? commandInvocation(
    [".js", ".cjs", ".mjs"].includes(extname(manager)) ? process.execPath : manager,
    [...[".js", ".cjs", ".mjs"].includes(extname(manager)) ? [manager] : [], ...args]
  ) : commandInvocation(command, args);
  const execOptions = {
    ...options,
    encoding: "utf8",
    ...invocation.options
  };
  return Promise.resolve().then(() => execFileAsync(invocation.file, [...invocation.args], execOptions)).catch((cause) => {
    if (process.platform !== "darwin" || cause === null || typeof cause !== "object" || !("code" in cause) || cause.code !== "ENOEXEC") {
      throw cause;
    }
    return execFileAsync("/bin/sh", ["-c", 'exec "$0" "$@"', command, ...args], execOptions);
  }).then((result) => ({
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  }));
}

export { execFileCommand };
//# sourceMappingURL=chunk-S3NGZOPR.mjs.map
//# sourceMappingURL=chunk-S3NGZOPR.mjs.map