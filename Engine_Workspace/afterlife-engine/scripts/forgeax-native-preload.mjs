// Keep the published CLI in charge of cooking, serving, optimized bundles and manifests.
// Add the project host transform when that CLI invokes Vite's public build/server API.
import { registerHooks } from 'node:module';
const plugin = new URL('./native-display-plugin.mjs', import.meta.url).href;
const capture = new URL('./subsurface-capture-plugin.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    const resolved = next(specifier, context);
    if (specifier !== 'vite' || !context.parentURL?.includes('/@forgeax/engine-devkit/dist/')) return resolved;
    const vite = JSON.stringify(resolved.url);
    const code = `export * from ${vite};
      import * as vite from ${vite};
      import { nativeDisplayPlugin } from ${JSON.stringify(plugin)};
      import { subsurfaceCapturePlugin } from ${JSON.stringify(capture)};
      const attach = config => ({
        ...config,
        plugins:[nativeDisplayPlugin(), subsurfaceCapturePlugin(), ...(config?.plugins ?? [])],
        worker: {
          ...config?.worker,
          plugins: () => [subsurfaceCapturePlugin(), ...(config?.worker?.plugins?.() ?? [])],
        },
      });
      export const build = c => vite.build(attach(c));
      export const createServer = c => vite.createServer(attach(c));`;
    return { url: 'data:text/javascript;charset=utf-8,'+encodeURIComponent(code), shortCircuit:true };
  },
});
