import type { ZipEntry } from './archive.js';
import type { CommandResult } from './types.js';
export declare const GAME_PACKAGE_DOCUMENT_PATHS: readonly ["README.md", "docs/feedback.md"];
export declare function readGamePackageDocuments(root: string): Promise<CommandResult<readonly ZipEntry[]>>;
//# sourceMappingURL=package-documents.d.ts.map