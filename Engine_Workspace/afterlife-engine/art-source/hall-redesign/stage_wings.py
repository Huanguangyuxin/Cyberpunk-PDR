"""Fabricated stage blades and steady sapphire slots. Dimensions are engine metres."""
import numpy as np

# bottom centre, upper centre, foot, nominal crown, finished widths, depth
BLADES = ((3.80,3.14,.525,5.60,1.03,1.44,-42.92),
          (4.54,5.06,.525,5.80,1.09,1.92,-42.47),
          (5.45,7.06,.525,6.04,1.06,2.04,-42.02))
SLOT_X = 2.40

def emission_map(mat, name, linear):
    import bpy
    h,w,_=linear.shape
    image=bpy.data.images.new(name,w,h,alpha=False)
    rgba=np.ones((h,w,4),dtype='f')
    rgba[:,:,:3]=linear
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=image
    bs=mat.node_tree.nodes['Principled BSDF']
    mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Emission Color'])

def create_materials(material,finish_map):
    alloy=finish_map('Stage folded champagne nickel','nickel')
    titanium=finish_map('Stage smoke titanium fold','nickel')
    for mat,base,rough,metal in (
        (alloy,(.27,.173,.082),.37,.76),
        (titanium,(.103,.125,.148),.48,.85),
    ):
        shader=mat.node_tree.nodes['Principled BSDF']
        for name in ('Base Color','Roughness','Metallic'):
            mat.node_tree.links.remove(shader.inputs[name].links[0])
        shader.inputs['Base Color'].default_value=(*base,1)
        shader.inputs['Roughness'].default_value=rough
        shader.inputs['Metallic'].default_value=metal
        normal=shader.inputs['Normal'].links[0].from_node
        normal.inputs['Strength'].default_value=.42
    v,u=np.mgrid[0:512,0:256]/np.array([511,255])[:,None,None]
    # Light from the recessed foot fixture broadens as it climbs the formed metal.
    spot=np.exp(-((u-.38)/(.17+.36*v))**2)/(1+18*v+64*v*v)
    bounce=(.0014+.045*np.exp(-v*8)+spot*.76)[...,None]*np.array([1,.40,.105])
    emission_map(alloy,'Stage fixture grazing the folds',bounce)
    alloy.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=1.65
    # Keep amber footlights visible without flattening the upper facets.
    titan_bs=titanium.node_tree.nodes['Principled BSDF']
    atlas=alloy.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].links[0].from_node.image
    tex=titanium.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=atlas
    titanium.node_tree.links.new(tex.outputs['Color'],titan_bs.inputs['Emission Color'])
    titan_bs.inputs['Emission Strength'].default_value=.72
    diffuser=material('Stage continuous cobalt opal',(.001,.002,.013),0,.85)
    lens=diffuser.node_tree.nodes['Principled BSDF']
    lens.inputs['Specular IOR Level'].default_value=0
    lens.inputs['Emission Color'].default_value=(.00012,.038,1,1)
    lens.inputs['Emission Strength'].default_value=1.8
    surround=material('Stage blued reflector steel',(.034,.047,.085),.52,.41)
    v,u=np.mgrid[0:256,0:128]/np.array([255,127])[:,None,None]
    end=np.clip(np.minimum(v,1-v)*11.0,0,1)
    wash=(.008+.94*np.exp(-abs(u-.5)*10)*end)[...,None]*np.array([.003,.064,1])
    emission_map(surround,'Stage cobalt slot internal bounce',wash)
    surround.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=1.55
    felt=material('Stage anthracite acoustic liner',(.036,.024,.022),.035,.73)
    return alloy,diffuser,surround,felt,titanium

def install(side,box,folded_skin,black,marker,materials):
    alloy,diffuser,surround,_,_=materials
    for base,crown,bottom,top,foot,width,depth in BLADES:
        # Closed folded sheet. Varying ridge and crown heights give planar
        # tapered reflections and a clean diagonal edge above each blade.
        ring=((-0.5,.015),(-.11,.32),(.5,0),(.5,-.086),(-.5,-.086))
        verts=[(side*(x+w*t),h+(t*.36 if h==top else 0),depth+d) for
               x,h,w in ((base,bottom,foot),(crown,top,width)) for t,d in ring]
        # Winding of the front facets gives +Z toward the audience.
        polys=[(4,3,2,1,0),(5,6,7,8,9)]+[(k,(k+1)%5,(k+1)%5+5,k+5) for k in range(5)]
        if side<0:polys=[tuple(reversed(p)) for p in polys]
        folded_skin('Stage nickel fan blades',alloy,verts,polys,.009)
        box('Fan blade plinth shoes',black,(side*base,.485,depth+.028),
            (foot+.035,.080,.294),.004)
        box('Fan blade uplight housing',black,(side*(base-.07),.486,depth+.293),
            (foot*.62,.072,.202),.008)
        box('Fan blade footlight glass',marker,(side*(base-.07),.526,depth+.299),
            (foot*.54,.010,.132),.002)
    # The old slots were almost flush with the rear wall. These receivers stand
    # forward, on the same architectural plane either side of the official plaque.
    x=side*SLOT_X
    box('Sapphire slit recess',black,(x,2.96,-43.142),(.72,4.60,.138),.008)
    box('Sapphire blued recessed reflector',surround,(x,2.96,-43.062),(.67,4.54,.018),.003)
    box('Sapphire slit opal strip',diffuser,(x,2.93,-43.039),(.084,3.70,.022),.006)
    for y in (1.052,4.808):
        box('Sapphire lens end saddles',black,(x,y,-43.042),(.109,.048,.039),.003)

def lighting_uv(group,x,height,z):
    if group=='Sapphire blued recessed reflector':
        return ((abs(x)-SLOT_X)/.67+.5,(height-.69)/4.54)
    # UV along each folded workpiece, continuous over the standing ridge.
    base,crown,bottom,top,foot,width,_=min(BLADES,key=lambda row:abs(z-(row[6]+.075)))
    v=np.clip((height-bottom)/(top-bottom),0,1)
    centre=base+(crown-base)*v
    return ((abs(x)-centre)/(foot+(width-foot)*v)+.5,v)
