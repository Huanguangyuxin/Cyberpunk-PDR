#!/usr/bin/env node
import { liveDevControl } from './chunk-4CLUR564.mjs';
import './chunk-OMR3CVHO.mjs';
import './chunk-UTXAIODQ.mjs';
import './chunk-6AKTNSSW.mjs';
import './chunk-X5IGMUF7.mjs';
import './chunk-VNP4GISC.mjs';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';

async function exportPipelineLibrary(root, args) {
  const response = await liveDevControl(root, "eval", {
    revision: args.revision,
    code: `const result = typeof execution !== 'undefined' && execution.inspectRenderer
      ? await execution.inspectRenderer({pipelineLibrary:true})
      : {ok:true,value:renderer.inspect({pipelineLibrary:true})};
    if (!result.ok) throw result.error;
    if (!result.value.pipelineLibraryManifest) throw new Error('Pipeline library export unavailable');
    return {manifest:result.value.pipelineLibraryManifest,inspection:result.value.pipelineLibrary,frame:result.value.frame};`
  });
  if (!response.ok)
    return {
      ok: false,
      error: response.error ?? {
        code: "pipeline-library-export-failed",
        hint: "Live inspection returned no failure detail."
      }
    };
  const value = response.value;
  if (value === void 0)
    return {
      ok: false,
      error: { code: "pipeline-library-export-failed", hint: "Live evaluation returned no value" }
    };
  const evaluated = value.result;
  if (!evaluated.ok || evaluated.value?.manifest.version !== 1)
    return {
      ok: false,
      error: {
        code: "pipeline-library-export-failed",
        expected: "a complete pipeline library from the active renderer",
        hint: "Inspect the retained live evaluation failure.",
        detail: evaluated.error
      }
    };
  const { manifest, inspection, frame } = evaluated.value;
  const output = resolve(root, args.output ?? ".forgeax/pipeline-library.json");
  const bytes = `${JSON.stringify(manifest)}
`;
  const receipt = {
    revision: value.revision,
    output,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: Buffer.byteLength(bytes),
    inspection,
    frame,
    scope: "All observed ordinary RHI pipeline requests on the current WebGPU device. Synchronous creation does not prove native compilation completion. Unvisited gameplay/settings still require coverage."
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, bytes);
  await writeFile(`${output}.receipt.json`, `${JSON.stringify(receipt, null, 2)}
`);
  return { ok: true, value: receipt };
}

export { exportPipelineLibrary };
//# sourceMappingURL=pipeline-library-export-M3QJ4W7G.mjs.map
//# sourceMappingURL=pipeline-library-export-M3QJ4W7G.mjs.map