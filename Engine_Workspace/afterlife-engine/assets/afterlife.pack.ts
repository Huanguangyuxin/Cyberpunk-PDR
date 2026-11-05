import { definePack, definePackageId } from '@forgeax/engine/pack/source';
import { ok } from '@forgeax/engine/types';
import { mountPluginAsset, joinPluginFiber, type Plugin } from '@forgeax/engine/plugin';
import { worldDespawnScene } from '@forgeax/engine/scene';
export { default as player } from './player/first-person.plugin.ts';
export { default as atmosphere } from './atmosphere/atmosphere.plugin.ts';
export { default as neon } from './lighting/neon.plugin.ts';
export const game: Plugin.Object<{readonly children: readonly string[]}> = {
 name: 'afterlife/engine', inject: ['assets','pluginPrograms'],
 async apply(ctx, config) {
  await ctx.effect(async function* () {
   for (const guid of config.children) {
    const child = await mountPluginAsset(ctx, guid);
    if (!child.ok) throw child.error;
    yield joinPluginFiber(child.value);
   }
  });
 }
};
export const scene: Plugin.Object<{readonly scene: string; readonly children: readonly string[]}> = {
 name:'afterlife/interior', inject:['world','assets','physics','pluginPrograms'],
 async apply(ctx,config) {
  const assets=ctx.assets!;
  const loaded=await assets.load(assets.parseGuid(config.scene),'scene');
  if(!loaded.ok) throw loaded.error;
  await ctx.effect(async function* () {
   yield () => assets.release(loaded.value).unwrap();
   const root=assets.instantiate(loaded.value,ctx.world).unwrap();
   yield () => worldDespawnScene(ctx.world,root).unwrap();
   for (const guid of config.children) {
    const child=await mountPluginAsset(ctx,guid);
    if(!child.ok) throw child.error;
    yield joinPluginFiber(child.value);
   }
  });
 }
};
export default definePack({schemaVersion:'2.0.0',plugins:true,packageId:definePackageId('9ce2589b-6714-4545-829e-7db67fe10ea7'),build:()=>ok({
  "plugin/engine": {
    "kind": "plugin",
    "module": {
      "specifier": "./afterlife.pack.ts",
      "export": "game"
    },
    "config": {
      "children": [
        {
          "$asset": "10afcb25-0d0f-54e3-8f04-4997e76f1f69"
        },
        {
          "$asset": "42710ffc-ac5d-5a9b-84ab-652cfc7e6156"
        }
      ]
    }
  },
  "plugin/physics": {
    "kind": "plugin",
    "module": {
      "specifier": "@forgeax/engine/physics/rapier3d"
    }
  },
  "plugin/scene": {
    "kind": "plugin",
    "module": {
      "specifier": "./afterlife.pack.ts",
      "export": "scene"
    },
    "config": {
      "scene": {
        "$asset": "01a18078-9d28-7efe-9848-e32304ede0f5"
      },
      "children": [
        {
          "$asset": "2bea6f56-2a89-5f1e-aa57-73e080b69fa4"
        },
        {
          "$asset": "15f37bf5-21ce-52e6-8c98-464bc7af54ee"
        },
        {
          "$asset": "7085c9e8-9b17-5f7d-991f-1cec5f741b97"
        }
      ]
    }
  },
  "plugin/player": {
    "kind": "plugin",
    "module": {
      "specifier": "./afterlife.pack.ts",
      "export": "player"
    }
  },
  "plugin/atmosphere": {
    "kind": "plugin",
    "module": {
      "specifier": "./afterlife.pack.ts",
      "export": "atmosphere"
    }
  },
  "plugin/neon": {
    "kind": "plugin",
    "module": {
      "specifier": "./afterlife.pack.ts",
      "export": "neon"
    }
  }
})});
