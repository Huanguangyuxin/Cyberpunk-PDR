import {FixedTime, FixedUpdate, type World, type EntityHandle} from '@forgeax/engine/ecs';
import {INPUT_SNAPSHOT_RESOURCE_KEY, type InputSnapshot} from '@forgeax/engine/input';
import {vec3} from '@forgeax/engine/math';
import {Name, Transform} from '@forgeax/engine/scene';
import {CharacterController, Collider, ColliderShapeValue, RigidBody, RigidBodyTypeValue, type PhysicsWorld} from '@forgeax/engine/physics';

export const BODY = Object.freeze({height:1.75, radius:.28, halfHeight:.595, skin:.015,
  eyeHeight:1.64, step:.20, snap:.25, speed:1.4, runSpeed:2.8, jumpSpeed:4.2, gravity:9.81});
export const centerAboveFeet = BODY.height/2 + BODY.skin;

// Keep actual solid geometry, including stair treads/railings and every furniture part.
// Calibration overlays, projected laser rays, water and printed decals are not solids.
export function isSolidMesh(name:string): boolean {
  return !name.startsWith('CALIB/') && !name.includes('SIMULATED_RAY') &&
    name !== 'WATER_SURFACE' && !name.includes('_BTL_LIQ_') && !name.startsWith('GRAPHIC_') &&
    !/POSTER_(OVERLAYER|REMNANT|TAPE)|_PRINT_FACE|DECAL/i.test(name);
}
export function horizontalIntent(right:number,forward:number,yaw:number) {
  const n=Math.max(1,Math.hypot(right,forward));
  return {x:(Math.cos(yaw)*right-Math.sin(yaw)*forward)/n,
    z:(-Math.sin(yaw)*right-Math.cos(yaw)*forward)/n};
}
export function shouldMouseLook(input: Pick<InputSnapshot['mouse'],'pointerLocked'|'button'>) {
  return input.pointerLocked || input.button(2);
}

/** Native Rapier is the only displacement/collision authority. Camera follows the capsule. */
export function installPhysicalNavigation(world:World, initialEye:readonly number[],
  view:()=>{active:boolean;yaw:number;eyeHeight:number;camera:EntityHandle}) {
  const entity=world.spawn(
    {component:Name,data:{value:'PDR/first-person-capsule-1.75m'}},
    {component:Transform,data:{pos:[initialEye[0],initialEye[1]-BODY.eyeHeight+centerAboveFeet,initialEye[2]]}},
    {component:RigidBody,data:{type:RigidBodyTypeValue.kinematic,lockRotation:true}},
    {component:Collider,data:{shape:ColliderShapeValue.capsule,radius:BODY.radius,halfHeight:BODY.halfHeight}},
    {component:CharacterController,data:{offset:BODY.skin,maxSlopeClimbDeg:45,minSlopeSlideDeg:46,
      autoStepMaxHeight:BODY.step,autoStepMinWidth:.15,snapToGroundDist:BODY.snap}},
  ).unwrap();
  let velocityY=0,jumpPending=false,jumpHeld=false,jumps=0,landings=0,ticks=0;
  let pendingReset: number[]|null=null;
  let diagnostic:{right:number;forward:number;sprint:boolean;jump:boolean;remaining:number}|null=null;
  let lastInput={right:0,forward:0,sprint:false,jump:false},lastDelta=[0,0,0],lastSource='none';
  let blockedTicks=0;
  const trace:Record<string,unknown>[]=[];
  const reset=(eye:readonly number[],eyeHeight:number)=>{
    pendingReset=[eye[0],eye[1]-eyeHeight+centerAboveFeet,eye[2]];
    velocityY=0;jumpPending=false;jumpHeld=false;diagnostic=null;
  };
  const sample=(input:InputSnapshot)=>{
    lastInput={right:Number(input.keyboard.downCode('KeyD'))-Number(input.keyboard.downCode('KeyA')),
      forward:Number(input.keyboard.downCode('KeyW'))-Number(input.keyboard.downCode('KeyS')),
      sprint:input.keyboard.downCode('ShiftLeft')||input.keyboard.downCode('ShiftRight'),
      jump:input.keyboard.downCode('Space')||input.keyboard.justPressedCode('Space')};
    if(lastInput.jump&&!jumpHeld) {jumpPending=true;lastSource='keyboard-Space';}
    jumpHeld=lastInput.jump;
  };
  const read=()=>{
    const p=Array.from(world.get(entity,Transform).unwrap().pos);
    const grounded=world.get(entity,CharacterController).unwrap().grounded;
    const physics=world.hasResource('PhysicsWorld')?world.getResource<PhysicsWorld>('PhysicsWorld'):null;
    return {backend:'ForgeaX native Rapier3D',ready:physics?.hasBody(entity)??false,entity,
      body:BODY,position:p,feetY:p[1]-centerAboveFeet,grounded,velocityY,jumps,landings,ticks,
      blockedTicks,lastInput:{...lastInput},lastDelta:[...lastDelta],lastSource,
      surface:'native triangle-mesh collision; no floor sampler',trace:trace.slice()};
  };
  world.addSystem(FixedUpdate,{name:'cyberpunk-physical-first-person',queries:[],
    after:['physicsSyncBackend'],before:['physicsStepSimulation'],fn:()=>{
      const v=view();if(!v.active||!world.hasResource('PhysicsWorld'))return;
      const pw=world.getResource<PhysicsWorld>('PhysicsWorld');if(!pw.hasBody(entity))return;
      const dt=world.getResource(FixedTime).delta;
      if(pendingReset){pw.teleport(entity,vec3.create(pendingReset[0],pendingReset[1],pendingReset[2]));pendingReset=null;}
      let controls=lastInput;
      if(diagnostic&&diagnostic.remaining>0){controls=diagnostic;diagnostic.remaining--;
        if(diagnostic.jump){jumpPending=true;diagnostic.jump=false;lastSource='engine-diagnostic';}}
      else if(diagnostic)diagnostic=null;
      const wasGrounded=world.get(entity,CharacterController).unwrap().grounded;
      if(jumpPending&&wasGrounded){velocityY=BODY.jumpSpeed;jumps++;}
      jumpPending=false;
      if(wasGrounded&&velocityY<0)velocityY=0;
      const verticalDelta=velocityY*dt-.5*BODY.gravity*dt*dt;
      velocityY-=BODY.gravity*dt;
      const motion=horizontalIntent(controls.right,controls.forward,v.yaw);
      const speed=controls.sprint?BODY.runSpeed:BODY.speed;
      const desired:[number,number,number]=[motion.x*speed*dt,verticalDelta,motion.z*speed*dt];
      const actual=pw.moveAndSlide(entity,vec3.create(...desired));lastDelta=Array.from(actual);
      const grounded=world.get(entity,CharacterController).unwrap().grounded;
      if(grounded&&velocityY<0){velocityY=0;if(!wasGrounded)landings++;}
      // A ceiling may stop ascent; never keep pressing an upward velocity into it.
      if(verticalDelta>0&&actual[1]<verticalDelta*.2)velocityY=Math.min(0,velocityY);
      if(Math.hypot(desired[0],desired[2])>.001&&Math.hypot(actual[0],actual[2])<Math.hypot(desired[0],desired[2])*.3)blockedTicks++;
      const p=world.get(entity,Transform).unwrap().pos;
      world.set(v.camera,Transform,{pos:[p[0],p[1]-centerAboveFeet+v.eyeHeight,p[2]]}).unwrap();
      ticks++;
      if(ticks%3===0){trace.push({tick:ticks,p:Array.from(p),feetY:p[1]-centerAboveFeet,grounded,
        vy:velocityY,desired,actual:Array.from(actual),source:lastSource});if(trace.length>1200)trace.shift();}
    }}).unwrap();
  return {entity,sample,reset,read,
    clearInput:()=>{lastInput={right:0,forward:0,sprint:false,jump:false};jumpPending=false;jumpHeld=false;},
    requestJump:()=>{jumpPending=true;lastSource='engine-diagnostic';},
    // Explicit diagnostic intent uses this SAME fixed system and native solver, never teleports per step.
    diagnostic:(right:number,forward:number,ticks:number,jump=false,sprint=false)=>{
      diagnostic={right,forward,remaining:Math.min(1800,Math.max(1,Math.floor(ticks))),jump,sprint};
    },
    clearTrace:()=>{trace.length=0;blockedTicks=0;jumps=0;landings=0;},
    dispose:()=>{world.removeSystem(FixedUpdate,'cyberpunk-physical-first-person').unwrap();world.despawn(entity).unwrap();},
  };
}
