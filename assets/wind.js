// ---- Wind / air background ----------------------------------------------
// Flowing streamlines drifting sideways like air currents.
// Dark strokes in light mode, light strokes in dark mode. Self-contained.
(function () {
  var canvas = document.getElementById('wind');
  if (!canvas) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // respect reduced-motion: leave the page calm

  var ctx = canvas.getContext('2d', { alpha: true });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0;
  var particles = [];
  var t = 0;
  var raf = null;
  var color = [25, 27, 30]; // updated by theme

  // --- theme-aware stroke colour ---
  function isDark() {
    var theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function updateColor() {
    // light mode -> dark wind (ink) ; dark mode -> light wind
    color = isDark() ? [232, 234, 237] : [22, 24, 28];
  }

  // --- sizing ---
  function resize() {
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    var count = Math.min(Math.floor((w * h) / 20000), 170);
    particles = [];
    for (var i = 0; i < count; i++) particles.push(spawn());
  }

  // always respawn somewhere across the whole canvas so coverage stays even
  function spawn() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      age: 0,
      life: 140 + Math.random() * 260
    };
  }

  // smooth, cheap flow field — biased to a gentle rightward drift
  function field(x, y) {
    return (
      Math.sin(x * 0.0016 + t * 0.6) +
      Math.sin(y * 0.0021 - t * 0.4) +
      Math.sin((x + y) * 0.0010 + t * 0.3)
    ) * 0.6;
  }

  var STEPS = 16;   // length of each streak (segments)
  var SEG = 4;      // px per segment
  var DRIFT = 1.1;  // how fast streaks travel

  function frame() {
    t += 0.0016;

    // clear fully every frame — no residue, no clutter
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    var c = color;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // trace a short streak backward along the flow, fading toward the tail
      var sx = p.x, sy = p.y;
      for (var k = 0; k < STEPS; k++) {
        var a = field(sx, sy);
        var nx = sx - (Math.cos(a) * 0.6 + 0.95) * SEG;
        var ny = sy - Math.sin(a) * 0.9 * SEG;
        var fade = 1 - k / STEPS;
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.42 * fade) + ')';
        ctx.lineWidth = 1.1 * fade + 0.25;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        sx = nx; sy = ny;
      }

      // advance the streak head along the flow (rightward drift)
      var a0 = field(p.x, p.y);
      p.x += (Math.cos(a0) * 0.6 + 0.95) * DRIFT;
      p.y += Math.sin(a0) * 0.9 * DRIFT;
      p.age++;

      if (p.x > w + 90 || p.y < -90 || p.y > h + 90 || p.age > p.life) {
        particles[i] = spawn();
      }
    }

    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // --- wiring ---
  updateColor();
  resize();
  start();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  // react to theme toggle + OS theme change
  new MutationObserver(updateColor).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change')
      : mq.addListener.bind(mq))(updateColor);
  }
})();
