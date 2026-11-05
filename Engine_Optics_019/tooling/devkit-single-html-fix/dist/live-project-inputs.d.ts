/** Local-filesystem change evidence, not a content digest or an atomic snapshot.
 * Read metadata only. ctime also detects same-size writes with restored mtime.
 * Follow author symlinks, fail closed on unreadable/missing/cyclic inputs.
 */
export declare function readLiveProjectInputs(root: string, inputPaths?: readonly string[]): Promise<string>;
//# sourceMappingURL=live-project-inputs.d.ts.map