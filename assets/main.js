(function () {
  var root = document.documentElement;
  var saved = localStorage.getItem('theme');

  if (saved) {
    root.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }

  var btn = document.getElementById('themeToggle');

  function updateThemeLabel() {
    var current = root.getAttribute('data-theme') || 'light';
    btn.setAttribute('aria-label', current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  if (btn) {
    updateThemeLabel();
    btn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeLabel();
    });
  }
})();

(function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
