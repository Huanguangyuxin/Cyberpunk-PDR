"""Service equipment and indirect lighting behind the D189 foyer bar, in metres."""
from collections import defaultdict
import math
from pathlib import Path

import bpy


def surface(name, rgb, roughness, metal=0, alpha=1, glow=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = 'BLENDED'
    if glow:
        bs.inputs['Emission Color'].default_value = (*rgb, 1)
        bs.inputs['Emission Strength'].default_value = glow
    return mat


def install(box, groups):
    chrome = surface('Service polished steel', (.60, .64, .69), .19, .91)
    copper = surface('Service burnished bronze', (.47, .26, .105), .30, .78)
    rubber = surface('Service draining rubber', (.028, .028, .032), .70)
    glass = surface('Service pressed crystal', (.75, .87, .88), .13, .08, .40)
    lip = surface('Service crystal rolled lip', (.71, .80, .81), .16, .10, .69)
    diffuser = surface('Shelf honey opal diffuser', (1.00, .54, .235), .38, .02, glow=1.55)
    lining = surface('Shelf oiled bronze reveal', (.082, .059, .038), .44, .68)
    back = surface('Shelf amber brushed reflector', (.074, .048, .030), .53, .42)
    # A local irradiance map on the rear reflector gives each shelf a soft
    # downward falloff. Bottle faces still receive the two original area lights.
    img = bpy.data.images.load(str(Path(__file__).with_name('maps')/'service-reflector.png'))
    bs = back.node_tree.nodes.get('Principled BSDF')
    tex = back.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    back.node_tree.links.new(tex.outputs['Color'], bs.inputs['Emission Color'])
    bs.inputs['Emission Strength'].default_value = 1.18

    # Small meshes batch by fixture and material. Vertex coordinates are Blender
    # X, Y towards stage, Z up; box() receives engine X, height, -Y.
    batch = defaultdict(lambda: ([], [], [], []))
    def face(group, mat, pts, uvs, smooth=False):
        vertices, faces, uv, shading = batch[group, mat]
        start = len(vertices)
        vertices.extend(pts)
        faces.append(tuple(range(start, start+len(pts))))
        uv.append(uvs)
        shading.append(smooth)

    def turned(group, mat, x, y, z, profile, sides=24):
        # Radius/height profile traces the outside upwards, then down the inside.
        # Bottom disks are triangle fans with radial UVs and no repeated pole.
        for j, ((r0, h0), (r1, h1)) in enumerate(zip(profile, profile[1:])):
            for i in range(sides):
                a, b = math.tau*i/sides, math.tau*(i+1)/sides
                def point(r, h, a):return (x+r*math.cos(a), y+r*math.sin(a), z+h)
                def disk(a):return (.5+.48*math.cos(a), .5+.48*math.sin(a))
                if r0 == 0:
                    face(group,mat,[point(0,h0,a),point(r1,h1,b),point(r1,h1,a)],[(.5,.5),disk(b),disk(a)])
                elif r1 == 0:
                    face(group,mat,[point(r0,h0,a),point(r0,h0,b),point(0,h1,b)],[disk(a),disk(b),(.5,.5)])
                else:
                    pts=[point(r0,h0,a),point(r0,h0,b),point(r1,h1,b),point(r1,h1,a)]
                    face(group,mat,pts,[(i/sides,j),( (i+1)/sides,j),((i+1)/sides,j+1),(i/sides,j+1)],True)

    def rail(name, mat, x, y, z, dx, dy, dz, r=.002):
        box(name, mat, (x,z,-y), (dx,dz,dy), r)

    for bay in range(4):
        y0, y1 = 5.225 + 2.1*bay, 7.275 + 2.1*bay
        for tier, (bottom, top) in enumerate(((.98,1.31),(1.34,1.71),(1.74,2.09),(2.12,2.42))):
            # An atlas row belongs to one actual niche cell, including the dim
            # unstocked service shelf. Each cell has its own lamp-end shadows.
            row=bay*4+tier
            height_px=2048
            v0=(row*128+.5)/height_px
            v1=((row+1)*128-.5)/height_px
            # Existing bottles occupy the floor of each recess. A reflector
            # sits 2 mm proud of the old opaque backing, over 13 cm behind stock.
            face('Shelf recessed amber reflectors',back,
                 [(13.828,y1,bottom),(13.828,y0,bottom),(13.828,y0,top),(13.828,y1,top)],
                 [(1,v0),(0,v0),(0,v1),(1,v1)])
            mid=(y0+y1)/2
            width=y1-y0
            # Deepened front lip conceals the old exposed source and the new
            # downward-facing lamp. The top return attaches to the original shelf.
            rail('Shelf forward shadow lips',lining,13.375,mid,top+.002,.058,width-.008,.044)
            rail('Shelf narrow bronze hems',copper,13.345,mid,top+.020,.006,width-.015,.005,.001)
            rail('Shelf shielded coves',lining,13.701,mid,top-.005,.087,width-.15,.010,.001)
            rail('Shelf honey opal feeds',diffuser,13.711,mid,top-.011,.046,width-.21,.004,.0007)
        # Folded end cheeks sit ahead of the stock, widening the dark return at
        # every bay boundary without moving the original load-bearing uprights.
        for edge,sign in ((y0,1),(y1,-1)):
            rail('Shelf folded jambs',lining,13.411,edge+sign*.022,1.705,.102,.044,1.47,.004)
    # Cold work tools occupy a small dry patch on the inner half of the top.
    # The old cocktail presentation and POS are left clear on both sides.
    def tray(name, x,y, z, w,d):
        rail(name+' catch pan',chrome,x,y,z+.004,w,d,.008)
        for side in (-1,1):
            rail(name+' raised lips',chrome,x+side*(w/2-.003),y,z+.011,.006,d,.016)
            rail(name+' raised lips',chrome,x,y+side*(d/2-.003),z+.011,w-.015,.006,.016)
        rail(name+' drainage bed',rubber,x,y,z+.010,w-.025,d-.024,.004,.001)
        return z+.012

    z=tray('Cocktail assembly',10.747,8.025,1.107,.36,.65)
    shaker=[(0,0),(.034,0),(.039,.005),(.041,.038),(.052,.164),(.052,.177),
            (.047,.181),(.046,.19),(.031,.209),(.025,.216),(.025,.238),(.022,.245),(0,.245)]
    turned('Shaker service',chrome,10.709,7.883,z,shaker)
    turned('Shaker service',chrome,10.806,8.012,z,[(r*.83,h*.86) for r,h in shaker])
    turned('Shaker measuring cups',copper,10.693,8.161,z,
           [(0,0),(.034,0),(.034,.004),(.012,.051),(.018,.071),(.035,.114),(.035,.117),(.032,.117),(.009,.055),(0,.052)])
    turned('Shaker mixing tin',chrome,10.819,7.827,z,
           [(0,0),(.028,0),(.032,.005),(.042,.125),(.042,.131),(.039,.131),(.028,.006),(0,.006)])
    # Staging rack on the short return, and three ready-to-pour coupes on the
    # inside of the long run. All feet rest on a pan or finished countertop.
    z=tray('Pass glass rack',12.05,4.30,1.107,.79,.34)
    for i in range(6):
        for j in range(2):
            x,y=11.758+.117*i,4.231+.135*j
            profile=[(0,0),(.032,0),(.036,.006),(.038,.072),(.039,.083),(.037,.084),(.034,.074),(.031,.012),(0,.012)]
            turned('Pass low tumblers',glass,x,y,z,profile,16)
            turned('Crystal service rims',lip,x,y,z,[(.0383,.078),(.040,.082),(.039,.085),(.037,.084)],24)
    z=tray('Stemware pass',10.755,10.966,1.107,.32,.51)
    for x,y in [(10.688,10.841),(10.816,10.970),(10.688,11.092)]:
        profile=[(0,0),(.031,0),(.034,.003),(.030,.006),(.006,.011),(.004,.066),(.011,.078),
                 (.036,.088),(.052,.108),(.055,.123),(.054,.127),(.051,.127),(.049,.111),(.034,.093),(.009,.083),(0,.081)]
        turned('Service coupe glasses',glass,x,y,z,profile,28)
        turned('Crystal service rims',lip,x,y,z,[(.054,.121),(.055,.125),(.054,.128),(.052,.127)],28)
    # Under-counter service surface is measured at 0.900m. Two bitters bottles
    # live on its actual edge by the bartender, away from the public glass rack.
    for i,(x,y) in enumerate(((11.36,6.32),(11.45,6.42))):
        turned('Service aromatic flasks',copper,x,y,.9,[(0,0),(.031,0),(.033,.009),(.034,.09),(.027,.104),(.012,.115),(.010,.129),(0,.129)],16)
        turned('Service aromatic dashers',chrome,x,y,1.029,[(0,0),(.011,0),(.011,.012),(.006,.018),(.004,.032),(0,.032)],16)

    for (name,mat), (verts, polys, coords, smooth) in batch.items():
        mesh=bpy.data.meshes.new(name)
        # Share vertices across the angular segments of each turned body so the
        # metal highlights flow around it, while each polygon retains its UV seam.
        points=[]
        indices={}
        for i, point in enumerate(verts):
            key=tuple(round(v,8) for v in point)
            if key not in indices:
                indices[key]=len(points)
                points.append(point)
            verts[i]=indices[key]
        mesh.from_pydata(points,[],[tuple(verts[i] for i in p) for p in polys])
        mesh.materials.append(mat)
        uv=mesh.uv_layers.new(name='Service finish')
        for poly, corners, shading in zip(mesh.polygons,coords,smooth):
            poly.use_smooth=shading
            for loop, pair in zip(poly.loop_indices,corners):
                uv.data[loop].uv=pair
        mesh.update()
        obj=bpy.data.objects.new(name,mesh)
        bpy.context.scene.collection.objects.link(obj)
