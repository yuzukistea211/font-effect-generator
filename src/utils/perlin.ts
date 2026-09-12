/**
 * Deterministic Perlin Noise 2D implementation with octave / fractal Brownian motion support.
 */

export class PerlinNoise {
  private p: Uint8Array;

  constructor(seed: number = 1337) {
    this.p = new Uint8Array(512);
    this.reseed(seed);
  }

  public reseed(seed: number): void {
    const permutation = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      permutation[i] = i;
    }

    // Deterministic LCG shuffle
    let s = (Math.abs(seed) ^ 0x5bf03635) + 1;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.p[i] = permutation[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  /**
   * Evaluates 2D Perlin noise at (x, y). Returns value roughly in [-1, 1].
   */
  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.p[this.p[X] + Y];
    const ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X + 1] + Y];
    const bb = this.p[this.p[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return this.lerp(v, x1, x2);
  }

  /**
   * Fractal Brownian Motion (octaves, persistence/roughness, lacunarity)
   */
  public fbm2D(x: number, y: number, octaves: number = 2, roughness: number = 0.5, lacunarity: number = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= roughness;
      frequency *= lacunarity;
    }

    return total / (maxValue || 1);
  }
}
