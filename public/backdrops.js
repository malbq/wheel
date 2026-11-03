// Full-screen background effects drawn on the #backdrop canvas, picked by a
// theme's `backdrop` field. Each returns { start({ animate }), stop }; with
// animate false (reduced motion) they draw a still frame, or nothing.

// "Digital rain" for Matrix: columns of glyphs falling, faded each frame so
// they leave trails. Kept dim and at ~20fps, since it only sits behind the wheel.
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
const CELL = 18; // px per glyph
const FRAME_MS = 50;

const createRain = (canvas) => {
  const ctx = canvas.getContext('2d');
  let drops = []; // row of each column's head
  let frame = 0;
  let last = 0;

  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const rows = Math.ceil(canvas.height / CELL);
    drops = Array.from({ length: Math.ceil(canvas.width / CELL) }, () => -Math.floor(Math.random() * rows));
  };

  const draw = (time) => {
    frame = requestAnimationFrame(draw);
    if (time - last < FRAME_MS) return;
    last = time;

    ctx.fillStyle = 'rgb(0 0 0 / 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${CELL}px VT323, ui-monospace, monospace`;

    drops.forEach((row, column) => {
      const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      // Brighter head, the trail fades behind it
      ctx.fillStyle = Math.random() < 0.1 ? 'rgb(200 255 210 / 0.6)' : 'rgb(0 255 65 / 0.35)';
      ctx.fillText(glyph, column * CELL, row * CELL);
      // Restart at a random moment after leaving the screen, so columns drift apart
      drops[column] = row * CELL > canvas.height && Math.random() > 0.975 ? 0 : row + 1;
    });
  };

  return {
    start({ animate = true } = {}) {
      if (frame || !animate) return; // rain is all motion; the page stays black without it
      resize();
      addEventListener('resize', resize);
      frame = requestAnimationFrame(draw);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Small seeded PRNG (mulberry32), so the marble looks the same on every load and resize
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
};

// White Carrara-style marble for Imperium: pale stone with soft gray clouding
// and wandering gray veins with short branches. Static; redrawn only on resize.
const createMarble = (canvas) => {
  const ctx = canvas.getContext('2d');
  let resizeTimer;
  let running = false;

  const draw = () => {
    const scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = Math.round(innerWidth * scale));
    const height = (canvas.height = Math.round(innerHeight * scale));
    const size = Math.max(width, height);
    const random = seeded(7);

    const base = ctx.createRadialGradient(width / 2, height * 0.35, 0, width / 2, height * 0.35, size * 0.75);
    base.addColorStop(0, '#f6f5f2');
    base.addColorStop(0.6, '#e8e6e1');
    base.addColorStop(1, '#cfccc6');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Clouding: large soft patches, slightly lighter or grayer than the stone
    for (let i = 0; i < 70; i++) {
      const x = random() * width;
      const y = random() * height;
      const radius = size * (0.05 + random() * 0.18);
      const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
      patch.addColorStop(0, random() < 0.5 ? 'rgb(255 255 255 / 0.35)' : 'rgb(110 110 118 / 0.07)');
      patch.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = patch;
      ctx.fillRect(0, 0, width, height);
    }

    // A vein is a smoothed random walk drifting along a main direction
    const vein = (x, y, heading, steps, stepLength, alpha, lineWidth) => {
      const points = [[x, y]];
      const drift = heading;
      for (let i = 0; i < steps; i++) {
        heading += (random() - 0.5) * 0.28 + (drift - heading) * 0.04;
        x += Math.cos(heading) * stepLength;
        y += Math.sin(heading) * stepLength;
        points.push([x, y]);
      }
      ctx.strokeStyle = `rgb(88 88 96 / ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i];
        const [nx, ny] = points[i + 1];
        ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
      }
      ctx.stroke();
      return points;
    };

    ctx.lineCap = 'round';
    const step = size * 0.013;
    for (let i = 0; i < 15; i++) {
      const x = random() * width * 1.2 - width * 0.1;
      const y = random() * height * 1.2 - height * 0.1;
      const heading = Math.PI / 5 + (random() - 0.5) * 0.8;
      const strong = random() < 0.35;

      // Soft halo under the vein, then the vein itself
      ctx.filter = `blur(${6 * scale}px)`;
      vein(x, y, heading, 90, step, 0.06, 10 * scale);
      ctx.filter = `blur(${0.6 * scale}px)`;
      const points = vein(x, y, heading, 90, step, strong ? 0.38 : 0.16, (strong ? 1.6 : 0.8) * scale);

      // A couple of short branches splitting off
      for (let b = 0; b < 3; b++) {
        const [bx, by] = points[Math.floor(random() * points.length)];
        vein(bx, by, heading + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.6), 20, step * 0.8, 0.14, 0.6 * scale);
      }
    }
    ctx.filter = 'none';
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 150);
  };

  return {
    start() {
      if (running) return;
      running = true;
      draw();
      addEventListener('resize', onResize);
    },
    stop() {
      running = false;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Firelit stone wall for Viking: rows of rough blocks, some carved with a rune,
// a warm glow from below that flickers in step-ish with the 3D firelight, and
// embers drifting up. The wall is drawn once per size; glow and embers each frame (~30fps).
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

const createRunestones = (canvas) => {
  const ctx = canvas.getContext('2d');
  const wall = document.createElement('canvas');
  const ember = document.createElement('canvas');
  let embers = [];
  let frame = 0;
  let last = 0;
  let running = false;
  let animated = false;
  let resizeTimer;
  let scale = 1;

  // Soft orange dot, drawn once and stamped for every ember
  ember.width = ember.height = 32;
  {
    const e = ember.getContext('2d');
    const glow = e.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgb(255 230 170 / 1)');
    glow.addColorStop(0.25, 'rgb(255 150 50 / 0.8)');
    glow.addColorStop(1, 'rgb(255 80 0 / 0)');
    e.fillStyle = glow;
    e.fillRect(0, 0, 32, 32);
  }

  const drawWall = () => {
    scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = wall.width = Math.round(innerWidth * scale));
    const height = (canvas.height = wall.height = Math.round(innerHeight * scale));
    const w = wall.getContext('2d');
    const random = seeded(11);

    w.fillStyle = '#0b0806'; // mortar
    w.fillRect(0, 0, width, height);
    const rowHeight = Math.max(48 * scale, height / 12);
    const gap = 3 * scale;
    for (let y = -random() * rowHeight; y < height; y += rowHeight) {
      for (let x = -random() * rowHeight * 1.5; x < width; ) {
        const blockWidth = rowHeight * (1.3 + random() * 1.5);
        const light = 7 + random() * 7;
        const face = w.createLinearGradient(x, y, x + blockWidth, y + rowHeight);
        face.addColorStop(0, `hsl(${25 + random() * 15} ${8 + random() * 10}% ${light + 4}%)`);
        face.addColorStop(1, `hsl(${20 + random() * 15} ${6 + random() * 8}% ${light - 5}%)`);
        w.fillStyle = face;
        w.beginPath();
        w.roundRect(x + gap / 2, y + gap / 2, blockWidth - gap, rowHeight - gap, 5 * scale);
        w.fill();
        // Pitted surface
        for (let k = 0; k < 14; k++) {
          w.fillStyle = random() < 0.5 ? 'rgb(0 0 0 / 0.25)' : 'rgb(255 235 210 / 0.05)';
          w.beginPath();
          w.arc(x + random() * blockWidth, y + random() * rowHeight, (0.5 + random() * 2.5) * scale, 0, Math.PI * 2);
          w.fill();
        }
        // Now and then a rune cut into the block: dark groove, faint lit lower edge
        if (random() < 0.16) {
          const rune = [...RUNES][Math.floor(random() * RUNES.length)];
          const cx = x + blockWidth / 2;
          const cy = y + rowHeight / 2;
          w.font = `${Math.round(rowHeight * 0.6)}px "Noto Sans Runic", serif`;
          w.textAlign = 'center';
          w.textBaseline = 'middle';
          w.fillStyle = 'rgb(255 220 180 / 0.08)';
          w.fillText(rune, cx + scale, cy + 1.5 * scale);
          w.fillStyle = 'rgb(0 0 0 / 0.55)';
          w.fillText(rune, cx, cy);
        }
        x += blockWidth;
      }
    }

    // Darkness closing in at the edges
    const vignette = w.createRadialGradient(width / 2, height * 0.6, 0, width / 2, height * 0.6, Math.max(width, height) * 0.75);
    vignette.addColorStop(0, 'rgb(0 0 0 / 0)');
    vignette.addColorStop(0.45, 'rgb(0 0 0 / 0.45)');
    vignette.addColorStop(1, 'rgb(0 0 0 / 0.92)');
    w.fillStyle = vignette;
    w.fillRect(0, 0, width, height);
  };

  const paint = (seconds) => {
    const { width, height } = canvas;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(wall, 0, 0);

    // Torch glow from below, flickering like the 3D lights
    const flicker = 1 + 0.12 * Math.sin(seconds * 7.3) + 0.07 * Math.sin(seconds * 13.7 + 1.3);
    const glow = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, Math.max(width, height) * 0.8);
    glow.addColorStop(0, `rgb(255 130 40 / ${0.34 * flicker})`);
    glow.addColorStop(1, 'rgb(255 100 20 / 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (const e of embers) {
      const size = e.size * scale;
      ctx.globalAlpha = Math.max(0, e.life) * (0.6 + 0.4 * Math.sin(seconds * 20 + e.x));
      ctx.drawImage(ember, e.x - size / 2, e.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  };

  const spawn = (anywhere) => ({
    x: canvas.width * (0.15 + Math.random() * 0.7),
    y: anywhere ? Math.random() * canvas.height : canvas.height + 10,
    speed: (0.6 + Math.random() * 1.4) * scale,
    sway: Math.random() * Math.PI * 2,
    life: 0.6 + Math.random() * 0.4,
    size: 6 + Math.random() * 10,
  });

  const tick = (time) => {
    frame = requestAnimationFrame(tick);
    if (time - last < 33) return;
    last = time;
    for (const e of embers) {
      e.y -= e.speed;
      e.x += Math.sin(time / 600 + e.sway) * 0.6 * scale;
      e.life -= 0.004;
    }
    embers = embers.filter((e) => e.life > 0 && e.y > -20);
    while (embers.length < 50) embers.push(spawn(false));
    paint(time / 1000);
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawWall();
      if (!animated) paint(0);
    }, 150);
  };

  return {
    start({ animate = true } = {}) {
      if (running) return;
      running = true;
      animated = animate;
      drawWall();
      addEventListener('resize', onResize);
      if (animate) {
        embers = Array.from({ length: 50 }, () => spawn(true));
        frame = requestAnimationFrame(tick);
      } else {
        embers = [];
        paint(0);
      }
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

export const createBackdrops = (canvas) => ({
  rain: createRain(canvas),
  marble: createMarble(canvas),
  runestones: createRunestones(canvas),
});
