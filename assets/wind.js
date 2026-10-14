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
    var count = Math.min(Math.floor((w * h) / 6500), 520);
    particles = [];
    for (var i = 0; i < count; i++) particles.push(spawn(true));
  }

  function spawn(anywhere) {
    return {
      x: anywhere ? Math.random() * w : -20,
      y: Math.random() * h,
      age: 0,
      life: 60 + Math.random() * 180
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

  function frame() {
    t += 0.0016;

    // fade previous strokes toward transparent (leaves soft trails)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.045)';
    ctx.fillRect(0, 0, w, h);

    // draw
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0.5)';

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = field(p.x, p.y);
      var vx = Math.cos(a) * 0.6 + 0.95; // base wind to the right
      var vy = Math.sin(a) * 0.9;
      var nx = p.x + vx * 1.3;
      var ny = p.y + vy * 1.3;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      p.x = nx; p.y = ny; p.age++;

      if (p.x > w + 20 || p.y < -20 || p.y > h + 20 || p.age > p.life) {
        particles[i] = spawn(false);
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
