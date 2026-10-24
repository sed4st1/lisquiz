/**
 * CanvasParticleEngine - Высокопроизводительный 2D Canvas движок частиц с Object Pooling
 * Обеспечивает стабильные 60 FPS на мобильных WebView без выделения памяти и лагов сборщика мусора (GC).
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  color: string;
  opacity: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  decay: number;
  shape: 'rect' | 'circle' | 'spark';
}

export class CanvasParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private activeParticles: Particle[] = [];
  private particlePool: Particle[] = [];
  private animationId: number | null = null;
  private isDestroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
  }

  /**
   * Взрыв праздничных конфетти / искр
   */
  public triggerExplosion(
    originX: number,
    originY: number,
    count = 35,
    palette = ['#58cc02', '#FF9600', '#1cb0f6', '#FFD700', '#10B981', '#FFFFFF']
  ) {
    if (this.isDestroyed) return;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const velocity = 4 + Math.random() * 8;

      const p = this.particlePool.pop() || ({} as Particle);
      p.x = originX;
      p.y = originY;
      p.vx = Math.cos(angle) * velocity;
      p.vy = Math.sin(angle) * velocity - 3.2;
      p.scale = 6 + Math.random() * 6;
      p.color = palette[Math.floor(Math.random() * palette.length)] ?? '#FF7A00';
      p.opacity = 1;
      p.rotation = Math.random() * 360;
      p.rotSpeed = (Math.random() - 0.5) * 14;
      p.life = 1;
      p.decay = 0.015 + Math.random() * 0.01;
      p.shape = Math.random() > 0.4 ? 'rect' : 'spark';

      this.activeParticles.push(p);
    }

    if (!this.animationId) {
      this.tick();
    }
  }

  /**
   * Непрерывный поток золотой пыльцы и светлячков (для волшебного дерева Рощи)
   */
  public spawnAmbientFirefly(width: number, height: number) {
    if (this.isDestroyed || this.activeParticles.length > 25) return;

    const p = this.particlePool.pop() || ({} as Particle);
    p.x = width * (0.15 + Math.random() * 0.7);
    p.y = height * (0.3 + Math.random() * 0.5);
    p.vx = (Math.random() - 0.5) * 0.6;
    p.vy = -0.4 - Math.random() * 0.6;
    p.scale = 3 + Math.random() * 4;
    p.color = Math.random() > 0.3 ? '#FFD700' : '#10B981';
    p.opacity = 0.1;
    p.rotation = 0;
    p.rotSpeed = 0;
    p.life = 1;
    p.decay = 0.005 + Math.random() * 0.005;
    p.shape = 'circle';

    this.activeParticles.push(p);

    if (!this.animationId) {
      this.tick();
    }
  }

  private tick = () => {
    if (this.isDestroyed) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      if (!p) continue;
      p.x += p.vx;
      p.y += p.vy;

      if (p.shape === 'rect' || p.shape === 'spark') {
        p.vy += 0.22; // гравитация
        p.vx *= 0.98; // торможение
        p.rotation += p.rotSpeed;
      } else {
        // Плавное парение светлячка
        p.x += Math.sin(p.life * 10) * 0.4;
      }

      p.life -= p.decay;
      p.opacity = Math.max(0, p.life);

      if (p.life <= 0) {
        this.activeParticles.splice(i, 1);
        this.particlePool.push(p); // возврат в пул без сборщика мусора!
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.globalAlpha = p.opacity;

      if (p.shape === 'circle') {
        // Сияющий светлячок с размытым ореолом
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.scale * 1.8);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.scale * 1.8, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.scale / 2, -p.scale / 2, p.scale, p.scale * 0.7);
      }

      this.ctx.restore();
    }

    if (this.activeParticles.length > 0) {
      this.animationId = requestAnimationFrame(this.tick);
    } else {
      this.animationId = null;
    }
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.activeParticles = [];
    this.particlePool = [];
  }
}
