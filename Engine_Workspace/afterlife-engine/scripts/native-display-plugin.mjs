// The stock DevKit assembles both the main and worker browser hosts in this module.
export function nativeDisplayPlugin() {
  return {
    name: 'afterlife-native-display',
    enforce: 'pre',
    transform(source, id) {
      if (!id.split('?')[0].replaceAll('\\', '/').endsWith('/main.ts') ||
          !source.includes('virtual:forgeax/bundler') || !source.includes('createApp(')) return null;
      const ratio = 'Math.max(.01, window.devicePixelRatio || 1)';
      const mount = /createApp\(\s*canvas,\s*workerExecution\s*\?\s*\{/;
      const main = /:\s*\{\s*uiRoot: document\.querySelector\('#game-ui'\)/;
      const resize = 'const resizeCanvas = () => syncCanvasDrawingBuffer(canvas);';
      if (!mount.test(source) || !main.test(source) || !source.includes(resize)) {
        this.error('ForgeAX browser host changed; check both createApp options before building.');
      }
      // Live getter keeps worker resize measurements current when the window changes screen.
      const option = 'get canvasPixelRatio() { return '+ratio+'; },';
      return { code: source.replace(mount, m => m+option)
        .replace(main, m => m.replace('{','{'+option))
        .replace(resize, 'const resizeCanvas = () => syncCanvasDrawingBuffer(canvas, undefined, '+ratio+');'), map: null };
    },
  };
}
