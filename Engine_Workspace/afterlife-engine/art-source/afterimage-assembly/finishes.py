"""Native finish bindings and visible stair/soffit geometry from the frozen D189 pack."""
def bind_foyer_finishes(bpy):
    def multiply_texture(material,socket_name,factor):
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        socket = nodes.get('Principled BSDF').inputs[socket_name]
        source = socket.links[0].from_socket
        multiply = nodes.new('ShaderNodeVectorMath')
        multiply.operation = 'MULTIPLY'
        multiply.label = 'ForgeAX · base colour factor'
        multiply.inputs[1].default_value = factor
        links.new(source,multiply.inputs[0])
        links.new(multiply.outputs[0],socket)

    stone = bpy.data.materials['Rear terrazzo']
    normal = next(n for n in stone.node_tree.nodes if n.type=='NORMAL_MAP')
    normal.inputs['Strength'].default_value = .46
    multiply_texture(stone,'Base Color',(.32,.30,.31))

    brick = bpy.data.materials['Rear garnet'].copy()
    brick.name = 'Rear garnet · iron-red bar apron'
    multiply_texture(brick,'Base Color',(.42,.63,.50))
    brick.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value = .34
    apron = bpy.data.objects['Garnet glazed running bond']
    apron.data.materials.append(brick)
    index = len(apron.data.materials)-1
    # The GLB groups the wall skirt, entrance bricks and bar ribbons together.
    for face in apron.data.polygons:
        point = apron.matrix_world @ face.center
        if point.x>7 and point.z<.02:
            face.material_index = index
    assert sum(f.material_index==index for f in apron.data.polygons)==696


def install(bpy, assets, ingest, group, xyz, drop):
    for file in ('PDR-D181-Wall-Finishes.glb', 'PDR-D186-Floor-Detail.glb'):
        library=ingest(file,'Material donor')
        for obj in list(library.objects):
            drop(obj)
        bpy.data.collections.remove(library)
    mat=bpy.data.materials
    bind_foyer_finishes(bpy)
    steel=mat['D180_T1_DarkBrushedSteel']
    tile=mat['D181_W2_SatinGraphiteTile']
    tread=mat['D180_F3_WornTreadPlate']
    dry=mat['D186_Floor_Basalt']
    ceramic=mat['D186_Floor_Ceramic']
    acoustic=mat['D180_W1_GraphiteAcousticRib']
    perf=mat['D180_W1b_BlackAnodizedPerf']
    observation=mat.new('Gallery observation glass · clear Fresnel')
    observation.use_nodes=True
    nodes=observation.node_tree.nodes
    links=observation.node_tree.links
    nodes.remove(nodes.get('Principled BSDF'))
    clear=nodes.new('ShaderNodeBsdfTransparent')
    gloss=nodes.new('ShaderNodeBsdfGlossy')
    gloss.inputs['Roughness'].default_value=.025
    fresnel=nodes.new('ShaderNodeFresnel')
    fresnel.inputs['IOR'].default_value=1.5
    mix=nodes.new('ShaderNodeMixShader')
    links.new(fresnel.outputs[0],mix.inputs[0])
    links.new(clear.outputs[0],mix.inputs[1])
    links.new(gloss.outputs[0],mix.inputs[2])
    # The engine culls the interior face of each pane; keep one interface per ray.
    backface=nodes.new('ShaderNodeNewGeometry')
    sided=nodes.new('ShaderNodeMixShader')
    links.new(backface.outputs['Backfacing'],sided.inputs[0])
    links.new(mix.outputs[0],sided.inputs[1])
    links.new(clear.outputs[0],sided.inputs[2])
    links.new(sided.outputs[0],nodes['Material Output'].inputs['Surface'])
    for obj in bpy.data.objects:
        if obj.type!='MESH':
            continue
        n=obj.name
        for slot in obj.material_slots:
            source=slot.name.split('.')[0]
            binding=None
            if n in ('ARCH_FLOOR_SLAB','ARCH_FLOOR_PATCHES','ARCH_UPPER_DECK') and source.endswith('M_FLOOR_TILE'):
                binding=dry
            elif n=='ARCH_DANCE_FLOOR' and source.endswith('M_DANCE_TILE'):
                binding=ceramic
            elif n in ('ARCH_WALL_SOUTH','ARCH_WALLS_WEN') and source.endswith('M_WALL_NAVY'):
                binding=tile
            elif n in ('STAIR_E','STAIR_W') and source=='WB015_M_STEP_LED':
                binding=mat['Warm recessed marker']
            elif n in ('STAIR_E','STAIR_W','STAGE_PLATFORM_DJ') and 'COATED_STEEL' in source:
                binding=steel if 'WALL_NAVY' in source else (dry if n.startswith('STAIR_') else tread)
            elif n in ('STAIR_E','STAIR_W','STAGE_PLATFORM_DJ','ARCH_PYLONS','ARCH_COLUMNS','ARCH_COLUMNS_WB015','ARCH_DECK_BEAMS_FASCIA','ARCH_SKIRTING'):
                if source.endswith(('STEEL_BLACK','M_WALL_NAVY','M_STEEL_NAVY')):
                    binding=acoustic if n=='STAGE_PLATFORM_DJ' and source=='M_STEEL_NAVY' else steel
                elif n=='STAGE_PLATFORM_DJ' and source=='M_PERF_STEEL':
                    binding=perf
            elif n.startswith('VIP_') and n.endswith('_SHELL'):
                binding={'WB015_M_GLASS_DOOR':observation,'WB015_M_DANCE_TILE':dry,'WB015_M_WALL_NAVY':tile,'WB015_M_STEEL_NAVY':steel,
                         'WB015_M_PLINTH_PINK':steel,'WB015_M_FRAME_PINK':steel,'WB015_M_LEATHER_WINE':acoustic}.get(source)
            if binding:
                slot.material=binding
    for obj in list(bpy.data.objects):
        if obj.name.startswith('DECOR_PLANT_') and obj.location.z<1:
            drop(obj)
    details=group('15 · Fabricated soffits and stair supports')
    def box(name,pos,dims,material):
        bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(pos))
        obj=bpy.context.object
        obj.name=name
        obj.dimensions=(dims[0],dims[2],dims[1])
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        details.objects.link(obj)
        obj.data.materials.append(material)
    def diffuser(name,color):
        material=mat.new(name)
        material.use_nodes=True
        node=material.node_tree.nodes.get('Principled BSDF')
        node.inputs['Base Color'].default_value=(*color,1)
        node.inputs['Emission Color'].default_value=(*color,1)
        node.inputs['Emission Strength'].default_value=2.5
        return material
    amber=diffuser('Soffit · warm opal',(1,.48,.21))
    cool=diffuser('Soffit · pale honey opal',(1,.76,.55))
    def mounted(name,pos,dims,material):
        x,y,z=pos
        w,t,l=dims
        box(name+' · steel channel',(x,y+t/2-.016,z),(w+.032,.032,l+.032),steel)
        box(name,(x,y-.032,z),dims,material)
    blue=diffuser('Dance rail · collimator optic',(.09,.38,1))
    for i,(x,z) in enumerate([(5,-26.5),(-6,-31.5),(3.5,-35)]):
        box(f'Dance optic bezel {i}',(x,8.577,z),(.17,.038,.17),steel)
        box(f'Dance optic lens {i}',(x,8.554,z),(.115,.008,.115),blue)
    for i,z in enumerate([-2.75,-8.25,-13.75,-19.25]):
        mounted(f'Transverse roof light {i}',(0,8.594,z),(26.8,.012,.12),[cool,amber][i%2])
    for i,x in enumerate((-13.6,-11.2,-8.,8.,11.2,13.6)):
        mounted(f'Roof strip {i}',(x,9.243,-10.5),(.15,.014,17.6),[amber,cool][i%2])
    for z in (-20.65,-21.75):
        mounted(f'Bridge strip {z}',(0,3.344,z),(16,.012,.14),cool)
    for z in (-19.92,-22.48):
        mounted(f'Bridge beam {z}',(0,2.994,z),(16,.012,.11),amber if z==-19.92 else cool)
    for i,(z0,z1) in enumerate([(-26.65,-22.75),(-32.25,-27.15),(-37.85,-32.75),(-43.45,-38.35)]):
        for side in (-1,1):
            mid=(z0+z1)/2
            for x,dims,m in [(9.475,(.14,.012,z1-z0),cool),(12.15,(.14,.012,z1-z0),amber)]:
                mounted(f'Gallery strip {i} {side*x}',(side*x,3.344,mid),dims,m)
    for side in (-1,1):
        mounted(f'Gallery edge strip {side}',(side*8.425,2.994,-33.2),(.11,.012,21.),amber)
        for k in range(19):
            z=-14.62-k*.28
            lift=.45*max(0,min(1,(-14.46-z)/5.34))
            top=(k+1)*.16+lift
            h=max(.16,top-(k*.16+lift*k/19)+.02)
            x=side*13.30
            box(f'Stair riser {side} {k}',(x,top-h*.5,z),(1.38,h,.29),steel)
            if k>=2 and k%2==0:
                h=k*.16+lift
                box(f'Stair support {side} {k}',(x,h*.5,z),(1.36,h,.56),steel)
