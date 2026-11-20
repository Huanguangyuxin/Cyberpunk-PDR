"""Architectural terminations on both upper landings and the front bridge."""
def install(box, steel, graphite, pewter, basalt):
    # End walls of the two first VIP rooms: their foyer-facing planes are
    # Z=-23.14 and the outside walls are X=+/-14. Trim finishes meet at X=13.88.
    for sign in (-1, 1):
        x = sign * 13.935
        outer_length = 3.303
        outer_mid = -21.4455
        # Continuous black stone plinth with a separate 18 mm metal cap.
        box('Landing basalt skirting', basalt, (x,3.741,outer_mid),
            (.105,.182,outer_length),.0025)
        box('Landing folded cap', pewter, (x,3.841,outer_mid),
            (.112,.018,outer_length),.002)
        box('Landing basalt skirting', basalt, (sign*12.18,3.741,-23.115),
            (3.408,.182,.047),.0025)
        box('Landing folded cap', pewter, (sign*12.18,3.841,-23.113),
            (3.408,.018,.053),.002)
        # Continue the sheet metal cladding over the exposed ends. The veined
        # lower course forms the kick plate. Shallow shadow gaps show the shell.
        for i in range(3):
            z = outer_mid + (i-1)*outer_length/3
            for j in range(4):
                lo,hi = (3.85,4.47) if j==0 else (4.47+(j-1)*1.572,4.47+j*1.572)
                box('Landing end wall panels', graphite, (sign*13.916,(lo+hi)/2,z),
                    (.037,hi-lo-.009,outer_length/3-.008),.002)
        # The VIP return now has a finished base and a shallow framed lower
        # wall rather than a blank extrusion rising straight from the tiles.
        for i in range(3):
            xx=10.49+(i+.5)*3.39/3
            box('Landing end wall panels',graphite,(sign*xx,4.16,-23.125),
                (3.39/3-.009,.61,.022),.002)
        # Cover the slab-to-flag height change with a cut threshold. Its top
        # inclines from the 3.65 m deck to the 3.667 m finished flag surface.
        # The lower side is open; it cannot double the original slab top.
        import bpy
        verts,faces=[],[]
        for a,b in [(8.34,10.48),(10.486,12.56),(12.566,13.87)]:
            i=len(verts)
            verts += [(sign*a,22.39,3.651),(sign*b,22.39,3.651),
                      (sign*b,22.66,3.666),(sign*a,22.66,3.666)]
            faces.append(tuple(i+k for k in ((0,1,2,3) if sign==1 else (3,2,1,0))))
        mesh=bpy.data.meshes.new('Landing threshold stones');mesh.from_pydata(verts,[],faces)
        ob=bpy.data.objects.new('Landing threshold east' if sign>0 else 'Landing threshold west',mesh)
        bpy.context.scene.collection.objects.link(ob);mesh.materials.append(basalt)
        uv=mesh.uv_layers.new(name='Meter');mesh.update()
        for loop in mesh.loops:
            w=verts[loop.vertex_index];uv.data[loop.index].uv=(w[0],w[1])
    # Four joists bear on the measured 900 mm pylons (top 3.000); the two
    # centre joists also bear on the portal piers (top 3.130). The web and
    # flanges terminate at the existing front and rear transverse beam faces.
    for x in (-8,-4.2,4.2,8):
        box('Bridge column bearing',steel,(x,3.052,-21.2),(.66,.104,.74),.004)
        box('Bridge column bearing cap',pewter,(x,3.117,-21.2),(.69,.026,.76),.002)
        for level in (3.143,3.337):
            box('Bridge joist flanges',steel,(x,level,-21.2),(.55,.026,2.30),.003)
        box('Bridge supporting webs',steel,(x,3.24,-21.2),(.082,.168,2.30),.002)
