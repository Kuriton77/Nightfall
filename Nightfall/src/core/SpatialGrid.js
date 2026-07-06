// Uniform spatial hash grid for broad-phase collision queries. Rebuilt each
// frame from the active enemy set so projectile/pickup lookups only test
// nearby objects instead of scanning everything (keeps combat near O(n)).

export class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this._cells = new Map();
    this._arrayPool = []; // recycled cell arrays to avoid per-frame allocation
  }

  _cellKey(cx, cy) {
    return cx + ':' + cy;
  }

  clear() {
    for (const arr of this._cells.values()) {
      arr.length = 0;
      this._arrayPool.push(arr);
    }
    this._cells.clear();
  }

  insert(obj) {
    const cs = this.cellSize;
    const key = this._cellKey(Math.floor(obj.x / cs), Math.floor(obj.y / cs));
    let arr = this._cells.get(key);
    if (!arr) {
      arr = this._arrayPool.pop() || [];
      this._cells.set(key, arr);
    }
    arr.push(obj);
  }

  // Collect all objects in cells overlapping the circle (x, y, radius) into
  // `out` (reused array). Caller still does precise distance checks.
  query(x, y, radius, out) {
    out.length = 0;
    const cs = this.cellSize;
    const minX = Math.floor((x - radius) / cs);
    const maxX = Math.floor((x + radius) / cs);
    const minY = Math.floor((y - radius) / cs);
    const maxY = Math.floor((y + radius) / cs);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const arr = this._cells.get(this._cellKey(cx, cy));
        if (arr) {
          for (let i = 0; i < arr.length; i++) out.push(arr[i]);
        }
      }
    }
    return out;
  }
}
