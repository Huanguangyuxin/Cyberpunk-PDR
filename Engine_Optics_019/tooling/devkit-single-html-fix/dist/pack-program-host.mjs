import { randomUUID } from 'crypto';
import { readFile, mkdir, writeFile, rename, rm } from 'fs/promises';
import { resolve, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { packProgramModuleIdentity, linkPackProgram } from '@forgeax/engine-pack/runtime';

// src/build/pack-program-host.ts
function createNodePackProgramHost(directory) {
  return {
    async publish(program, imports) {
      const root = resolve(
        directory,
        packProgramModuleIdentity(program, imports).unwrap().replace(":", "-")
      );
      const base = pathToFileURL(`${root}/`).href;
      const linked = linkPackProgram(program, base, imports).unwrap();
      try {
        const existing = await readFile(resolve(root, "package.json"), "utf8");
        if (existing === '{"type":"module"}') {
          for (const file of linked.files)
            if (await readFile(fileURLToPath(file.url), "utf8") !== file.source)
              throw new TypeError("persistent program content differs");
          return linked.entryUrl;
        }
      } catch (cause) {
        if (cause.code !== "ENOENT") throw cause;
      }
      const staging = `${root}.pending-${randomUUID()}`;
      try {
        for (const file of linked.files) {
          const target = resolve(staging, fileURLToPath(file.url).slice(root.length + 1));
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, file.source);
        }
        await writeFile(resolve(staging, "package.json"), '{"type":"module"}');
        await mkdir(dirname(root), { recursive: true });
        try {
          await rename(staging, root);
        } catch (cause) {
          if (!["EEXIST", "ENOTEMPTY", ...process.platform === "win32" ? ["EPERM"] : []].includes(
            cause.code ?? ""
          ))
            throw cause;
          for (const file of linked.files)
            if (await readFile(fileURLToPath(file.url), "utf8") !== file.source)
              throw new TypeError("concurrent program publication differs");
        }
        return linked.entryUrl;
      } finally {
        await rm(staging, { recursive: true, force: true });
      }
    }
  };
}

export { createNodePackProgramHost };
//# sourceMappingURL=pack-program-host.mjs.map
//# sourceMappingURL=pack-program-host.mjs.map