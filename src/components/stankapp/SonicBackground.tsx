import { useEffect, useRef } from 'react';

const SonicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Sonic rings animation
    const rings: Array<{
      x: number;
      y: number;
      rotation: number;
      speed: number;
      size: number;
    }> = [];

    for (let i = 0; i < 20; i++) {
      rings.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        rotation: 0,
        speed: 0.5 + Math.random() * 2,
        size: 20 + Math.random() * 30,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      rings.forEach((ring) => {
        ctx.save();
        ctx.translate(ring.x, ring.y);
        ctx.rotate(ring.rotation);

        // Draw golden ring
        ctx.beginPath();
        ctx.arc(0, 0, ring.size, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, ring.size - 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        ring.rotation += 0.02;
        ring.y += ring.speed;

        if (ring.y > canvas.height + ring.size) {
          ring.y = -ring.size;
          ring.x = Math.random() * canvas.width;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ 
        background: 'linear-gradient(135deg, #0066CC 0%, #003d7a 50%, #FF6600 100%)'
      }}
    />
  );
};

export default SonicBackground;
