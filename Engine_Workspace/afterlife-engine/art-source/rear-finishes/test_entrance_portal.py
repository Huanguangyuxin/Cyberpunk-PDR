"""Check the fabricated doorway cross section without launching Blender."""
import unittest
from collections import defaultdict

from entrance_portal import HEADER_HEIGHT, OUTER, THROAT, install


class EntranceSection(unittest.TestCase):
    def setUp(self):
        self.boxes = defaultdict(list)
        self.folds = defaultdict(list)
        install(lambda name, mat, pos, size, bevel: self.boxes[name].append((pos,size)),
                lambda name, mat, front, back, bevel: self.folds[name].append((front,back)),
                range(5),5,6)

    def test_front_reveal_returns_to_the_existing_two_leaves(self):
        # 2.18 m is the full width of the real stock doors, including meeting stiles.
        self.assertAlmostEqual(2*OUTER/2.18, 2.44, places=2)
        for front,back in self.folds['Entry folded portal']:
            self.assertEqual({abs(x) for x,y,z in front},{OUTER,THROAT})
            self.assertGreater(max(y for x,y,z in front)-min(y for x,y,z in front),.20)
            self.assertEqual(max(z for x,y,z in front),HEADER_HEIGHT)
            for f,b in zip(front,back):
                self.assertAlmostEqual(f[1]-b[1],.015)
            a,b,c=front[:3]
            self.assertGreater((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),0)
        for p,size in self.boxes['Entry portal reveal']:
            self.assertLess(abs(p[0])+size[0]/2,THROAT)
            self.assertGreater(abs(p[0])-size[0]/2,1.18)

    def test_stock_handles_remain_in_front_of_both_refaced_leaves(self):
        leaves=self.boxes['Entry satin door leaf inserts']
        self.assertEqual(len(leaves),4)
        self.assertEqual(len(self.boxes['Entry pull fixing plates']),8)
        for p,size in leaves:
            self.assertGreater(abs(p[0])-size[0]/2,0)
            # Source handles project from z=.046 (interior) through z=.254.
            self.assertGreater(p[2]-size[2]/2,.046)
            self.assertLess(p[2]+size[2]/2,.254)
        self.assertEqual(len(self.boxes['Entry side return fins']),42)


if __name__=='__main__':
    unittest.main()
