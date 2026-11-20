"""Apply the same engine-world root offsets to the editable Blender assembly."""
import json
from mathutils import Vector

def apply_furniture_clearance(scene,assets):
    spec=json.loads((assets/'pdr-furniture-clearance.json').read_text())
    for group in spec['groups']:
        x,y,z=group['delta']
        delta=Vector((x,-z,y))
        for name in group['roots']:
            scene.objects[name].location+=delta
            if name.startswith('BOOTH_U'):
                # The area-independent bulb was created before final furniture placement.
                scene.objects[name+' · Opal table lamp'].location+=delta+Vector((0,0,spec['vipTableRise']))
