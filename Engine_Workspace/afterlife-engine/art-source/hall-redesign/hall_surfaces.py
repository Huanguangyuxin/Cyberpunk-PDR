"""Architectural fit-out in engine metres. Invoked from the Blender build script."""
def install_architectural_surfaces(box, mineral, gunmetal, nickel, black, garnet):
    def bays(start, stop, length, offset=0):
        breaks=[start]
        joint=start+(offset or length)
        while joint < stop-.18:
            breaks.append(joint)
            joint+=length
        return zip(breaks,breaks[1:]+[stop])

    for side in (-1,1):
        # Large mineral flags keyed into the running-bond garnet surround.
        # Each third inspection cover occupies an entire flag module.
        for row,(x0,x1) in enumerate([(6.88,7.885),(7.885,8.89),(8.89,9.61)]):
            for index,(z0,z1) in enumerate(bays(-38.75,-23.11,1.005,.5025 if row%2 else 0)):
                cover=row==1 and index in (3,10)
                x,z=side*(x0+x1)/2,(z0+z1)/2
                w,d=x1-x0-.009,z1-z0-.009
                if cover:
                    box('Hall inset service covers',gunmetal,(x,.015,z),(w,.012,d),.002)
                    for s in (-1,1):
                        for t in (-1,1):
                            box('Hall recessed plate fixings',black,(x+s*(w/2-.048),.0215,z+t*(d/2-.05)),(.023,.002,.023),0)
                    for t in (-1,0,1):
                        box('Hall service cover flutes',black,(x,.0215,z+t*.058),(.43,.002,.011),0)
                else:
                    box('Hall staggered mineral flags',mineral,(x,.015,z),(w,.012,d),.002)
        for x in (6.865,9.62):
            box('Hall nickel movement joints',nickel,(side*x,.015,-30.93),(.018,.010,15.64),.002)

        # Keep a technical edge at the guard. The uninterrupted public route
        # between that strip and the VIP doors is 1.83 m wide.
        for i,(z0,z1) in enumerate(bays(-43.64,-22.66,1.17)):
            cz=(z0+z1)/2
            box('Gallery removable rail edge panels',gunmetal,(side*8.53,3.662,cz),(.24,.012,z1-z0-.009),.002)
            if i%3==1:
                box('Gallery inspection pulls',black,(side*8.54,3.669,cz),(.040,.003,.145),.002)
        box('Gallery rail edge spline',nickel,(side*8.665,3.66,-33.15),(.017,.010,20.98),.001)
        for row,(x0,x1) in enumerate(((8.68,9.54),(9.54,10.46))):
            for z0,z1 in bays(-43.64,-22.66,1.005,.5025 if row else 0):
                box('Gallery honed walkway flags',mineral,(side*(x1+x0)/2,3.659,(z0+z1)/2),
                    (x1-x0-.008,.016,z1-z0-.008),.002)

        # Under the windows only. Clear both VIP door reveals at each side.
        for z0,z1 in ((-30.45,-26.22),(-40.65,-36.42)):
            for a,b in bays(z0,z1,1.06):
                mid=(a+b)/2
                box('Gallery sill access panels',gunmetal,(side*10.435,4.13,mid),(.059,.63,b-a-.014),.006)
                for dz in (-1,1):
                    box('Gallery sill corner studs',nickel,(side*10.404,4.382,mid+dz*((b-a)/2-.065)),(.005,.019,.019),.001)
            for h,material in [(3.788,black),(4.467,nickel)]:
                box('Gallery sill reveals' if h<4 else 'Gallery sill caps',material,
                    (side*10.424,h,(z0+z1)/2),(.079,.033,z1-z0+.018),.003)

        # Low service skirting under each ground-floor acoustic cassette bank.
        for center in (-24.55,-29.10,-33.65,-38.2):
            for a,b in bays(center-1.76,center+1.76,1.005):
                box('Hall sidewall wainscot',gunmetal,(side*13.81,.72,(a+b)/2),(.09,1.13,b-a-.015),.008)
            for h in (.14,1.314):
                box('Hall pressed dado returns',nickel,(side*13.748,h,center),(.055,.027,3.55),.003)

        # Interior finish, independently of the public gallery side. Split around
        # the exact original wall lights and ornamental cassettes.
        for z0,z1,rug_z,rug_half,ornament in (
            (-33.32,-23.28,-28.825,2.052,(-33.23,-31.03)),
            (-43.94,-33.48,-39.15,2.160,(-43.75,-41.55))):
            rx0,rx1=12.275-.684,12.275+.684
            bands=[(10.63,rx0-.014,z0,z1),(rx1+.014,13.965,z0,z1),
                   (rx0-.014,rx1+.014,z0,rug_z-rug_half-.014),
                   (rx0-.014,rx1+.014,rug_z+rug_half+.014,z1)]
            for x0,x1,lo,hi in bands:
                for a,b in bays(lo,hi,1.005):
                    box('Gallery honed walkway flags',mineral,
                        (side*(x0+x1)/2,3.658,(a+b)/2),
                        (x1-x0-.007,.014,b-a-.007),.002)
            for x in (rx0-.010,rx1+.010):
                box('Gallery rail edge spline',nickel,(side*x,3.66,rug_z),
                    (.014,.008,2*rug_half+.014),.001)
            for z in (rug_z-rug_half-.01,rug_z+rug_half+.01):
                box('Gallery rail edge spline',nickel,(side*12.275,3.66,z),
                    (rx1-rx0+.013,.008,.014),.001)

            # Finish both return walls; keep the inside glazing wall untouched.
            for end,sign in ((z0,1),(z1,-1)):
                for a,b in bays(10.65,13.96,1.10):
                    for lo,hi in ((4.43,5.65),(5.65,6.83)):
                        box('Gallery sill access panels',gunmetal,
                            (side*(a+b)/2,(hi+lo)/2,end+sign*.014),
                            (b-a-.013,hi-lo-.014,.020),.006)
                for h in (4.402,):
                    box('Gallery sill caps',nickel,(side*12.3,h,end+sign*.022),(3.30,.035,.033),.003)

            # Front face x=13.957 m. The 0.5m-wide lamp pockets preserve light
            # sheet, bezel, and cable. Keep the ornament's original frame visible.
            stops={z0,z1}
            for mid in (-24.8,-30.,-35.):
                if z0<mid<z1:stops.update((mid-.255,mid+.255))
            stops.update(ornament)
            ordered=sorted(stops)
            for a,b in zip(ordered,ordered[1:]):
                mid=(a+b)/2
                if any(abs(mid-c)<.254 for c in (-24.8,-30.,-35.)) or ornament[0]<mid<ornament[1]:continue
                for lo,hi in bays(a,b,1.16):
                    for h0,h1 in ((4.42,5.63),(5.63,6.79)):
                        box('Gallery sill access panels',gunmetal,
                            (side*13.964,(h0+h1)/2,(lo+hi)/2),
                            (.023,h1-h0-.013,hi-lo-.013),.006)
            for row in range(3):
                for a,b in bays(z0,z1,.41,.205 if row%2 else 0):
                    box('Running bond side paving',garnet,(side*13.96,3.854+row*.208,(a+b)/2),
                        (.031,.194,b-a-.013),.004)
            box('Gallery sill caps',nickel,(side*13.951,4.395,(z0+z1)/2),(.045,.037,z1-z0),.003)
