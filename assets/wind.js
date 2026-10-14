// ---- Background effects: swirling lines / frosted dots / gas -------------
// Three switchable backgrounds. 2D effects draw to #fx-2d, the WebGL gas to
// #fx-gl, and #frost is a frosted-glass screen used by the dots effect.
(function () {
  var c2d = document.getElementById('fx-2d');
  var cgl = document.getElementById('fx-gl');
  var frost = document.getElementById('frost');
  if (!c2d || !cgl) return;

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, t = 0, scrollVel = 0;
  var ctx = c2d.getContext('2d');

  function isDark() {
    var th = document.documentElement.getAttribute('data-theme');
    if (th === 'dark') return true;
    if (th === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function field(x, y) {
    return (
      Math.sin(x * 0.0015 + t * 0.6) +
      Math.sin(y * 0.0020 - t * 0.4) +
      Math.sin((x + y) * 0.0009 + t * 0.3)
    ) * 0.6;
  }
  function size2d() {
    W = window.innerWidth; H = window.innerHeight;
    c2d.width = Math.floor(W * dpr); c2d.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ========================= SWIRLING LINES ============================
  var streaks = (function () {
    var parts = [], color = [22, 24, 28];
    var STEPS = 16, SEG = 4, DRIFT = 0.55;
    function spawn() {
      return { x: Math.random() * W, y: Math.random() * H, age: 0, life: 140 + Math.random() * 260 };
    }
    return {
      onTheme: function () { color = isDark() ? [232, 234, 237] : [22, 24, 28]; },
      seed: function () { parts = []; var n = Math.min(Math.floor((W * H) / 20000), 170); for (var i = 0; i < n; i++) parts.push(spawn()); },
      frame: function () {
        var push = scrollVel * 0.01; if (push > 1.6) push = 1.6; else if (push < -1.6) push = -1.6;
        ctx.clearRect(0, 0, W, H); ctx.lineCap = 'round'; var c = color;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], sx = p.x, sy = p.y;
          for (var k = 0; k < STEPS; k++) {
            var a = field(sx, sy);
            var nx = sx - (Math.cos(a) * 0.6 + 0.95) * SEG;
            var ny = sy - (Math.sin(a) * 0.9 + push) * SEG;
            var fade = 1 - k / STEPS;
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.34 * fade) + ')';
            ctx.lineWidth = 1.1 * fade + 0.25;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(nx, ny); ctx.stroke();
            sx = nx; sy = ny;
          }
          var a0 = field(p.x, p.y);
          p.x += (Math.cos(a0) * 0.6 + 0.95) * DRIFT;
          p.y += (Math.sin(a0) * 0.9 + push) * DRIFT; p.age++;
          if (p.x > W + 90 || p.y < -90 || p.y > H + 90 || p.age > p.life) parts[i] = spawn();
        }
      }
    };
  })();

  // ========================= FROSTED DOTS ==============================
  var dots = (function () {
    var parts = [], sprite = null, dark = false;
    function makeSprite() {
      var col = dark ? [150, 210, 230] : [16, 18, 22];
      var R = 128, s = document.createElement('canvas'); s.width = s.height = R * 2;
      var g = s.getContext('2d');
      var grad = g.createRadialGradient(R, R, 0, R, R, R);
      grad.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',1)');
      grad.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)');
      g.fillStyle = grad; g.fillRect(0, 0, R * 2, R * 2); sprite = s;
    }
    function spawn() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: (0.07 + Math.random() * 0.10) * Math.min(W, H), // scales with screen
        a: (dark ? 0.06 : 0.14) + Math.random() * (dark ? 0.05 : 0.08),
        age: Math.random() * 300, life: 200 + Math.random() * 320
      };
    }
    return {
      onTheme: function () { dark = isDark(); makeSprite(); },
      seed: function () { parts = []; var n = Math.max(45, Math.min(Math.floor((W * H) / 15000), 130)); for (var i = 0; i < n; i++) parts.push(spawn()); },
      frame: function () {
        var push = scrollVel * 0.01; if (push > 1.6) push = 1.6; else if (push < -1.6) push = -1.6;
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], a = field(p.x, p.y);
          p.x += (Math.cos(a) * 0.6 + 0.45) * 0.6;
          p.y += (Math.sin(a) * 0.8 + push) * 0.6; p.age++;
          var env = Math.sin(Math.PI * Math.max(0, Math.min(1, p.age / p.life)));
          ctx.globalAlpha = p.a * env;
          ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
          if (p.x > W + p.r || p.y < -p.r || p.y > H + p.r || p.age > p.life) parts[i] = spawn();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    };
  })();

  // ============================== GAS (WebGL) ==========================
  var gas = (function () {
    var gl = cgl.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return null;
    var SCALE = 0.6;
    var VERT = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';
    var FRAG = [
      'precision highp float;varying vec2 vUv;uniform vec2 uRes;uniform float uTime;uniform float uDark;',
      'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
      'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
      'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
      'float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
      'vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
      'vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);',
      'vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
      'vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;',
      'vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;',
      'm*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
      'return 130.0*dot(m,g);}',
      'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.0;a*=0.5;}return v;}',
      'void main(){float aspect=uRes.x/uRes.y;vec2 p=vec2(vUv.x*aspect,vUv.y)*2.2;float tt=uTime*0.03;',
      'vec2 q=vec2(fbm(p+tt),fbm(p+vec2(5.2,1.3)-tt));',
      'vec2 r=vec2(fbm(p+1.6*q+vec2(1.7,9.2)+tt*0.7),fbm(p+1.6*q+vec2(8.3,2.8)-tt*0.7));',
      'float f=fbm(p+2.0*r);float v=clamp(f*0.5+0.5,0.0,1.0);v=smoothstep(0.32,0.98,v);',
      'vec3 smoke=vec3(0.09,0.10,0.12);vec3 gg=vec3(0.45,0.78,0.92);vec3 col=mix(smoke,gg,uDark);',
      'float maxA=mix(0.5,0.55,uDark);gl_FragColor=vec4(col,v*maxA);}'
    ].join('\n');
    function compile(ty, src) { var s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'),
        uDark = gl.getUniformLocation(prog, 'uDark');
    var t0 = performance.now();
    return {
      isGL: true,
      onTheme: function () { gl.useProgram(prog); gl.uniform1f(uDark, isDark() ? 1.0 : 0.0); },
      size: function () {
        var w = Math.max(1, Math.floor(window.innerWidth * SCALE));
        var h = Math.max(1, Math.floor(window.innerHeight * SCALE));
        cgl.width = w; cgl.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h);
      },
      frame: function () {
        gl.uniform1f(uTime, (performance.now() - t0) * 0.001);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  })();

  // ============================== CONTROLLER ===========================
  var MODES = { streaks: streaks, dots: dots, gas: gas };
  var active = null, activeName = '', raf = null;

  function loop() { t += 0.0015; if (active) active.frame(); scrollVel *= 0.90; raf = requestAnimationFrame(loop); }
  function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  function setMode(name) {
    if (!MODES[name] || (name === 'gas' && !gas)) name = 'streaks';
    stop();
    activeName = name; active = MODES[name];
    var is2d = name !== 'gas';
    c2d.hidden = !is2d;
    cgl.hidden = name !== 'gas';
    frost.hidden = name !== 'dots';
    if (is2d) { size2d(); active.onTheme(); if (active.seed) active.seed(); }
    else { active.size(); active.onTheme(); }
    try { localStorage.setItem('bgfx', name); } catch (e) {}
    var btns = document.querySelectorAll('.fx-switch button');
    for (var i = 0; i < btns.length; i++)
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-fx') === name ? 'true' : 'false');
    start();
  }

  // --- wiring ---
  var saved = 'streaks';
  try { saved = localStorage.getItem('bgfx') || 'streaks'; } catch (e) {}
  setMode(saved);

  var btns = document.querySelectorAll('.fx-switch button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () { setMode(this.getAttribute('data-fx')); });
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (activeName === 'gas') active.size();
      else { size2d(); if (active.seed) active.seed(); }
    }, 200);
  });

  var lastY = window.pageYOffset || 0;
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset || 0;
    scrollVel += (y - lastY); lastY = y;
    if (scrollVel > 800) scrollVel = 800; else if (scrollVel < -800) scrollVel = -800;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

  function onTheme() { if (active) active.onTheme(); }
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(onTheme);
  }
})();
