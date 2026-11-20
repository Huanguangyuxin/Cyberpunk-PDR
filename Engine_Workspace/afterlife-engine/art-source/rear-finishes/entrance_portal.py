"""D189 south entrance, measured against the retained 2.18 m double doors."""
OUTER = 2.66
THROAT = 1.87
HEADER_HEIGHT = 3.80
TILE_HEIGHT = 1.95

def materials():
    import bpy
    import numpy as np

    def metal(name, rgb, roughness, metallic):
        mat=bpy.data.materials.new(name)
        mat.use_nodes=True
        bs=mat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=(*rgb,1)
        bs.inputs['Metallic'].default_value=metallic
        bs.inputs['Roughness'].default_value=roughness
        return mat,bs

    def texture(mat,name,rgb):
        h,w,_=rgb.shape
        image=bpy.data.images.new(name,width=w,height=h,alpha=False)
        rgba=np.ones((h,w,4),dtype=np.float32)
        rgba[:,:,:3]=rgb
        image.pixels.foreach_set(rgba.ravel());image.pack()
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image=image
        return tex.outputs['Color']

    folded,bs=metal('Entrance satin champagne steel',(.42,.29,.19),.36,.76)
    u,v=np.meshgrid(np.linspace(0,1,256),np.linspace(0,1,256))
    # Local indirect return from the inner opal and floor, baked only on
    # this metal fold. The dynamic PBR reflection is retained separately.
    edge=.34*np.exp(-u*6)+.16*np.exp(-((u-.86)/.20)**2)
    ambient=.027+.12*np.exp(-v*14)+.055*np.exp(-(1-v)*10)
    bounce=(ambient+edge*(.37+.63*(1-v)**1.5))[...,None]*np.array([1,.45,.17])
    reflected=texture(folded,'Entrance jamb reflected opal',bounce)
    folded.node_tree.links.new(reflected,bs.inputs['Emission Color'])
    bs.inputs['Emission Strength'].default_value=.80
    head,_=metal('Entrance recessed bronze',(.15,.079,.039),.40,.64)
    leaves,_=metal('Entrance satin door inserts',(.12,.097,.089),.44,.31)
    seal,_=metal('Entrance blackened door returns',(.036,.027,.026),.46,.42)
    steel,bs=metal('Entrance cool architectural sheets',(.31,.32,.34),.45,.58)
    y,x=np.mgrid[0:512,0:512]
    rng=np.random.default_rng(53)
    grain=.028*rng.normal(size=(512,512))+.042*rng.normal(size=(512,1))
    col=np.clip((1+grain[...,None])*np.array([.32,.33,.35]),.22,.42)
    tex=texture(steel,'Entrance brushed sheet grain',col)
    steel.node_tree.links.new(tex,bs.inputs['Base Color'])
    steel.node_tree.links.new(tex,bs.inputs['Emission Color'])
    bs.inputs['Emission Strength'].default_value=.12
    return folded,head,leaves,seal,steel

def install(box,cut_face,mats,opal,pewter):
    folded,head,leaf,seal,_=mats
    def sheet(group,mat,front):
        # Blender +Y points into the room. The physical skin is folded from
        # 15 mm plate; inner channels are separate with actual visible depth.
        a,b,c=front[:3]
        if (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])<0:
            front=list(reversed(front))
        cut_face(group,mat,front,[(x,y-.015,h) for x,y,h in front],.002)
    for sign in (-1,1):
        outer,inner=sign*OUTER,sign*THROAT
        sheet('Entry folded portal',folded,[(outer,.405,.012),(inner,.155,.012),
              (inner,.155,3.16),(outer,.405,HEADER_HEIGHT)])
        # Outer turn closes the step where it meets the graphite wall finish.
        cut_face('Entry outer wall returns',head,
                 [(outer,.405,.012),(outer,.095,.012),(outer,.095,HEADER_HEIGHT),(outer,.405,HEADER_HEIGHT)],
                 [(outer-sign*.013,.405,.012),(outer-sign*.013,.095,.012),(outer-sign*.013,.095,HEADER_HEIGHT),(outer-sign*.013,.405,HEADER_HEIGHT)],.002)
        # Opposed folds on the deep inner wall flank a recessed warm strip.
        box('Entry diffuser channel',head,(sign*1.754,1.52,-.082),(.218,3.03,.127),.003)
        box('Entry portal reveal',opal,(sign*1.691,1.30,-.148),(.071,2.48,.008),.003)
        box('Entry charcoal side pockets',seal,(sign*1.419,1.36,-.044),(.436,2.70,.110),.003)
        # Slim black louvers catch light from the adjacent vertical diffuser.
        for i in range(21):
            box('Entry side return fins',head,(sign*1.419,.16+i*.117,-.104),(.386,.015,.014),.0015)
        # Reface both sides of the existing glass-backed leaves. The original
        # four through-bolted pull handles protrude past both new finish faces.
        for z,side in ((.129,-1),(.171,1)):
            box('Entry satin door leaf inserts',leaf,(sign*.55,1.395,z),(.992,2.39,.010),.003)
            for h in (.913,1.487):
                box('Entry pull fixing plates',pewter,(sign*.128,h,z+side*.008),(.046,.053,.010),.003)
            box('Entry meeting stile',seal,(sign*.026,1.345,z+side*.004),(.023,2.624,.012),.002)
    sheet('Entry upper mitre',folded,[(-OUTER,.405,HEADER_HEIGHT),(OUTER,.405,HEADER_HEIGHT),
          (THROAT,.155,3.16),(-THROAT,.155,3.16)])
    # Two anchors to the letters and one to the outline. Each spacer starts
    # on the physical canted sheet and meets the back of the raised lettering.
    for x,h in ((1.195,3.674),(.498,3.362),(-1.218,3.367)):
        start=.155+.25*(h-3.16)/(HEADER_HEIGHT-3.16)
        end=.442
        box('Entry sign mounting pegs',seal,(x,h,-(start+end)/2),
            (.016,.016,end-start),.002)
    # Face of sign sits on the upper canted fold; immediately below it, a
    # set-back bronze header spans both inner pockets and the door closer.
    box('Entry portal head',head,(0,2.978,-.070),(3.736,.35,.135),.004)
    box('Entry portal head reveal',pewter,(0,2.79,-.064),(3.736,.026,.139),.003)
    box('Entry closer housing',seal,(0,2.752,-.025),(2.35,.045,.12),.003)
    box('Entry bronze threshold',head,(0,.009,-.007),(2.27,.014,.207),.002)

def folded_uv(group,x,h):
    if group=='Entry upper mitre':
        return ((h-3.16)/(HEADER_HEIGHT-3.16),min(1,abs(x)/OUTER))
    return ((abs(x)-THROAT)/(OUTER-THROAT),h/HEADER_HEIGHT)
