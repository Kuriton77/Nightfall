// Generic object pool. Avoids per-spawn allocation and GC churn by reusing
// instances. Inactive objects are recycled during a single-pass `sweep()`
// instead of splicing on every removal.

export class Pool {
  /**
   * @param {() => object} factory  Creates a fresh instance.
   * @param {(obj: object) => void} [reset]  Resets an instance before reuse.
   * @param {number} [initial]  Pre-allocated instances.
   */
  constructor(factory, reset = null, initial = 0) {
    this._factory = factory;
    this._reset = reset;
    this._free = [];
    this.active = [];
    for (let i = 0; i < initial; i++) this._free.push(factory());
  }

  acquire() {
    const obj = this._free.length ? this._free.pop() : this._factory();
    obj.active = true;
    this.active.push(obj);
    return obj;
  }

  // Mark for recycling; the object is returned to the free list on next sweep.
  release(obj) {
    obj.active = false;
  }

  // Compact the active list in place, recycling anything released this frame.
  sweep() {
    const a = this.active;
    let write = 0;
    for (let i = 0; i < a.length; i++) {
      const obj = a[i];
      if (obj.active) {
        a[write++] = obj;
      } else {
        if (this._reset) this._reset(obj);
        this._free.push(obj);
      }
    }
    a.length = write;
  }

  clear() {
    const a = this.active;
    for (let i = 0; i < a.length; i++) {
      const obj = a[i];
      obj.active = false;
      if (this._reset) this._reset(obj);
      this._free.push(obj);
    }
    a.length = 0;
  }
}
