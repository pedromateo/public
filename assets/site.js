(function() {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'pm-theme';

  // 1. Theme initialization & toggle
  try {
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      root.setAttribute('data-theme', savedTheme);
    }
  } catch (e) {}

  var themeBtn = document.getElementById('theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var current = root.getAttribute('data-theme');
      if (!current) {
        current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  // 2. Stage dynamic ambient background layers
  var stage = document.getElementById('stage');
  var panels = [].slice.call(document.querySelectorAll('.hero, .project'));
  var layers = [];

  if (stage) {
    panels.forEach(function(el) {
      var bg = (el.getAttribute('data-bg') || '#3f51e0 #06b6d4').split(' ');
      var layer = document.createElement('div');
      layer.className = 'layer';
      layer.style.setProperty('--c1', bg[0]);
      layer.style.setProperty('--c2', bg[1] || bg[0]);
      stage.appendChild(layer);
      layers.push(layer);
    });
  }

  // 3. Mini header project icons synchronization
  var miniContainer = document.getElementById('mini');
  var heroIndex = document.querySelector('.index');
  var topHeader = document.querySelector('.top');
  var miniLinks = [];

  if (miniContainer && heroIndex) {
    var indexLinks = [].slice.call(heroIndex.querySelectorAll('a'));
    miniLinks = indexLinks.map(function(link) {
      var href = link.getAttribute('href');
      var name = link.querySelector('b') ? link.querySelector('b').textContent : '';
      var img = link.querySelector('img');

      var a = document.createElement('a');
      a.href = href;
      a.title = name;
      a.setAttribute('aria-label', name);

      if (img) {
        var miniImg = document.createElement('img');
        miniImg.src = img.getAttribute('src');
        miniImg.alt = name;
        a.appendChild(miniImg);
      }

      miniContainer.appendChild(a);
      return a;
    });
  }

  var activeLayerIndex = -1;
  var activeMiniIndex = -1;
  var ticking = false;

  function updateScrollState() {
    ticking = false;
    var vh = window.innerHeight;
    var topThreshold = 140;

    // Mini icons visibility toggle
    if (heroIndex && topHeader) {
      var indexBottom = heroIndex.getBoundingClientRect().bottom;
      var showMinis = indexBottom < topHeader.offsetHeight + 40;
      root.classList.toggle('minis', showMinis);
    }

    // Determine current active panel
    var activeIndex = 0;
    panels.forEach(function(panel, idx) {
      var rect = panel.getBoundingClientRect();
      if (rect.top <= vh * 0.45) {
        activeIndex = idx;
      }
    });

    // Update ambient layer
    if (activeIndex !== activeLayerIndex && layers.length > activeIndex) {
      if (activeLayerIndex >= 0 && layers[activeLayerIndex]) {
        layers[activeLayerIndex].classList.remove('on');
      }
      layers[activeIndex].classList.add('on');
      activeLayerIndex = activeIndex;
    }

    // Update mini header icons (hero is index 0, so project 1 is activeIndex - 1)
    var projectIndex = activeIndex - 1;
    if (projectIndex !== activeMiniIndex) {
      if (activeMiniIndex >= 0 && miniLinks[activeMiniIndex]) {
        miniLinks[activeMiniIndex].classList.remove('on');
        miniLinks[activeMiniIndex].removeAttribute('aria-current');
      }

      activeMiniIndex = projectIndex;

      if (projectIndex >= 0 && miniLinks[projectIndex]) {
        var activeEl = miniLinks[projectIndex];
        activeEl.classList.add('on');
        activeEl.setAttribute('aria-current', 'true');

        if (miniContainer && miniContainer.scrollWidth > miniContainer.clientWidth) {
          miniContainer.scrollTo({
            left: activeEl.offsetLeft - (miniContainer.clientWidth / 2) + (activeEl.offsetWidth / 2),
            behavior: 'smooth'
          });
        }
      }
    }
  }

  function requestTick() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScrollState);
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);

  // Initial call
  updateScrollState();
  window.addEventListener('DOMContentLoaded', updateScrollState);

  // Smooth scroll activation after initialization
  window.requestAnimationFrame(function() {
    root.classList.add('smooth');
  });

  // Tab switching inside .term or preview cards
  document.querySelectorAll('[data-tabs]').forEach(function(card) {
    var tabs = [].slice.call(card.querySelectorAll('[role=tab]'));
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) {
          var isSelected = (t === tab);
          t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          t.classList.toggle('active', isSelected);
          var targetId = t.getAttribute('aria-controls');
          var panel = targetId ? document.getElementById(targetId) : null;
          if (panel) {
            panel.hidden = !isSelected;
          }
        });
      });
    });
  });

})();
