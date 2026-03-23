import React, { useEffect, useRef } from 'react';

export default function NetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    // NOU: Salvăm lățimea inițială a ecranului pentru a preveni resetul pe mobil la scroll
    let currentWidth = window.innerWidth;
    
    // Urmărim mouse-ul pentru interactivitate
    let mouse = { x: null, y: null, radius: 150 };

    const handleMouseMove = (event) => {
      mouse.x = event.x;
      mouse.y = event.y;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    // 1. DEFINIM CLASA PRIMA DATĂ
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

    // 2. DEFINIM FUNCȚIA DE INIȚIALIZARE
    function init() {
      particles = [];
      const numParticles = Math.min(120, (canvas.width * canvas.height) / 9000);
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    }

    // 3. SETĂM MĂRIMEA ECRANULUI ȘI APELĂM INIT (Doar la schimbarea orientării/lățimii pe mobil)
    const resize = () => {
      // Dacă lățimea e aceeași (cum se întâmplă la scroll pe mobil), nu face nimic.
      if (window.innerWidth === currentWidth && particles.length > 0) {
         // Reajustăm doar înălțimea canvas-ului, dar NU resetăm particulele
         canvas.height = window.innerHeight;
         return; 
      }
      
      currentWidth = window.innerWidth;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init(); 
    };
    
    // Setăm lățimea/înălțimea inițială
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();

    window.addEventListener('resize', resize);

    // 4. BUCLA DE ANIMAȚIE
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
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
          const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          
          if (distanceMouse < mouse.radius) {
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
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-60"
    />
  );
}