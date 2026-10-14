// ---- Fluid / gas background (WebGL) -------------------------------------
// Domain-warped fractal noise (fbm) — flowing gas, à la woosh.se.
// Dark smoke in light mode, luminous gas in dark mode. Scroll stirs it.
(function () {
  var canvas = document.getElementById('wind');
  if (!canvas) return;

  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return; // graceful: no background if WebGL is unavailable

  var SCALE = 0.6; // internal render scale — gas is soft, so low-res is fine & fast

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uScroll;',
    'uniform float uDark;',
    // Ashima 2D simplex noise
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
    'float snoise(vec2 v){',
    '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
    '  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);',
    '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
    '  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);',
    '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
    '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);',
    '  m=m*m; m=m*m; vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5;',
    '  vec3 ox=floor(x+0.5); vec3 a0=x-ox;',
    '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
    '  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    '  return 130.0*dot(m,g);',
    '}',
    'float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*snoise(p); p*=2.0; a*=0.5; } return v; }',
    'void main(){',
    '  float aspect=uRes.x/uRes.y;',
    '  vec2 p=vec2(vUv.x*aspect,vUv.y)*2.2;',
    '  float tt=uTime*0.03; p.y+=uScroll;',
    // domain warping (Inigo Quilez)
    '  vec2 q=vec2(fbm(p+tt), fbm(p+vec2(5.2,1.3)-tt));',
    '  vec2 r=vec2(fbm(p+1.6*q+vec2(1.7,9.2)+tt*0.7), fbm(p+1.6*q+vec2(8.3,2.8)-tt*0.7));',
    '  float f=fbm(p+2.0*r);',
    '  float v=clamp(f*0.5+0.5,0.0,1.0);',
    '  v=smoothstep(0.32,0.98,v);',
    '  vec3 smoke=vec3(0.09,0.10,0.12);',   // dark smoke (light mode)
    '  vec3 gas=vec3(0.45,0.78,0.92);',     // luminous gas (dark mode)
    '  vec3 col=mix(smoke,gas,uDark);',
    '  float maxA=mix(0.5,0.55,uDark);',
    '  gl_FragColor=vec4(col, v*maxA);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return; // graceful fallback
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uTime = gl.getUniformLocation(prog, 'uTime');
  var uScroll = gl.getUniformLocation(prog, 'uScroll');
  var uDark = gl.getUniformLocation(prog, 'uDark');

  var raf = null, scrollVel = 0, scrollOfs = 0, t0 = performance.now();

  function isDark() {
    var th = document.documentElement.getAttribute('data-theme');
    if (th === 'dark') return true;
    if (th === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function updateTheme() { gl.useProgram(prog); gl.uniform1f(uDark, isDark() ? 1.0 : 0.0); }

  function resize() {
    var w = Math.max(1, Math.floor(window.innerWidth * SCALE));
    var h = Math.max(1, Math.floor(window.innerHeight * SCALE));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }

  function frame() {
    scrollOfs += scrollVel * 0.0012;
    scrollVel *= 0.90;
    scrollOfs *= 0.96; // ease back to rest

    gl.uniform1f(uTime, (performance.now() - t0) * 0.001);
    gl.uniform1f(uScroll, scrollOfs);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // --- wiring ---
  updateTheme();
  resize();
  start();

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });

  var lastY = window.pageYOffset || 0;
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset || 0;
    scrollVel += (y - lastY); lastY = y;
    if (scrollVel > 800) scrollVel = 800; else if (scrollVel < -800) scrollVel = -800;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

  new MutationObserver(updateTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(updateTheme);
  }
})();
