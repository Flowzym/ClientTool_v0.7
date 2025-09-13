/**
 * RequestAnimationFrame utilities
 */

export const nextFrame = (): Promise<void> => 
  new Promise(resolve => requestAnimationFrame(() => resolve()));

export const waitFrames = async (count: number): Promise<void> => {
  for (let i = 0; i < count; i++) {
    await nextFrame();
  }
};

export class FPSEstimator {
  private frameTimes: number[] = [];
  private lastTime = 0;
  private isRunning = false;

  start(): void {
    this.frameTimes = [];
    this.lastTime = performance.now();
    this.isRunning = true;
    this.tick();
  }

  stop(): { fps: number; frameCount: number; duration: number } {
    this.isRunning = false;
    
    if (this.frameTimes.length < 2) {
      return { fps: 0, frameCount: 0, duration: 0 };
    }
    
    const totalDuration = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
    const fps = (this.frameTimes.length - 1) / (totalDuration / 1000);
    
    return {
      fps: Math.round(fps),
      frameCount: this.frameTimes.length,
      duration: totalDuration
    };
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    this.frameTimes.push(now);
    
    // Limit to last 120 frames (2 seconds at 60fps)
    if (this.frameTimes.length > 120) {
      this.frameTimes.shift();
    }
    
    requestAnimationFrame(this.tick);
  };
}