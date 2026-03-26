import React, { useEffect, useRef } from 'react';

export default function NetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    // Salvăm lățimea inițială a ecranului
    let currentWidth = window.innerWidth;
    
    let mouse = { x: null, y: null, radius: 150 };

    const handleMouseMove = (event) => {
      mouse.x = event.x;
      mouse.y = event.y;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseout', handleMouseOut, { passive: true });

    // 1. DEFINIM CLASA
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 1.5 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.8)'; // Indigo
        ctx.fill();
      }
    }

    // 2. FUNCȚIA DE INIȚIALIZARE OPTIMIZATĂ PENTRU MOBIL
    function init() {
      particles = [];
      const isMobile = window.innerWidth < 768;
      
      // Dacă e mobil, punem maxim 40 de particule. Pe desktop lăsăm 120.
      const maxParticles = isMobile ? 40 : 120;
      const density = isMobile ? 12000 : 9000; 

      const numParticles = Math.min(maxParticles, (canvas.width * canvas.height) / density);
      
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    }

    const resize = () => {
      if (window.innerWidth === currentWidth && particles.length > 0) {
         canvas.height = window.innerHeight;
         return; 
      }
      currentWidth = window.innerWidth;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init(); 
    };
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();

    window.addEventListener('resize', resize, { passive: true });

    // 3. BUCLA DE ANIMAȚIE OPTIMIZATĂ MATEMATIC
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Pre-calculăm pătratele distanțelor pentru a evita Math.sqrt inutil
      const connectDistanceSq = 120 * 120; 
      const mouseRadiusSq = mouse.radius * mouse.radius;

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          
          // Verificăm distanța FĂRĂ radical (foarte rapid pentru procesor)
          const distanceSq = dx * dx + dy * dy;
          
          if (distanceSq < connectDistanceSq) {
            const distance = Math.sqrt(distanceSq); // Facem operația grea doar dacă e necesar
            ctx.beginPath();
            const opacity = 1 - (distance / 120);
            ctx.strokeStyle = `rgba(236, 72, 153, ${opacity * 0.3})`; // Pink
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        if (mouse.x != null && mouse.y != null) {
          const dxMouse = particles[i].x - mouse.x;
          const dyMouse = particles[i].y - mouse.y;
          const distanceMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;
          
          if (distanceMouseSq < mouseRadiusSq) {
            const distanceMouse = Math.sqrt(distanceMouseSq);
            ctx.beginPath();
            const opacity = 1 - (distanceMouse / mouse.radius);
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.4})`; // Purple glow
            ctx.lineWidth = 1.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Am adăugat backgroundColor pentru LCP instant și will-change pentru GPU
      style={{ backgroundColor: '#0b1020', willChange: 'transform' }} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-60"
    />
  );
}