import type {World} from '@forgeax/engine/ecs';
import {Name, Transform, worldDespawnScene} from '@forgeax/engine/scene';

import contactSpec from './pdr-furniture-clearance.json';

// Ground booth meshes share a pivot 1.30 m off the centre of the seat bay.
const boothCentreOffset = 1.30;
const foyerWallCentres = contactSpec.foyer.centres;
const foyerPlatformRise = .14;
const hallCentres = [-23.45, -26.45, -30.35, -33.35, -37.20];

export function arrangeGroundSeating(world: World) {
  const objects = new Map(Array.from(world.query({read:[Name, Transform]}).unwrap(),
    row => [row.get(Name).value, row.entity] as const));
  const entityFor = (name: string) => {
    const entity = objects.get(name);
    if (entity === undefined) throw new Error(`Ground seating object missing: ${name}`);
    return entity;
  };

  const placeBooth = (id: string, x: number, centreZ: number, mirrored: boolean) => {
    const z = centreZ + (mirrored ? -boothCentreOffset : boothCentreOffset);
    const attachments = [`BOOTH_${id}`, `DRINK_BOOTH_${id}_COUPE`, `DRINK_BOOTH_${id}_TUMBLER`];
    const origin = Array.from(world.get(entityFor(attachments[0]), Transform).unwrap().pos);
    // The drinks are separate scene roots. Their child glass, liquid and ice follow them.
    for (const name of attachments) {
      const entity = entityFor(name);
      const pose = world.get(entity, Transform).unwrap();
      const offsetX = pose.pos[0] - origin[0];
      const offsetZ = pose.pos[2] - origin[2];
      const tableShift = id.startsWith('F') && name.startsWith('DRINK_') ? contactSpec.foyer.tableShift : 0;
      const pos = [x + offsetX + tableShift, pose.pos[1] + (id.startsWith('F') ? foyerPlatformRise : 0), z + offsetZ];
      world.set(entity, Transform, {pos}).unwrap();
    }
  };

  for (const [index, centreZ] of foyerWallCentres.entries()) {
    placeBooth(`F1${index + 1}`, -13.7, centreZ, false);
  }
  for (const [index, centreZ] of hallCentres.entries()) {
    placeBooth(`DW${index + 1}`, -13.7, centreZ, false);
    placeBooth(`DE${index + 1}`, 13.7, centreZ, true);
  }
  // Drinks are independent roots. Remove each setting before its lamps and colliders register.
  for (const [name, entity] of objects) {
    if (/^(?:BOOTH_F2[123]|DRINK_BOOTH_F2[123]_(?:COUPE|TUMBLER)|HTABLE_[EW]\d|FURN_AISLE_SCREENS|DRINK_HTABLE_[EW]\d_COUPE)$/.test(name)) {
      worldDespawnScene(world, entity).unwrap();
    }
  }

}
