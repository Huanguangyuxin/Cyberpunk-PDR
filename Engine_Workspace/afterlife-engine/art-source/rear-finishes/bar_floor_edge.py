"""Cut garnet pavers for the return between the bar and the first east tread."""
from math import cos, pi, sin, ceil


def install(groups, garnet, joint):
    # Blender plan coordinates in metres. The red course stops just ahead of
    # the first tread (Y=14.38) and skirts the staff entrance at the bar end.
    radius = 0.65
    straight = 3.25
    arc = radius * pi / 2
    end = straight + arc + 3.06

    def station(distance, offset):
        if distance <= straight:
            return 9.80 + offset, 10.25 + distance
        if distance < straight + arc:
            theta = (distance - straight) / radius
            return 10.45 - (radius - offset) * cos(theta), 13.50 + (radius - offset) * sin(theta)
        return 10.45 + distance - straight - arc, 14.15 - offset

    def strip(name, material, first, last, inside, outside, height):
        vertices, faces = groups.setdefault((name, material, 0), ([], []))
        steps = ceil((last - first) / 0.035)
        base = len(vertices)
        for i in range(steps + 1):
            s = first + i * (last - first) / steps
            for offset in (inside, outside):
                vertices.append((*station(s, offset), height))
        for i in range(steps):
            a = base + i * 2
            faces.append((a, a + 1, a + 3, a + 2))

    strip('Stair return grout', joint, 0, end, -.112, .112, .0039)
    for row, (left, right) in enumerate(((-.109, -.002), (.002, .109))):
        seams = [0]
        s = .115 if row else .23
        while s < end - .025:
            seams.append(s)
            s += .23
        seams.append(end)
        for a, b in zip(seams, seams[1:]):
            strip('Garnet paver stair return', garnet, a + .002, b - .002, left, right, .0048)
