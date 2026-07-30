// Item base class — the contract every exhibit must fulfill.
// Gallery constructs items, iterates their layers (item + background),
// and drives lifecycle hooks during transitions.

export class Item {
  /** Subclasses MUST set these static properties */
  static id = undefined;
  static autoRotate = true;

  constructor(ctx) {
    const model = this.buildModel(ctx);
    this.meshes = model.meshes || [];
    this.lights = model.lights || [];
    this.background = this.buildBackground(ctx) || null;
  }

  /** Subclasses MUST implement: return { meshes, lights } */
  buildModel(_ctx) {
    throw new Error(`Item ${this.constructor.id}: buildModel() not implemented`);
  }

  /** Subclasses MAY override: return a layer-like object or null */
  buildBackground(_ctx) {
    return null;
  }

  // Lifecycle hooks — override as needed
  animate(_time, _dt) {}
  reset() {}
  onBeforeGather() {}
  onGathered() {}
  onScatterStart() {}
}
