/**
 * Interactive Particle & Grid Canvas for Authentication Screen
 * High-performance 60fps canvas animation with dual-theme adaptability
 */

export class AuthBackground {
  constructor(canvasId = 'auth-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000, radius: 160 };
    this.animationFrameId = null;
    this.isRunning = false;

    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.start();
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = this.canvas.width = parent ? parent.clientWidth : window.innerWidth;
    this.height = this.canvas.height = parent ? parent.clientHeight : window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    const count = Math.min(65, Math.floor((this.width * this.height) / 18000));

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.5 + 1,
        baseAlpha: Math.random() * 0.35 + 0.15,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseVal: Math.random() * Math.PI
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });

    const parent = this.canvas.parentElement || window;
    parent.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;

      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    parent.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const animate = () => {
      if (!this.isRunning) return;
      this.draw();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    const lineStroke = isLight ? 'rgba(100, 116, 139, ' : 'rgba(161, 161, 170, ';
    const cursorStroke = isLight ? 'rgba(22, 163, 74, ' : 'rgba(34, 197, 94, ';
    const dotColor = isLight ? 'rgba(71, 85, 105, ' : 'rgba(228, 228, 231, ';

    // Connecting lines between particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const alpha = (1 - dist / 120) * (isLight ? 0.22 : 0.18);
          this.ctx.strokeStyle = `${lineStroke}${alpha})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }

    // Mouse interactive connections
    if (this.mouse.x > 0 && this.mouse.y > 0) {
      for (let i = 0; i < this.particles.length; i++) {
        const dx = this.mouse.x - this.particles[i].x;
        const dy = this.mouse.y - this.particles[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          const alpha = (1 - dist / this.mouse.radius) * 0.45;
          this.ctx.strokeStyle = `${cursorStroke}${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(this.mouse.x, this.mouse.y);
          this.ctx.lineTo(this.particles[i].x, this.particles[i].y);
          this.ctx.stroke();

          this.particles[i].x += dx * 0.008;
          this.particles[i].y += dy * 0.008;
        }
      }
    }

    // Update and draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      p.pulseVal += p.pulseSpeed;
      const currentAlpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.12;

      this.ctx.fillStyle = `${dotColor}${Math.max(0.1, currentAlpha)})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
