/** Locate literal ESM edits so callers can preserve their source-map chain. */
export declare function moduleSpecifierEdits(source: string, filename: string, resolve: (specifier: string, kind: 'static' | 'dynamic') => string | undefined): {
    start: number;
    end: number;
    text: string;
}[];
/** Relocate literal ESM edges without converting or evaluating the module. */
export declare function rewriteModuleSpecifiers(source: string, filename: string, resolve: (specifier: string, kind: 'static' | 'dynamic') => string | undefined): string;
//# sourceMappingURL=module-specifiers.d.ts.map