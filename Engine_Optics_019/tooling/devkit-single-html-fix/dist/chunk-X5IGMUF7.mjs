#!/usr/bin/env node
import { sep, relative, isAbsolute } from 'path';

var nativePath = { isAbsolute, relative, sep };
function filesystemPathKey(path) {
  return path.replaceAll("\\", "/");
}
function filesystemPathRelative(root, candidate, allowRoot = true, pathApi = nativePath) {
  const local = pathApi.relative(root, candidate);
  if (local === "") return allowRoot ? local : void 0;
  if (local === ".." || local.startsWith(`..${pathApi.sep}`) || pathApi.isAbsolute(local))
    return void 0;
  return local;
}
function isFilesystemPathWithin(root, candidate, allowRoot = true, pathApi = nativePath) {
  return filesystemPathRelative(root, candidate, allowRoot, pathApi) !== void 0;
}
function filesystemPathSegments(path, pathApi = nativePath) {
  return path.split(pathApi.sep);
}

export { filesystemPathKey, filesystemPathRelative, filesystemPathSegments, isFilesystemPathWithin };
//# sourceMappingURL=chunk-X5IGMUF7.mjs.map
//# sourceMappingURL=chunk-X5IGMUF7.mjs.map