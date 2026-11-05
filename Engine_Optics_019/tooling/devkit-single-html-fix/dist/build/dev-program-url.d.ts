/** Strip only Vite transport cache hints; semantic module queries stay intact. */
export declare function normalizeDevProgramUrl(url: string): string;
export declare const devProgramSessionQuery = "forgeax-program-session";
export declare function devProgramSession(url: string): string | null;
/** Session locators belong to this Host, never to the portable program graph. */
export declare function withDevProgramSession(url: string, session: string | null): string;
//# sourceMappingURL=dev-program-url.d.ts.map