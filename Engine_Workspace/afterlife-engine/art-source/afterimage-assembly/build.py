"""Rebuild the editable, metre-scale D189 layout with Blender 5 in background."""
import ast
import json
import math
import runpy
import re
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector, Quaternion

OUT = Path(__file__).resolve().parent
ASSETS = OUT.parents[1] / 'assets'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
bpy.context.preferences.filepaths.save_version = 0


def xyz(triple):
    x, y, z = triple
    return Vector((x, -z, y))


def group(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c


def ingest(filename, name):
    c = group(name)
    prior = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ASSETS / filename), import_pack_images=True)
    for obj in set(bpy.data.objects) - prior:
        for previous in list(obj.users_collection):
            previous.objects.unlink(obj)
        c.objects.link(obj)
    return c


def drop(obj):
    for child in list(obj.children):
        drop(child)
    bpy.data.objects.remove(obj, do_unlink=True)


def remove_faces(obj, predicate):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    faces = [f for f in bm.faces if predicate(obj.material_slots[f.material_index].name, f)]
    bmesh.ops.delete(bm, geom=faces, context='FACES')
    bm.to_mesh(obj.data)
    bm.free()


core = ingest('Club_Upper_WB015_bcf6514f.glb', '01 · Building and furnishings')
decor = ingest('WB018_lizzie_badb10cd.glb', '02 · Architectural lighting details')
ingest('D189-Hall-Fittings.glb', '03 · Performance hall')
ingest('D189-Rear-Finishes.glb', '04 · Foyer and backbar')
ingest('D189-VIP-Portals.glb', '05 · Gallery portals')
ingest('PDR_FORGEAX_OFFICIAL_D080.glb', '06 · Official stage plaque')
carpets = ingest('PDR_Carpets_D113.glb', '07 · Floor textiles')
panels = ingest('PDR-D180-Installed-Finishes.glb', '08 · Surface treatments')
for name in ('D180_Material_Library', 'BAR_CANOPY', 'FIX_ROOF_LIGHT_BANDS',
             'FIX_SOFFIT_PENDANTS', 'FURN_AISLE_SCREENS','ARCH_FLOOR_INLAY',
             'DECOR_STICKERS','STAGE_MOVING_HEAD_3','STAGE_MOVING_HEAD_4'):
    if obj := bpy.data.objects.get(name):
        drop(obj)
for name in list(core.objects.keys()):
    if re.match(r'(BOOTH_F2[123]$|DRINK_BOOTH_F2[123]_(COUPE|TUMBLER)$|CALIB|HTABLE_[EW]\d$|DRINK_HTABLE_[EW]\d_COUPE$|DECOR_PLANT_0\d$)', name):
        if obj := bpy.data.objects.get(name):
            drop(obj)
for obj in list(carpets.objects):
    if obj.name.startswith('D115_'):
        drop(obj)
    elif obj.name.startswith('D113_'):
        obj.scale.x *= .48
        obj.scale.y *= .48

remove_faces(decor.objects['WB018_STAGE_FLANK_PANELS'], lambda m,f: m.startswith('M18_ACOUSTIC_WEAVE'))
elev = (ASSETS/'pdr-elevation-and-soffit-lights.ts').read_text()


def listed(key):
    s = re.search(key+r' = new Set\(\[(.*?)\]\)',elev,re.S).group(1)
    return set(re.findall("'([^']+)'",s))


upper, roof, upper_mesh, roof_mesh = [listed(k) for k in (
    'UPPER_TRANSFORM_NODES','CEILING_TRANSFORM_NODES','UPPER_ORIGIN_MESH_NODES','CEILING_ORIGIN_MESH_NODES')]
for obj in list(core.objects) + list(decor.objects):
    n = obj.name
    if n in upper or n in ('LA_E','LA_W') or re.fullmatch(r'DRINK_BOOTH_U[EW]\d+_(COUPE|TUMBLER)',n):
        obj.location.z += .45
    if n in roof:
        obj.location.z += .65
    if n=='FP_STAIR_MID':
        obj.location.z += .225
    if obj.type!='MESH':
        continue
    vip = re.fullmatch('VIP_[EW][12]_SHELL', n)
    if vip:
        remove_faces(obj,lambda m,f:m.startswith('WB015_M_ROOF_DARK') or (m.startswith('WB015_M_PLINTH_PINK') and min(v.co.z for v in f.verts)>6.5))
    if n in upper_mesh or n in roof_mesh:
        obj.location.z += .45 if n in upper_mesh else .65
        continue
    if n not in roof and not vip and n not in ('WB018_CEIL_BAND_FRONT','ARCH_WALL_SOUTH','ARCH_WALLS_WEN','ARCH_COLUMNS','ARCH_COLUMNS_WB015','ARCH_PYLONS','MEP_PIPES','MEP_TRAYS_WIRES_JBOX','STAIR_E','STAIR_W','STAIR_E_GLASS','STAIR_W_GLASS','LA_E','LA_W','DECOR_POSTERS','DECOR_WALL_COLLAGE','FIX_SIDE_LIGHT_BARS_SCONCES'):
        continue
    if obj.data.users>1:
        obj.data = obj.data.copy()
    for v in obj.data.vertices:
        h, y = v.co.z, v.co.y
        if vip:
            lift = 9.255-h if min(abs(h-6.60),abs(h-8.20))<.002 else (.65 if h>7.5 else .45)
        elif n in roof:
            lift=.55 if h<.30 else 0
        elif n=='WB018_CEIL_BAND_FRONT':
            lift=2.05 if h<7.15 else .65
        elif n.startswith('STAIR_'):
            lift=.45*max(0,min(1,(y-14.46)/5.34)) if h>.005 else 0
        elif n.startswith('ARCH_WALL'):
            lift=.65 if h>5 else (.45 if h>2.5 else 0)
        elif n.startswith('ARCH_') or n.startswith('LA_'):
            lift=(.20 if n.startswith('LA_') else .45) if h>2 else 0
        elif n.startswith('MEP_'):
            lift=.65 if h>=6 else (.45 if h>=2.2 or 'TRAYS' in n else 0)
        else:
            lift=.45 if y>19.5 and h>2.8 else 0
        v.co.z += lift
    obj.data.update()

furniture = ingest('D189-Afterimage-Booths.glb','09 · Booth templates')
fixture = ingest('PDR_Fixtures_D051.glb','10 · Fixture templates')
mirrors = ingest('PDR-D188-Mirror-Balls.glb','11 · Mirror ball templates')
fitted = group('12 · Installed head and mirror assemblies')
native = group('13 · Engine fixtures')
cameras = group('14 · Review cameras')


def inst(source,name,pos):
    obj=bpy.data.objects.new(name,source.data)
    fitted.objects.link(obj)
    obj.location=xyz(pos)
    return obj


def light(name,kind,position,color,intensity,reach=0,width=0,height=0,direction=None,cone=55):
    data=bpy.data.lights.new(name,kind)
    obj=bpy.data.objects.new(name,data)
    native.objects.link(obj)
    obj.location=xyz(position)
    data.color=color
    # Blender watt approximations for editing, native intensities retained independently.
    if kind=='AREA':
        data.shape='RECTANGLE'
        data.size=width
        data.size_y=height
        data.energy=math.pi*width*height*intensity/30
        obj['engine_rect_radiance_scale']=intensity
    else:
        data.energy=4*math.pi*intensity/30
        obj['engine_candela']=intensity
        if kind=='SPOT':
            data.spot_size=math.radians(min(178,2*cone))
            data.spot_blend=.32
    obj['engine_range_m']=reach
    if direction is not None:
        obj.rotation_euler=xyz(direction).to_track_quat('-Z','Y').to_euler()
    return obj


# The runtime uses the same measured reflector strips and canopy opening.
bar_metal=json.loads((ASSETS/'pdr-bar-metal.json').read_text())
for spot in bar_metal['spots']:
    direction=Vector(spot['target'])-Vector(spot['pos'])
    lamp=light('Bar local reflector · '+spot['name'],'SPOT',spot['pos'],spot['color'],spot['intensity'],spot['range'],direction=direction,cone=spot['outer'])
    lamp.data.spot_blend=1-spot['inner']/spot['outer']
for name in bar_metal['canopyParts']:
    obj=bpy.data.objects[name]
    for v in obj.data.vertices:
        v.co.z+=bar_metal['risePerMetre']*(v.co.x-bar_metal['frontX'])
    obj.data.update()
for name,finish in bar_metal['finishes'].items():
    obj=bpy.data.objects[name]
    found=False
    for slot in obj.material_slots:
        if slot.material.name.split('.')[0]!=finish['slot']:continue
        found=True
        variant=slot.material.copy()
        variant.name=finish['slot']+' · bar '+name
        slot.material=variant
        shader=variant.node_tree.nodes.get('Principled BSDF')
        if 'emissiveIntensity' in finish:
            shader.inputs['Emission Strength'].default_value=finish['emissiveIntensity']
        if 'specular' in finish:
            shader.inputs['Specular IOR Level'].default_value=finish['specular']
        if 'normalScale' in finish:
            for node in variant.node_tree.nodes:
                if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=finish['normalScale'][0]
        # Preserve the authored colour/ORM textures underneath the native factors.
        factors_by_socket = {'Base Color':finish['baseColor'][:3],
                             'Roughness':[finish['roughness']]*3,
                             'Metallic':[finish['metallic']]*3}
        if 'emissive' in finish:
            factors_by_socket['Emission Color'] = finish['emissive']
        for socket,factors in factors_by_socket.items():
            inp=shader.inputs[socket]
            if inp.is_linked:
                before=inp.links[0].from_socket
                mul=variant.node_tree.nodes.new('ShaderNodeVectorMath')
                mul.operation='MULTIPLY'
                mul.inputs[1].default_value=factors
                variant.node_tree.links.new(before,mul.inputs[0])
                variant.node_tree.links.new(mul.outputs[0],inp)
            elif inp.type=='RGBA':
                inp.default_value=(*factors,1)
            else:
                inp.default_value=factors[0]
    assert found,(name,finish['slot'])

foyer_plan=json.loads((ASSETS/'pdr-furniture-clearance.json').read_text())['foyer']

def place_booth(code,x,centre,east=False):
    obj=core.objects['BOOTH_'+code]
    dest=Vector((x,-(centre+(-1.30 if east else 1.30)),obj.location.z + (.14 if code.startswith('F') else 0)))
    origin=obj.location.copy()
    for o in (obj,core.objects['DRINK_BOOTH_'+code+'_COUPE'],core.objects['DRINK_BOOTH_'+code+'_TUMBLER']):
        rel=o.location-origin
        if code.startswith('F') and o!=obj:
            rel.x+=foyer_plan['tableShift']
        o.location=dest+rel


for i,z in enumerate(foyer_plan['centres'],1):
    place_booth('F1'+str(i),-13.7,z)
for i,z in enumerate([-23.45,-26.45,-30.35,-33.35,-37.2],1):
    for side,x in [('E',13.7),('W',-13.7)]:
        place_booth('D'+side+str(i),x,z,side=='E')
booths=[]
for obj in core.objects:
    if re.fullmatch('DRINK_BOOTH_[A-Z0-9]+_(COUPE|TUMBLER)',obj.name):
        obj.location.z += .136
    if not re.fullmatch(r'BOOTH_(F[12][123]|D[WE][1-5]|U[WE][1-4])',obj.name):
        continue
    style = {'F':'Foyer','D':'Hall','U':'VIP'}[obj.name[6]]
    obj.data=furniture.objects['Afterimage '+style+' Booth'].data
    lamp_x=1.53+(foyer_plan['tableShift'] if style=='Foyer' else 0)
    p=obj.matrix_basis @ xyz((lamp_x,.910,-1.54))
    light(obj.name+' · Opal table lamp','POINT',[p.x,p.z,-p.y],(1,.58,.30),6 if style=='VIP' else 4,1.45)
    booths.append(obj.name)

for code,x,z in [('E1',5.8,-23.30),('W1',-5.8,-23.30),('E2',9.2,-32.5),('W2',-9.2,-30.85),('E3',8.95,-36.65),('W3',-8.95,-36.05)]:
    name='RTABLE_'+code
    table=core.objects[name]
    origin=table.location.copy()
    dest=Vector((x,-z,origin.z))
    for o in core.objects:
        if o.name==name or o.name=='DRINK_'+name+'_TUMBLER':
            o.location += dest-origin
        elif o.name.startswith(name+'_CHAIR_'):
            delta=o.location-origin
            delta.z=0
            o.location=dest+.76*delta.normalized()
            o.rotation_mode='XYZ'
            o.rotation_euler=(0,0,math.atan2(delta.x,-delta.y))
            o.data=fixture.objects['D051_CAFE_CHAIR'].data

for idx,side in enumerate([-1,1]):
    for part in ('MOUNT','YOKE','HEAD'):
        inst(fixture.objects['D051_LIGHT_'+part],f'Moving head {idx+1} · {part}',(side*2.2,4.82,-39.6))
for code,position in re.findall(r"id:'([^']+)', pos:(\[[^\]]+\])",(ASSETS/'pdr-mirror-balls.ts').read_text()):
    pos=ast.literal_eval(position)
    stage=code=='stage'
    scale=1.25 if stage else 1
    ball=inst(mirrors.objects['D188_Mirror_Ball'],'Mirror · '+code,pos)
    ball.scale=(scale,)*3
    mount=inst(mirrors.objects['D188_Mirror_Mount'],'Mirror mount · '+code,(pos[0],pos[1]+(.34*(1.25-.04) if stage else 0),pos[2]))
    mount.scale=(.7,.7,.04) if stage else (1,1,1)
    light('Mirror projector · '+code,'SPOT',(pos[0],pos[1]-.302*scale,pos[2]),(.75,.9,1) if stage else (.62,.82,1),2150 if stage else 730,11 if stage else 6.1,cone=57 if stage else 47)
for c in (fixture,mirrors,furniture):
    for obj in list(c.objects):
        drop(obj)
    bpy.data.collections.remove(c)

# Blender creates a separate light child for certain glTF nodes; retain their world poses.
bpy.context.view_layer.update()
lighting=(ASSETS/'pdr-forgeax-brand-lighting.ts').read_text()
def rows(key):
    s=lighting.split('const '+key+' =',1)[1].split('\n]);',1)[0]
    return {int(i):v for i,v in re.findall(r'\[(\d+),\s*\{([^}]+)\}\]',s)}
def field(row,key,default):
    match=re.search(r'(?:^|,)\s*'+key+r':\s*(\[[^\]]+\]|[\w.]+)',row)
    if not match:return default
    raw=match[1]
    if raw=='vipLight':return ast.literal_eval(re.search(r'const vipLight: RGB = (\[[^\]]+\])', lighting)[1])
    if raw=='vipStripRadiance':return float(re.search(r'const vipStripRadiance = ([\d.]+)', lighting)[1])
    return ast.literal_eval(raw)
areas,settings=rows('stripSources'),rows('fixtureAdjustments')
for old in list(core.objects):
    m=re.match(r'L(\d\d)_',old.name)
    if not m or old.type!='LIGHT':
        continue
    i=int(m[1])
    name=old.name
    p=old.matrix_world.translation
    pos=[p.x,p.z,-p.y]
    d=old.matrix_world.to_quaternion() @ Vector((0,0,-1))
    direction=(d.x,d.z,-d.y)
    if i in areas:
        row=areas[i]
        q=field(row,'rotation',None)
        if q:
            v=Quaternion((q[3],*q[:3])) @ Vector((0,0,1))
            direction=tuple(v)
        else: direction=(0,-1,0)
        # Original L09–L11 lamp slots now drive roof-mounted strips.
        strip_name = 'L%02d Roof %s' % (i, {9:'west north',10:'east south',11:'east north'}[i]) if i in (9,10,11) else name
        emitter=light(strip_name+' · strip','AREA',field(row,'pos',pos),field(row,'color',[1,.7,.5]),field(row,'intensity',430),
              field(row,'range',18),field(row,'width',.15),field(row,'height',8),direction)
        if q:
            # Native rect local +Z normal and +X tangent, mapped to Blender -Z, +X.
            from mathutils import Matrix
            orientation=Quaternion((q[3],*q[:3]))
            xdir=xyz(orientation @ Vector((1,0,0)))
            zdir=-xyz(orientation @ Vector((0,0,1)))
            emitter.rotation_euler=Matrix((xdir,zdir.cross(xdir),zdir)).transposed().to_euler()
    else:
        row=settings[i]
        col=([1,.79,.53] if i<=3 else [1,.73,.55] if i==13 else [.61,.82,.88] if i<=14 else [.53,.77,.84] if i==18 else [.045,.25,1] if i in (19,20) else [.12,.35,1] if i==21 else [.42,.52,1] if i==24 else [1,.47,.20] if i==25 else [1,.43,.36])
        if i in (23,26):
            col=[1,.64,.36]
        if i in (24,25):
            side=-1 if i==24 else 1
            position=Vector((side*2.2,4.82,-39.6))
            direction=(Vector((side*2.5,.45,-39.35))-position).normalized()
            pos=list(position+.215*direction)
        light(name+' · native',old.data.type,field(row,'pos',pos),col,field(row,'intensity',100),field(row,'range',10),
              direction=field(row,'direction',direction),cone=field(row,'cone',[30,50])[-1])
    drop(old)

# Keep donor fixtures editable, and render the same merged architectural sources
# as the native club. The tabletop points stand in for the engine's local bake.
fixed=json.loads((ASSETS/'pdr-fixed-lighting.json').read_text())
def standing_fixture(identity):
    if isinstance(identity,str):
        return native.objects['Bar local reflector · '+identity]
    return next(o for o in native.objects if o.name.startswith(f'L{identity:02d}'))

for merge in fixed['merges']:
    owner=standing_fixture(merge['owner'])
    lamp=owner.data
    if 'position' in merge:owner.location=xyz(merge['position'])
    if 'direction' in merge:owner.rotation_euler=xyz(merge['direction']).to_track_quat('-Z','Y').to_euler()
    if 'range' in merge:owner['engine_range_m']=merge['range']
    if lamp.type=='AREA':
        if 'height' in merge:lamp.size_y=merge['height']
        owner['engine_rect_radiance_scale']=merge['intensity']
        lamp.energy=math.pi*lamp.size*lamp.size_y*merge['intensity']/30
    else:
        owner['engine_candela']=merge['intensity']
        lamp.energy=4*math.pi*merge['intensity']/30
        if 'outerConeDeg' in merge:
            lamp.spot_size=math.radians(2*merge['outerConeDeg'])
            lamp.spot_blend=1-merge['innerConeDeg']/merge['outerConeDeg']
    for member in merge['members']:
        source=standing_fixture(member)
        source.hide_render=True
        source.data.energy=0
        source['merged_into_engine_slot']=merge['owner']

for key,eye,target in re.findall(r"""'([^']+)':\s*\{\s*["']?eye["']?\s*:\s*(\[[^\]]+\]),\s*["']?target["']?\s*:\s*(\[[^\]]+\])""",(ASSETS/'pdr-observation-bookmarks.ts').read_text()):
    cam=bpy.data.cameras.new(key)
    obj=bpy.data.objects.new('Review · '+key,cam)
    cameras.objects.link(obj)
    cam.lens=20
    cam.clip_start=.05
    obj.location=xyz(ast.literal_eval(eye))
    obj.rotation_euler=(xyz(ast.literal_eval(target))-obj.location).to_track_quat('-Z','Y').to_euler()
# Sightline through the E2 observation pane toward the official plaque.
sight=bpy.data.cameras.new('VIP E2 stage sightline')
view=bpy.data.objects.new('Review · vip-e2-stage-sightline',sight)
cameras.objects.link(view)
view.location=xyz((12.45,5.58,-36.87))
view.rotation_euler=(xyz((0,3.36,-43.51))-view.location).to_track_quat('-Z','Y').to_euler()
sight.lens=23
import sys
sys.dont_write_bytecode=True
sys.path.insert(0,str(OUT))
furniture_clearance = runpy.run_path(str(ASSETS.parent/'art-source/afterimage-booths/place_furniture.py'))
furniture_clearance['apply_furniture_clearance'](scene,ASSETS)
from foyer_refit import install as install_foyer_refit
install_foyer_refit(bpy,ASSETS)
from finishes import install
install(bpy,ASSETS,ingest,group,xyz,drop)
from wall_renewal import apply_wall_renewal
apply_wall_renewal(bpy,ASSETS,ingest,drop)
from hall_fitout_clearance import apply_hall_fitout_clearance
apply_hall_fitout_clearance(bpy,ASSETS)
scene.camera=cameras.objects['Review · redesign-hall']
scene.world=bpy.data.worlds.new('Club ambient')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.31,.34,.38,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.24
scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.resolution_x=1280
scene.render.resolution_y=720
scene.render.resolution_percentage=100
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active
            sp.region_3d.view_perspective='CAMERA'
            sp.overlay.show_overlays=False
            sp.shading.color_type='MATERIAL'
            sp.shading.show_cavity=True
bpy.ops.object.select_all(action='DESELECT')
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.file.pack_all()
counts={c.name:len(c.objects) for c in bpy.data.collections if c.objects}
audit={'booths':sorted(booths),'areas':sum(o.data.type=='AREA' for o in native.objects if o.type=='LIGHT'),
       'nativeLights':len(native.objects),'reviewCameras':len(cameras.objects),'collections':counts,
       'externalImages':[im.name for im in bpy.data.images if im.filepath and not im.packed_file],
       'lighting':'Static review pose. Engine candela and rectangular radiance retained on object properties. Blender watts approximate a 30 lm/W RGB source.'}
assert len(booths)==21 and audit['areas']==16 and not audit['externalImages'],audit
(OUT/'assembly-check.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'D189-Afterimage-Club.blend'),compress=True)
print('AFTERIMAGE ASSEMBLY VERIFIED',audit)
