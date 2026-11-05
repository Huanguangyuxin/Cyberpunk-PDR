#!/usr/bin/env node
import { projectBuildDescriptor, authorPluginCreateDescriptor, packAuthoringToolDescriptors, authorPluginInspectDescriptor, authorPluginRootDescriptor, pluginMigrationDescriptor } from './chunk-6PBPEM2R.mjs';
import { nativePreviewTools } from './chunk-WTUHF6YQ.mjs';
import './chunk-6AKTNSSW.mjs';
import { resolve } from 'path';
import { defineTool } from '@forgeax/engine-tool-runtime';

function commandFailure(error) {
  return { ok: false, error: { ...error, detail: error.detail } };
}
function createBuildContribution(projectRoot = process.cwd(), takeInitialSources) {
  return defineTool(
    projectBuildDescriptor,
    async (options) => {
      const { buildCommand } = await import('./commands-DABHGFZM.mjs');
      const root = options.root ?? projectRoot;
      const initialSources = resolve(root) === resolve(projectRoot) ? takeInitialSources?.() : void 0;
      const result = await buildCommand({ ...options, root }, initialSources);
      return result.ok ? result.value : commandFailure(result.error);
    }
  );
}
function createAuthorContribution(projectRoot = process.cwd()) {
  return defineTool(
    authorPluginCreateDescriptor,
    async (options) => {
      const { pluginCreateCommand } = await import('./plugin-authoring-TUTF4RFD.mjs');
      const result = await pluginCreateCommand({ ...options, root: options.root ?? projectRoot });
      return result.ok ? result.value : commandFailure(result.error);
    }
  );
}
function createPackAuthoringContributions(projectRoot = process.cwd()) {
  let gateway;
  return packAuthoringToolDescriptors.map(
    (descriptor) => defineTool(
      descriptor,
      async (operation) => {
        const id = descriptor.id;
        if (id === "asset.list" || id === "asset.verify" || id === "asset.inspect" || id === "asset.resolve") {
          const assets = await import('./assets-73XA3ATS.mjs');
          const raw = operation;
          const result2 = id === "asset.list" ? await assets.assetListCommand({
            root: projectRoot,
            ...typeof raw.type === "string" ? { type: raw.type } : {},
            ...typeof raw.limit === "number" ? { limit: raw.limit } : {},
            ...typeof raw.cursor === "string" ? { cursor: raw.cursor } : {}
          }) : id === "asset.verify" ? await assets.assetVerifyCommand({ root: projectRoot }) : id === "asset.inspect" ? await assets.assetInspectCommand({
            root: projectRoot,
            subject: String(raw.subject ?? ""),
            ...raw.parametersOnly === true ? { parametersOnly: true } : {}
          }) : await assets.assetResolveCommand({
            root: projectRoot,
            ...typeof raw.subject === "string" ? { subject: raw.subject } : {},
            ...typeof raw.packageId === "string" ? { packageId: raw.packageId } : {},
            ...typeof raw.sourceKey === "string" ? { sourceKey: raw.sourceKey } : {},
            ...raw.require === "identity" || raw.require === "present" || raw.require === "ready" ? { require: raw.require } : {}
          });
          if (!result2.ok) return commandFailure(result2.error);
          if (id === "asset.list" && Array.isArray(result2.value)) {
            return {
              assets: result2.value,
              sources: [],
              snapshot: {
                sourceCount: new Set(result2.value.map((entry) => entry.sourcePath)).size,
                assetCount: result2.value.length
              }
            };
          }
          return result2.value;
        }
        gateway ??= import('@forgeax/engine-pack/build').then(
          ({ createFileSystemPackAuthoringGateway }) => createFileSystemPackAuthoringGateway({
            gameRoot: projectRoot,
            transfer: async (operation2) => (await import('./source-transfer-XPVJ6S5O.mjs')).transferPackOperation(
              projectRoot,
              operation2
            )
          })
        );
        const result = await (await gateway).execute({ ...operation, operation: id });
        return result.ok ? result.value : commandFailure(result.error);
      }
    )
  );
}
function createAuthorInspectContribution(projectRoot = process.cwd()) {
  return defineTool(
    authorPluginInspectDescriptor,
    async (options) => {
      const { pluginInspectCommand } = await import('./plugin-authoring-TUTF4RFD.mjs');
      const result = await pluginInspectCommand({ ...options, root: options.root ?? projectRoot });
      return result.ok ? result.value : commandFailure(result.error);
    }
  );
}
function createProjectRootContribution(projectRoot = process.cwd()) {
  return defineTool(
    authorPluginRootDescriptor,
    async (options) => {
      const { pluginRootCommand } = await import('./plugin-authoring-TUTF4RFD.mjs');
      const result = await pluginRootCommand({ ...options, root: options.root ?? projectRoot });
      return result.ok ? result.value : commandFailure(result.error);
    }
  );
}
function createDefaultContributions(projectRoot = process.cwd(), takeInitialSources) {
  return [
    defineTool(
      pluginMigrationDescriptor,
      async (options) => {
        const { pluginMigrateCommand } = await import('./migration-Q2MDKL4H.mjs');
        const result = await pluginMigrateCommand({
          ...options,
          root: options.root ?? projectRoot
        });
        return result.ok ? result.value : commandFailure(result.error);
      }
    ),
    createBuildContribution(projectRoot, takeInitialSources),
    createAuthorContribution(projectRoot),
    createProjectRootContribution(projectRoot),
    createAuthorInspectContribution(projectRoot),
    ...createPackAuthoringContributions(projectRoot),
    ...nativePreviewTools
  ];
}

export { createAuthorContribution, createAuthorInspectContribution, createBuildContribution, createDefaultContributions, createPackAuthoringContributions, createProjectRootContribution };
//# sourceMappingURL=contributions-JSTDCHXL.mjs.map
//# sourceMappingURL=contributions-JSTDCHXL.mjs.map