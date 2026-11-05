"""User D048: replace upstairs now; resource-preserving GLB assembly, no acceptance suite."""
from pathlib import Path
import json,struct,hashlib,copy,re
P=Path(__file__).resolve().parents[1];R=P/'Runtime_Integration_014';G=P/'Engine_Workspace/afterlife-engine'
base=R/'rollback/D048-before/old-runtime-model/Club_NewLayout_R8_c4f5dc68.glb';wb=P/'Production_WorkBuddy_015/exports/club-workbuddy015-upper-final.glb'
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
docs=[read(base),read(wb)]
backup=R/'rollback/D048-before';backup.mkdir(parents=True,exist_ok=True)
for rel in ['forge.json','assets/pdr-newlayout.pack.ts','assets/pdr-glass-guards.ts','assets/pdr-other-screens.ts','assets/pdr-newlayout-collision-names.ts','assets/pdr-newlayout-lighting.ts','assets/pdr-dance-floor-mist.ts']:
 q=G/rel;t=backup/rel;t.parent.mkdir(parents=True,exist_ok=True)
 if not t.exists():t.write_bytes(q.read_bytes())
frozen=R/'D048-input';frozen.mkdir(exist_ok=True)
if not (frozen/wb.name).exists():(frozen/wb.name).write_bytes(wb.read_bytes())
out={'asset':{'version':'2.0','generator':'Codex D048 selective upstairs assembly; R8 ground + WB015 r4 upper'},'scene':0,'scenes':[{'name':'Cyberpunk-current-ground-WB015-upper','nodes':[]}], 'buffers':[{}]}
blob=bytearray();maps={};image_hash={};selection=[]
def cp(k,d,i):
 key=(d,k,i)
 if key in maps:return maps[key]
 j,raw=docs[d];v=copy.deepcopy(j[k][i]);
 if d==1 and k in ('meshes','materials','images','textures'):v['name']='WB015_'+v.get('name',f'{k}_{i}')
 if k=='samplers':v['name']=f'Sampler_{d}_{i}'
 arr=out.setdefault(k,[]);idx=len(arr);arr.append({});maps[key]=idx
 if k=='bufferViews':
  start=v.get('byteOffset',0);data=raw[start:start+v['byteLength']];blob.extend(b'\0'*((-len(blob))%4));v['byteOffset']=len(blob);v['buffer']=0;blob.extend(data)
 elif k=='accessors':
  if 'bufferView' in v:v['bufferView']=cp('bufferViews',d,v['bufferView'])
  if 'sparse' in v:
   for s in ['indices','values']:v['sparse'][s]['bufferView']=cp('bufferViews',d,v['sparse'][s]['bufferView'])
 elif k=='images':
  if 'bufferView'in v:
   bv=j['bufferViews'][v['bufferView']];start=bv.get('byteOffset',0);sig=(v.get('mimeType'),hashlib.sha256(raw[start:start+bv['byteLength']]).hexdigest())
   if sig in image_hash:
    arr.pop();maps[key]=image_hash[sig];return maps[key]
   image_hash[sig]=idx;v['bufferView']=cp('bufferViews',d,v['bufferView'])
 elif k=='textures':
  if 'source'in v:v['source']=cp('images',d,v['source'])
  if 'sampler'in v:v['sampler']=cp('samplers',d,v['sampler'])
  for x in v.get('extensions',{}).values():
   if isinstance(x,dict) and 'source'in x:x['source']=cp('images',d,x['source'])
 elif k=='materials':
  spec=v.get('extensions',{}).get('KHR_materials_specular',{})
  if 'specularColorFactor'in spec:spec['specularColorFactor']=[min(1.,max(0.,x)) for x in spec['specularColorFactor']]
  def textures(x):
   if isinstance(x,dict):
    for name,value in x.items():
     if name.lower().endswith('texture') and isinstance(value,dict) and 'index'in value:value['index']=cp('textures',d,value['index'])
     else:textures(value)
   elif isinstance(x,list):
    for value in x:textures(value)
  textures(v)
 elif k=='meshes':
  for pr in v['primitives']:
   pr['attributes']={a:cp('accessors',d,n) for a,n in pr['attributes'].items()}
   if 'indices'in pr:pr['indices']=cp('accessors',d,pr['indices'])
   if 'material'in pr:pr['material']=cp('materials',d,pr['material'])
   for target in pr.get('targets',[]):
    for name,a in target.items():target[name]=cp('accessors',d,a)
 elif k=='nodes':
  if 'mesh'in v:v['mesh']=cp('meshes',d,v['mesh'])
  if 'camera'in v:v['camera']=cp('cameras',d,v['camera'])
  if 'children'in v:v['children']=[cp('nodes',d,n) for n in v['children']]
  light=v.get('extensions',{}).get('KHR_lights_punctual')
  if light:
   ls=out.setdefault('extensions',{}).setdefault('KHR_lights_punctual',{}).setdefault('lights',[])
   val=copy.deepcopy(j['extensions']['KHR_lights_punctual']['lights'][light['light']]);val['range']=val.get('range',18 if val['type']=='spot' else 12);light['light']=len(ls);ls.append(val)
   renames={'L31_VIP_W2':'L15_VIP_W2','L32_VIP_E2':'L28_VIP_E2'}
   v['name']=renames.get(v.get('name'),v.get('name'));val['name']=v['name']
  if d==0 and v.get('name') in ['L31_GAL_W','L32_GAL_E']:
   v['translation']=[-9.45 if v['name']=='L31_GAL_W' else 9.45,7.3,-31]
 arr[idx]=v;return idx
shared={'ARCH_UPPER_DECK','ARCH_DECK_BEAMS_FASCIA','ARCH_ROOF_SLAB','ARCH_ROOF_BEAMS','ARCH_WALLS_WEN','ARCH_WALL_SOUTH','LA_E','LA_W','DECOR_PLANT_12','DECOR_PLANT_13','STAIR_E','STAIR_W','RAIL_BRIDGE_NORTH','RAIL_DECK_SOUTH','RAIL_GAL_E','RAIL_GAL_W','CAM06_GALLERY_WEST','CAM07_GALLERY_EAST'}
def upper(n):
 return n in shared or n.startswith(('VIP_','BOOTH_UE','BOOTH_UW','DRINK_BOOTH_UE','DRINK_BOOTH_UW','ARCH_COLUMNS_WB015','FIX_ROOF_LIGHT_BANDS','STAIR_E_GLASS','STAIR_W_GLASS','CEIL_L_','MEP_','WPANEL_UE','WPANEL_UW','CAM_VIP_','CAM10_','CAM11_','CAM16_','CAM17_'))
old_lights={'L15_ENTRY','L16_UPLIGHT_W','L17_UPLIGHT_E','L28_GAL_W_SOUTH'}
ceiling_lights={'L12_CEIL_L_01','L13_CEIL_L_02','L14_CEIL_L_03','L19_CEIL_L_04','L20_CEIL_L_05','L21_CEIL_L_06'}
new_lights={'L16_VIP_W1','L17_VIP_E1','L31_VIP_W2','L32_VIP_E2'}
for d,(j,raw) in enumerate(docs):
 for i in j['scenes'][j.get('scene',0)]['nodes']:
  name=j['nodes'][i].get('name','')
  take=(not upper(name) and name not in old_lights|ceiling_lights) if d==0 else (upper(name) or name in ceiling_lights|new_lights)
  if take:out['scenes'][0]['nodes'].append(cp('nodes',d,i));selection.append({'source':'R8' if d==0 else 'WB015-r4','name':name})
out['extensionsUsed']=sorted(set(docs[0][0].get('extensionsUsed',[])+docs[1][0].get('extensionsUsed',[])))
out['buffers'][0]['byteLength']=len(blob);blob.extend(b'\0'*((-len(blob))%4));js=json.dumps(out,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
data=struct.pack('<III',0x46546c67,2,28+len(js)+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
h=hashlib.sha256(data).hexdigest();dest=G/'assets'/f'Club_Upper_WB015_{h[:8]}.glb';dest.write_bytes(data)
def solid(n):return not n.startswith(('DRINK_','CALIB','DECOR_POSTERS','DECOR_STICKERS','DECOR_WALL_COLLAGE','DECOR_COMPOSED_WALLS','DECOR_BIG_POSTERS')) and not any(x in n for x in ['_LIQUID','_LABEL','_ICE_'])
names=[x['name'] for x in out['nodes'] if 'mesh'in x and solid(x['name'])]
(G/'assets/pdr-newlayout-collision-names.ts').write_text('export const collisionSourceNames:readonly string[]='+json.dumps(names)+';\n')
archive=backup/'old-runtime-model'
receipt={'author':'Codex D048 selective integration, not a validation report','base_sha':hashlib.sha256((archive/base.name).read_bytes()).hexdigest(),'wb_source_sha':hashlib.sha256(wb.read_bytes()).hexdigest(),'output':str(dest),'sha256':h,'bytes':len(data),'selection':selection,'native_lights':len(out['extensions']['KHR_lights_punctual']['lights']),'collision_names':len(names),'user_requested_no_more_tests':True,'old_source_retained':str(archive),'new_upper_acceptance':'not claimed; user explicitly requested direct replacement'}
(R/'D048-integration.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k!='selection'},ensure_ascii=False))
