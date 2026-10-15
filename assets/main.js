// ---- Theme toggle (respects saved choice, then system preference) ----
(function () {
  var root = document.documentElement;
  var saved = localStorage.getItem('theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }
  // otherwise: light (the default, no attribute needed)
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }
})();

// ---- Reveal on scroll ----
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

// ---- Current year in footer ----
(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

// ---- Terminal: tabs + draggable window ----
(function () {
  var term = document.getElementById('heroTerm');
  var bar = document.getElementById('termBar');
  if (!term || !bar) return;

  var tabs = term.querySelectorAll('.term-tab');
  var panels = term.querySelectorAll('[data-panel]');

  // tab switching
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      var id = this.getAttribute('data-tab');
      for (var j = 0; j < tabs.length; j++) {
        var on = tabs[j] === this;
        tabs[j].classList.toggle('is-active', on);
        tabs[j].setAttribute('aria-selected', on ? 'true' : 'false');
      }
      for (var k = 0; k < panels.length; k++) {
        panels[k].hidden = panels[k].getAttribute('data-panel') !== id;
      }
    }.bind(tabs[i]));
  }

  // drag by the title bar
  var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, px = 0, py = 0;
  bar.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.term-tab')) return; // let tab clicks through
    dragging = true; sx = e.clientX; sy = e.clientY; ox = px; oy = py;
    term.classList.add('is-dragging');
    try { bar.setPointerCapture(e.pointerId); } catch (_) {}
  });
  bar.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    px = ox + (e.clientX - sx);
    py = oy + (e.clientY - sy);
    term.style.transform = 'translate(' + px + 'px,' + py + 'px)';
  });
  function end(e) {
    if (!dragging) return;
    dragging = false;
    term.classList.remove('is-dragging');
    try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
})();

// ---- Interactive bash (easter egg) ----
(function () {
  var screen = document.getElementById('termScreen');
  var out = document.getElementById('termOut');
  var input = document.getElementById('termInput');
  var pathEl = document.getElementById('termPath');
  if (!screen || !out || !input) return;

  var cwd = '~', hist = [], hi = 0;

  var FILES = {
    'about.txt': 'Roberto Isaac — Platform Engineer & IT Consultant\nIndependent consultancy: Roberto Isaac Consulting AB\nDevSecOps · Infrastructure as Code · CI/CD · 7+ years',
    'skills.txt': 'Terraform  Ansible  Vault  Packer  Docker  Kubernetes\nAWS  OpenStack  Python  Go  Bash  GitLab CI  GitHub Actions',
    'experience.txt': 'Saab       Platform Engineer        2025-now\nEricsson   Service Architect         2024-2025\nEricsson   DevOps / Network Tools    2022-2024\nEricsson   DevOps / Monitoring       2020-2022',
    'certifications.txt': 'HashiCorp Terraform Associate   2025\nRed Hat RHCSA                   2022\nCisco CCNA                      2019\nCCENT                           2019',
    'contact.txt': 'email:    contact@RIConsulting.se\nlinkedin: /in/roberto-isaac-2215a817a\ngithub:   @robisa693',
    '.secret': 'You found the secret file. ☕\nThis portfolio was lovingly over-engineered.\nTry:  neofetch   ·   sudo make-me-a-coffee'
  };
  var PROJECTS = {
    'TAC+': 'Dockerized TACACS+ in an isolated, repo-less env. Automated GitLab CI/CD.',
    'BGP-Flowspec': 'DDoS mitigation via BGP Flowspec — major firewall load reduction.',
    'gRPC-collector': 'Multi-site metric collector with automated device config.',
    'README.md': 'Selected projects from the Ericsson network-tools years.'
  };

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function line(html) { var d = document.createElement('div'); d.innerHTML = html; out.appendChild(d); }
  function text(s) { var d = document.createElement('div'); d.textContent = s; out.appendChild(d); }
  function ps1() { return '<span class="c-prompt">roberto@ri</span><span class="c-dim">:</span><span class="c-path">' + cwd + '</span><span class="c-dim">$</span>'; }

  var CMDS = {
    help: function () {
      text('Available commands:');
      text('  ls [-a]     list files         cat <file>  show a file');
      text('  cd <dir>    change directory    pwd         print path');
      text('  whoami      print user          echo <txt>  print text');
      text('  date        current date        history     past commands');
      text('  neofetch    system info         clear       clear screen');
      text("  (a few more are hidden... \u{1F95A})");
    },
    ls: function (a) {
      // parse any flag cluster: -a, -la, -al, -l -a, ... (show all if 'a' present)
      var flags = (a || '').split(/\s+/).filter(function (t) { return t.charAt(0) === '-'; }).join('');
      var all = flags.indexOf('a') >= 0;
      if (cwd === '~/projects') { text(Object.keys(PROJECTS).join('   ')); return; }
      var names = Object.keys(FILES).filter(function (f) { return all || f.charAt(0) !== '.'; });
      var html = names.map(esc).join('   ') + '   <span class="c-path">projects/</span>';
      if (all) html = '<span class="c-dim">.   ..</span>   ' + html;
      line(html);
    },
    cat: function (a) {
      var f = a.trim();
      if (!f) { text('usage: cat <file>'); return; }
      var store = cwd === '~/projects' ? PROJECTS : FILES;
      if (Object.prototype.hasOwnProperty.call(store, f)) text(store[f]);
      else text('cat: ' + f + ': No such file or directory');
    },
    cd: function (a) {
      var d = a.trim();
      if (!d || d === '~' || d === '/' || d === '..') cwd = '~';
      else if (d === 'projects' && cwd === '~') cwd = '~/projects';
      else { text('cd: ' + d + ': No such file or directory'); return; }
      if (pathEl) pathEl.textContent = cwd;
    },
    pwd: function () { text(cwd === '~' ? '/home/roberto' : '/home/roberto/projects'); },
    whoami: function () { text('roberto'); },
    echo: function (a) { text(a); },
    date: function () { text(new Date().toString()); },
    history: function () { for (var i = 0; i < hist.length; i++) text('  ' + (i + 1) + '  ' + hist[i]); },
    clear: function () { out.innerHTML = ''; },
    uname: function (a) { text(a.indexOf('-a') >= 0 ? 'Linux ri-platform 6.6.0-riconsulting #1 SMP x86_64 GNU/Linux' : 'Linux'); },
    sudo: function () { line('<span class="c-dim">roberto is not in the sudoers file. This incident has been reported. \u{1F60F}</span>'); },
    exit: function () { line('<span class="c-dim">There is no escape — just switch tabs ↑</span>'); },
    coffee: function () { text('☕  brewing... done.'); },
    neofetch: function () {
      line('<span class="c-prompt">█▀█ █</span>  roberto@ri');
      line('<span class="c-prompt">█▀▄ █</span>  OS: RIConsulting Linux x86_64');
      line('<span class="c-prompt">▀ ▀ ▀</span>  Shell: bash (easter egg edition)');
      text('       Stack: Terraform · Kubernetes · Ansible');
      text('       Uptime: 7+ years   Coffee: ∞');
    }
  };
  CMDS['make-me-a-coffee'] = CMDS.coffee;
  CMDS.sl = function () { text('\u{1F682} choo choo!'); };
  CMDS.ll = CMDS.ls;
  CMDS.la = function (a) { CMDS.ls('-a ' + (a || '')); };
  CMDS.dir = CMDS.ls;

  function run(raw) {
    var cmd = raw.trim();
    if (!cmd) return;
    hist.push(cmd); hi = hist.length;
    var sp = cmd.indexOf(' ');
    var name = sp < 0 ? cmd : cmd.slice(0, sp);
    var arg = sp < 0 ? '' : cmd.slice(sp + 1);
    if (Object.prototype.hasOwnProperty.call(CMDS, name)) CMDS[name](arg);
    else text('bash: ' + name + ': command not found');
  }

  function submit() {
    var val = input.value;
    line(ps1() + '&nbsp;' + esc(val));
    input.value = '';
    run(val);
    screen.scrollTop = screen.scrollHeight;
  }

  // ---- tab completion ----
  var HIDDEN = { sl: 1, coffee: 1, 'make-me-a-coffee': 1, exit: 1, sudo: 1, uname: 1, dir: 1 };
  function commonPrefix(arr) {
    var p = arr[0];
    for (var i = 1; i < arr.length; i++) {
      while (arr[i].indexOf(p) !== 0) { p = p.slice(0, -1); if (!p) return ''; }
    }
    return p;
  }
  function complete() {
    var val = input.value;
    if (/\s$/.test(val)) return; // nothing partial to complete
    var parts = val.split(/\s+/);
    var editing = parts[parts.length - 1];
    var isCmd = parts.length === 1;
    var pool;
    if (isCmd) {
      pool = Object.keys(CMDS).filter(function (c) { return !HIDDEN[c]; });
    } else {
      pool = (cwd === '~/projects' ? Object.keys(PROJECTS)
        : Object.keys(FILES).filter(function (f) { return f !== '.secret'; }).concat(['projects']));
    }
    var matches = pool.filter(function (n) { return n.indexOf(editing) === 0; });
    if (!matches.length) return;
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      input.value = parts.join(' ') + (isCmd ? ' ' : '');
    } else {
      var cp = commonPrefix(matches);
      if (cp.length > editing.length) {
        parts[parts.length - 1] = cp;
        input.value = parts.join(' ');
      } else {
        line(ps1() + '&nbsp;' + esc(val));
        text(matches.join('   '));
        screen.scrollTop = screen.scrollHeight;
      }
    }
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) { hi--; input.value = hist[hi] || ''; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length) { hi++; input.value = hist[hi] || ''; } }
    else if ((e.key === 'l' || e.key === 'L') && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });

  // click the screen to focus the prompt (but not while selecting text or dragging)
  screen.addEventListener('click', function () {
    if (window.getSelection && String(window.getSelection())) return;
    input.focus();
  });
})();
