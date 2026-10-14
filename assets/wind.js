// ---- Gas / fluid background ---------------------------------------------
// Soft translucent clouds drifting along a flow field, blending into gas.
// Dark smoke in light mode, luminous gas in dark mode. Scroll stirs it.
(function () {
  var canvas = document.getElementById('wind');
  if (!canvas) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0;
  var particles = [];
  var t = 0;
  var raf = null;
  var color = [22, 24, 28];
  var mode = 'source-over';   // blending; 'lighter' in dark mode
  var sprite = null;          // pre-rendered soft blob
  var scrollVel = 0;

  // --- theme-aware colour, blend mode, and blob sprite ---
  function isDark() {
    var theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function makeSprite() {
    var R = 128;
    var s = document.createElement('canvas');
    s.width = s.height = R * 2;
    var g = s.getContext('2d');
    var grad = g.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',1)');
    grad.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, R * 2, R * 2);
    sprite = s;
  }
  function updateTheme() {
    var dark = isDark();
    color = dark ? [150, 210, 230] : [30, 34, 40]; // light gas vs dark smoke
    mode = dark ? 'lighter' : 'source-over';
    makeSprite();
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
    var count = Math.min(Math.floor((w * h) / 26000), 120);
    particles = [];
    for (var i = 0; i < count; i++) particles.push(spawn());
  }

  function spawn() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 55 + Math.random() * 95,
      a: 0.05 + Math.random() * 0.05,
      age: Math.random() * 300,
      life: 200 + Math.random() * 320
    };
  }

  // smooth, cheap flow field — gentle rightward drift
  function field(x, y) {
    return (
      Math.sin(x * 0.0015 + t * 0.6) +
      Math.sin(y * 0.0020 - t * 0.4) +
      Math.sin((x + y) * 0.0009 + t * 0.3)
    ) * 0.6;
  }

  function frame() {
    t += 0.0015;

    var push = scrollVel * 0.01;
    if (push > 1.6) push = 1.6; else if (push < -1.6) push = -1.6;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = mode;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = field(p.x, p.y);

      p.x += (Math.cos(a) * 0.6 + 0.45) * 0.6;
      p.y += (Math.sin(a) * 0.8 + push) * 0.6;
      p.age++;

      // fade each cloud in and out across its life (no popping)
      var k = p.age / p.life;
      var env = Math.sin(Math.PI * Math.max(0, Math.min(1, k)));
      ctx.globalAlpha = p.a * env;
      ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);

      if (p.x > w + p.r || p.y < -p.r || p.y > h + p.r || p.age > p.life) {
        particles[i] = spawn();
        particles[i].x = Math.random() * w; // reappear anywhere
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    scrollVel *= 0.90;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // --- wiring ---
  updateTheme();
  resize();
  start();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });

  var lastScrollY = window.pageYOffset || 0;
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset || 0;
    scrollVel += (y - lastScrollY);
    lastScrollY = y;
    if (scrollVel > 600) scrollVel = 600;
    else if (scrollVel < -600) scrollVel = -600;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  new MutationObserver(updateTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change')
      : mq.addListener.bind(mq))(updateTheme);
  }
})();
