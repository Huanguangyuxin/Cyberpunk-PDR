export declare function thumbnailKey(input: string, producer: string): string;
export declare function thumbnailPng(dataUrl: string): Uint8Array;
export declare function createThumbnailCache(root: string): {
    read(key: string): Promise<string | undefined>;
    write(key: string, guid: string, producer: string, dataUrl: string): Promise<void>;
};
//# sourceMappingURL=workspace-thumbnail-cache.d.ts.map