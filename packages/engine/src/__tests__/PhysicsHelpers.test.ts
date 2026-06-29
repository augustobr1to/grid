import { createRigidBodyDesc, createColliderDesc } from '../physics/PhysicsHelpers';

describe('physics/PhysicsHelpers', () => {
  describe('createRigidBodyDesc', () => {
    it('creates a descriptor for each known body type', () => {
      for (const type of ['dynamic', 'fixed', 'kinematicPositionBased', 'kinematicVelocityBased']) {
        expect(createRigidBodyDesc(type)).toBeTruthy();
      }
    });

    it('throws on an unknown body type', () => {
      expect(() => createRigidBodyDesc('floaty')).toThrow(/Unknown rigid body type/);
    });
  });

  describe('createColliderDesc', () => {
    it('throws on an unknown collider type', () => {
      expect(() => createColliderDesc({ type: 'blob' } as never)).toThrow(/Unknown collider type/);
    });

    it('requires vertices and indices for a trimesh', () => {
      expect(() => createColliderDesc({ type: 'trimesh' } as never)).toThrow(/requires vertices and indices/);
    });

    it('requires vertices for a convexHull', () => {
      expect(() => createColliderDesc({ type: 'convexHull' } as never)).toThrow(/requires vertices/);
    });
  });
});
