#!/usr/bin/env node
// src/cli.ts
var rawArgs = process.argv.slice(2);
if (rawArgs[0] === "--__forgeax-backend") {
  const { runDevKitBackendProcess } = await import('./backend-process-26TZPV6C.mjs');
  if (!rawArgs[1] || !rawArgs[2])
    throw new Error("Backend process requires a root and startup claim");
  await runDevKitBackendProcess(rawArgs[1], rawArgs[2]);
  process.exit(0);
} else if (rawArgs[0] === "--__forgeax-live-daemon") {
  const root = rawArgs[1];
  const port = Number(rawArgs[2]);
  if (root === void 0 || !Number.isInteger(port) || port <= 0) {
    process.exitCode = 2;
  } else {
    const lifetime = new AbortController();
    const stop = () => lifetime.abort();
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
    try {
      const { runLiveDevDaemon } = await import('./live-dev-RDIRBVXD.mjs');
      await runLiveDevDaemon(root, port, void 0, {
        snapshot: rawArgs[3] === "snapshot",
        signal: lifetime.signal
      });
    } finally {
      process.off("SIGTERM", stop);
      process.off("SIGINT", stop);
    }
    process.exit(0);
  }
} else if (rawArgs[0] === "--__forgeax-live-project") {
  const root = rawArgs[1];
  const generation = rawArgs[2];
  if (root === void 0 || generation === void 0) process.exitCode = 2;
  else {
    const { runLiveProjectProcess } = await import('./live-dev-RDIRBVXD.mjs');
    await runLiveProjectProcess(root, generation, rawArgs[3]);
  }
} else {
  const { runUnifiedCli } = await import('./unified-cli-2TWUJWCM.mjs');
  const result = await runUnifiedCli(rawArgs);
  const jsonFlag = [...rawArgs].reverse().find((arg) => arg === "--json" || arg.startsWith("--json="));
  if (jsonFlag !== void 0 && jsonFlag !== "--json=false") {
    process.stdout.write(`${JSON.stringify(result)}
`);
  } else if (result.ok) {
    const value = result.value;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && Array.isArray(Reflect.get(value, "nodes"))) {
      const help = value;
      process.stdout.write(`${help.path === "" ? "forgeax" : `forgeax ${help.path ?? ""}`}
`);
      if (help.summary !== void 0) process.stdout.write(`  ${help.summary}
`);
      const render = (nodes, indent) => {
        for (const node of nodes) {
          process.stdout.write(
            `${indent}${node.name}${node.leaf === void 0 ? " \u2026" : ""}  ${node.summary}
`
          );
          if (node.children !== void 0)
            render(node.children, `${indent}  `);
        }
      };
      render(help.nodes, "  ");
      if (help.leaf !== void 0) {
        const leaf = help.leaf;
        process.stdout.write(`  title: ${leaf.title}
`);
        process.stdout.write(`  realm: ${leaf.realm}
`);
        if (leaf.inputSchema !== void 0)
          process.stdout.write(`  input: ${JSON.stringify(leaf.inputSchema)}
`);
        else if (leaf.inputDescription !== void 0)
          process.stdout.write(`  input: ${leaf.inputDescription}
`);
        if (leaf.outputSchema !== void 0)
          process.stdout.write(`  output: ${JSON.stringify(leaf.outputSchema)}
`);
        else if (leaf.outputDescription !== void 0)
          process.stdout.write(`  output: ${leaf.outputDescription}
`);
        if (leaf.capabilities.length > 0)
          process.stdout.write(`  capabilities: ${leaf.capabilities.join(", ")}
`);
        if (leaf.errors.length > 0) process.stdout.write(`  errors: ${leaf.errors.join(", ")}
`);
        if (leaf.example !== void 0)
          process.stdout.write(`  example: ${JSON.stringify(leaf.example)}
`);
      }
    } else if (value !== void 0) {
      process.stdout.write(`${JSON.stringify(value)}
`);
    }
  } else {
    process.stderr.write(
      `[forgeax] ${result.error?.code ?? "cli-error"}: ${result.error?.hint ?? "command failed"}
`
    );
  }
  if (!result.ok) process.exitCode = result.error?.code === "cli-parse-error" ? 2 : 1;
}
//# sourceMappingURL=cli.mjs.map
//# sourceMappingURL=cli.mjs.map