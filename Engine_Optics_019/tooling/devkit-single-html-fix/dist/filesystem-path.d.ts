interface FilesystemPathApi {
    readonly sep: string;
    relative(from: string, to: string): string;
    isAbsolute(path: string): boolean;
}
/** Normalize only separators for native paths and Vite IDs; preserve case and path identity. */
export declare function filesystemPathKey(path: string): string;
/** Reuse the same comparison key for unordered path lists. */
export declare function filesystemPathListKey(paths: Iterable<string>): string;
/** Root fences use native path rules; comparison keys grant no directory authority. */
export declare function filesystemPathRelative(root: string, candidate: string, allowRoot?: boolean, pathApi?: FilesystemPathApi): string | undefined;
export declare function isFilesystemPathWithin(root: string, candidate: string, allowRoot?: boolean, pathApi?: FilesystemPathApi): boolean;
export declare function filesystemPathSegments(path: string, pathApi?: Pick<FilesystemPathApi, 'sep'>): string[];
export {};
//# sourceMappingURL=filesystem-path.d.ts.map