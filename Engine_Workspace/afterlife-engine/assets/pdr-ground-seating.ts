import type {World} from '@forgeax/engine/ecs';
import {Name, Transform} from '@forgeax/engine/scene';

// Ground booth meshes share a pivot 1.30 m off the centre of the seat bay.
const boothCentreOffset = 1.30;
const foyerWallCentres = [-2.45, -5.45, -9.70];
const foyerIslandCentres = [-2.62, -5.61, -9.57];
const hallCentres = [-23.45, -26.45, -30.35, -33.35, -37.20];

export function arrangeGroundSeating(world: World) {
  const objects = new Map(Array.from(world.query({read:[Name, Transform]}).unwrap(),
    row => [row.get(Name).value, row.entity] as const));
  const entityFor = (name: string) => {
    const entity = objects.get(name);
    if (entity === undefined) throw new Error(`Ground seating object missing: ${name}`);
    return entity;
  };

  const placeBooth = (id: string, x: number, centreZ: number, mirrored: boolean, turn: boolean) => {
    const z = centreZ + (mirrored ? -boothCentreOffset : boothCentreOffset);
    const attachments = [`BOOTH_${id}`, `DRINK_BOOTH_${id}_COUPE`, `DRINK_BOOTH_${id}_TUMBLER`];
    const origin = Array.from(world.get(entityFor(attachments[0]), Transform).unwrap().pos);
    const direction = turn ? -1 : 1;
    // The drinks are separate scene roots. Their child glass, liquid and ice follow them.
    for (const name of attachments) {
      const entity = entityFor(name);
      const pose = world.get(entity, Transform).unwrap();
      const offsetX = pose.pos[0] - origin[0];
      const offsetZ = pose.pos[2] - origin[2];
      const pos = [x + offsetX * direction, pose.pos[1], z + offsetZ * direction];
      if (turn) {
        const [qx, qy, qz, qw] = pose.quat;
        // Left-multiply the authored rotation by a half turn about world Y.
        world.set(entity, Transform, {pos, quat:[qz, qw, -qx, -qy]}).unwrap();
      } else {
        world.set(entity, Transform, {pos}).unwrap();
      }
    }
  };

  for (const [index, centreZ] of foyerWallCentres.entries()) {
    placeBooth(`F1${index + 1}`, -13.7, centreZ, false, false);
    placeBooth(`F2${index + 1}`, -7.60, foyerIslandCentres[index], true, true);
  }
  for (const [index, centreZ] of hallCentres.entries()) {
    placeBooth(`DW${index + 1}`, -13.7, centreZ, false, false);
    placeBooth(`DE${index + 1}`, 13.7, centreZ, true, false);
  }
}
