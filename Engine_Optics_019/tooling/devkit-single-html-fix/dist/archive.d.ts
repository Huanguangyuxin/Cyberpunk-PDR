export interface ZipEntry {
    readonly path: string;
    readonly bytes: Uint8Array;
}
export declare function createZip(entriesInput: readonly ZipEntry[]): Buffer;
//# sourceMappingURL=archive.d.ts.map