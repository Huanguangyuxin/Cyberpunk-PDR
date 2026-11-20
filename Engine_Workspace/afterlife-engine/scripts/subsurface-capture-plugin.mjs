// Source guard for the published ForgeAX Engine Render 0.5.0 chunk.
// Local cube captures can include author-hidden mesh-default placeholder slots before publication.
const chunk = '/@forgeax/engine-render/dist/chunk-2P5VQUEP.mjs';
const original = `  add(source, materials) {
    const slots = source.materials;
    if (slots.length === 0) this.addMember(source.material, materials);
    for (let index2 = 0; index2 < slots.length; index2++)
      this.addMember(slots[index2], materials);
  }`;
const corrected = `  add(source, materials) {
    const slots = source.materials;
    if (slots.length === 0) this.addCaptureSlot(source, source.material, materials);
    for (const slot of slots) this.addCaptureSlot(source, slot, materials);
  }
  addCaptureSlot(source, resource, materials) {
    if (source.authorVisible === false && resource.snapshot.materialHandle === 0 && !materials.get(resource)) return;
    this.addMember(resource, materials);
  }`;

export function subsurfaceCapturePlugin() {
  return {
    name: 'afterlife-subsurface-capture',
    enforce: 'pre',
    transform(source, id) {
      const path = id.split('?')[0].replaceAll('\\', '/');
      if (!path.includes('/@forgeax/engine-render/dist/')) return null;
      const marker = 'var SubsurfaceSelection = class {';
      if (!path.endsWith(chunk) && !source.includes(marker)) return null;
      const start = source.indexOf(marker);
      const end = source.indexOf('  addMember(resource, materials) {', start);
      const body = source.slice(start, end);
      if (!path.endsWith(chunk) || start < 0 || end < start || !body.includes(original)) {
        this.error('ForgeAX SubsurfaceSelection changed. Review the project hidden-slot capture adapter.');
      }
      return {code: source.slice(0, start) + body.replace(original, corrected) + source.slice(end), map: null};
    },
  };
}
