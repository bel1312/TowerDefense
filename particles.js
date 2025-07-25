// Particle system for visual effects
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Create explosion particles
  createExplosion(x, y, color = '#ff6b35', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 4,
        color,
        type: 'explosion'
      });
    }
  }

  // Create hit particles
  createHit(x, y, color = '#ff4757') {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        size: 2 + Math.random() * 2,
        color,
        type: 'hit'
      });
    }
  }

  // Create muzzle flash
  createMuzzleFlash(x, y, angle) {
    for (let i = 0; i < 3; i++) {
      const spread = 0.3;
      const flashAngle = angle + (Math.random() - 0.5) * spread;
      const speed = 3 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(flashAngle) * speed,
        vy: Math.sin(flashAngle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: 2 + Math.random() * 3,
        color: '#ffa502',
        type: 'muzzle'
      });
    }
  }

  // Create gold pickup effect
  createGoldEffect(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1.5,
        maxLife: 1.5,
        size: 2 + Math.random() * 2,
        color: '#ffd700',
        type: 'gold'
      });
    }
  }

  // Update all particles
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * deltaTime / 16;
      p.y += p.vy * deltaTime / 16;
      
      // Apply gravity for certain types
      if (p.type === 'explosion' || p.type === 'gold') {
        p.vy += 0.1 * deltaTime / 16;
      }
      
      // Update life
      p.life -= deltaTime / 1000;
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Draw all particles
  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Global particle system instance
window.particleSystem = new ParticleSystem();