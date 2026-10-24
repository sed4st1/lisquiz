import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface WaterParticlesCanvasHandle {
  triggerWaterStream: (fromX: number, fromY: number, toX: number, toY: number) => void;
  triggerExplosion: (x: number, y: number, count?: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  maxLife: number;
  life: number;
  gravity?: number;
}

export const WaterParticlesCanvas = forwardRef<WaterParticlesCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    triggerWaterStream: (fromX, fromY, toX, toY) => {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const count = 45;

      const waterColors = ['#93C5FD', '#60A5FA', '#38BDF8', '#E0F2FE', '#FDE047'];

      for (let i = 0; i < count; i++) {
        // Staggered launch times and spread
        const speed = 0.85 + Math.random() * 0.35;
        const spreadX = (Math.random() - 0.5) * 25;
        const spreadY = (Math.random() - 0.5) * 15;

        // Ballistic trajectory: horizontal velocity toward tree + initial upward burst
        const vx = (dx / 32) * speed + spreadX * 0.08;
        const vy = (dy / 32) * speed - (3.5 + Math.random() * 2.5) + spreadY * 0.08;

        particlesRef.current.push({
          x: fromX + (Math.random() - 0.5) * 8,
          y: fromY + (Math.random() - 0.5) * 8,
          vx,
          vy,
          size: 2.5 + Math.random() * 3,
          alpha: 0.95,
          color: waterColors[Math.floor(Math.random() * waterColors.length)] ?? '#38BDF8',
          maxLife: 45 + Math.floor(Math.random() * 15),
          life: 0,
          gravity: 0.22,
        });
      }
    },
    triggerExplosion: (x, y, count = 30) => {
      const colors = ['#FDE047', '#F59E0B', '#34D399', '#60A5FA', '#FFFFFF'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: 2 + Math.random() * 3.5,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)] ?? '#FFFFFF',
          maxLife: 35 + Math.floor(Math.random() * 20),
          life: 0,
          gravity: 0.08,
        });
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent?.clientWidth || window.innerWidth;
      canvas.height = parent?.clientHeight || window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Spawn ambient floating pollen / fireflies periodically
    const ambientInterval = setInterval(() => {
      if (particlesRef.current.length < 35 && canvas.width > 0) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: canvas.height * 0.3 + Math.random() * (canvas.height * 0.5),
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(0.3 + Math.random() * 0.4),
          size: 1.5 + Math.random() * 2,
          alpha: 0.6,
          color: Math.random() > 0.4 ? '#FDE047' : '#34D399',
          maxLife: 120 + Math.floor(Math.random() * 80),
          life: 0,
          gravity: -0.01, // Gently float up
        });
      }
    }, 450);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const activeParticles: Particle[] = [];

      for (const p of particlesRef.current) {
        if (!p) continue;
        p.life++;

        if (p.gravity !== undefined) {
          p.vy += p.gravity;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Fade out toward end of life
        const progress = p.life / p.maxLife;
        const currentAlpha = Math.max(0, p.alpha * (1 - progress));

        if (p.life < p.maxLife && currentAlpha > 0.02) {
          ctx.save();
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          activeParticles.push(p);
        }
      }

      particlesRef.current = activeParticles;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearInterval(ambientInterval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    />
  );
});

WaterParticlesCanvas.displayName = 'WaterParticlesCanvas';
