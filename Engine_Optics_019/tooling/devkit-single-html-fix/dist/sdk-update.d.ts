declare const UPDATE_MIGRATION_RISK = "Install a newer SDK in a separate directory. Existing games remain pinned and are not migrated automatically; review release notes and migrate and test each game before changing its Engine version.";
type SdkUpdateStatus = {
    readonly status: 'available';
    readonly currentVersion: string;
    readonly latestVersion: string;
    readonly migrationRisk: typeof UPDATE_MIGRATION_RISK;
} | {
    readonly status: 'current';
    readonly currentVersion: string;
    readonly latestVersion: string;
} | {
    readonly status: 'skipped';
    readonly currentVersion: string;
    readonly reason: 'offline' | 'disabled';
} | {
    readonly status: 'unavailable';
    readonly currentVersion: string;
    readonly reason: string;
};
export declare function newerSdkVersion(currentVersion: string, latestVersion: string): boolean;
export declare function checkSdkUpdate(currentVersion: string): Promise<SdkUpdateStatus>;
export {};
//# sourceMappingURL=sdk-update.d.ts.map