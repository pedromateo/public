/**
 * PASTELERÍA SANZ - COMPONENTES INTERACTIVOS DE LA LANDING
 * Carruseles responsive táctiles y visor Lightbox moderno.
 */

(function () {
  'use strict';

  // ========================================================================
  // 1. GESTIÓN DE CARRUSELES RESPONSIVE
  // ========================================================================
  function initCarousel(carouselEl) {
    var track = carouselEl.querySelector('.sanz-carousel-track');
    var slides = carouselEl.querySelectorAll('.sanz-carousel-slide');
    var prevBtn = carouselEl.querySelector('.sanz-carousel-arrow-prev');
    var nextBtn = carouselEl.querySelector('.sanz-carousel-arrow-next');
    var dotsContainer = carouselEl.querySelector('.sanz-carousel-dots');
    var currentCounter = carouselEl.querySelector('.sanz-carousel-current');
    var totalCounter = carouselEl.querySelector('.sanz-carousel-total');

    if (!track || !slides.length) return;

    var totalSlides = slides.length;
    if (totalCounter) totalCounter.textContent = totalSlides;

    // Crear botones de paginación (dots)
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (var i = 0; i < totalSlides; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'sanz-carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
        dot.dataset.index = i;
        dotsContainer.appendChild(dot);
      }
    }

    var dots = dotsContainer ? dotsContainer.querySelectorAll('.sanz-carousel-dot') : [];

    function getSlideStep() {
      if (slides.length > 1) {
        return slides[1].offsetLeft - slides[0].offsetLeft;
      }
      return track.clientWidth;
    }

    function updateActiveState() {
      var step = getSlideStep();
      if (!step) return;

      var currentIdx = Math.round(track.scrollLeft / step);
      if (currentIdx < 0) currentIdx = 0;
      if (currentIdx >= totalSlides) currentIdx = totalSlides - 1;

      if (currentCounter) {
        currentCounter.textContent = (currentIdx + 1);
      }

      if (dots.length) {
        dots.forEach(function (d, idx) {
          if (idx === currentIdx) {
            d.classList.add('active');
          } else {
            d.classList.remove('active');
          }
        });
      }

      if (prevBtn) {
        prevBtn.disabled = track.scrollLeft <= 5;
      }
      if (nextBtn) {
        var maxScroll = track.scrollWidth - track.clientWidth - 5;
        nextBtn.disabled = track.scrollLeft >= maxScroll;
      }
    }

    // Botón anterior
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        var step = getSlideStep();
        track.scrollBy({ left: -step, behavior: 'smooth' });
      });
    }

    // Botón siguiente
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var step = getSlideStep();
        track.scrollBy({ left: step, behavior: 'smooth' });
      });
    }

    // Clic en dots
    if (dotsContainer) {
      dotsContainer.addEventListener('click', function (e) {
        var target = e.target.closest('.sanz-carousel-dot');
        if (!target) return;
        var idx = parseInt(target.dataset.index, 10);
        if (slides[idx]) {
          track.scrollTo({ left: slides[idx].offsetLeft, behavior: 'smooth' });
        }
      });
    }

    // Sincronización al desplazar (scroll throttle con rAF)
    var isScrolling = false;
    track.addEventListener('scroll', function () {
      if (!isScrolling) {
        window.requestAnimationFrame(function () {
          updateActiveState();
          isScrolling = false;
        });
        isScrolling = true;
      }
    }, { passive: true });

    // Arrastre con ratón en escritorio (Mouse drag)
    var isDown = false;
    var startX;
    var scrollLeftStart;
    var hasDragged = false;

    track.addEventListener('mousedown', function (e) {
      isDown = true;
      hasDragged = false;
      startX = e.pageX - track.offsetLeft;
      scrollLeftStart = track.scrollLeft;
    });

    window.addEventListener('mouseup', function () {
      isDown = false;
    });

    track.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      var x = e.pageX - track.offsetLeft;
      var walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) {
        hasDragged = true;
        track.scrollLeft = scrollLeftStart - walk;
      }
    });

    track.addEventListener('click', function (e) {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Estado inicial
    updateActiveState();
    window.addEventListener('resize', updateActiveState);
  }

  // ========================================================================
  // 2. VISOR LIGHTBOX ELEGANTE Y RESPONSIVE
  // ========================================================================
  var lightbox = {
    el: null,
    img: null,
    caption: null,
    currentGroup: [],
    currentIndex: 0,

    init: function () {
      var self = this;

      // Crear estructura modal en el DOM
      var modal = document.createElement('div');
      modal.className = 'sanz-lightbox';
      modal.id = 'sanzLightbox';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-hidden', 'true');

      modal.innerHTML =
        '<div class="sanz-lightbox-backdrop"></div>' +
        '<div class="sanz-lightbox-dialog">' +
          '<button class="sanz-lightbox-close" aria-label="Cerrar vista">&times;</button>' +
          '<button class="sanz-lightbox-nav sanz-lightbox-nav-prev" aria-label="Foto anterior">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
          '</button>' +
          '<figure class="sanz-lightbox-figure">' +
            '<img class="sanz-lightbox-img" src="" alt="" />' +
            '<figcaption class="sanz-lightbox-caption"></figcaption>' +
          '</figure>' +
          '<button class="sanz-lightbox-nav sanz-lightbox-nav-next" aria-label="Foto siguiente">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
          '</button>' +
        '</div>';

      document.body.appendChild(modal);

      self.el = modal;
      self.img = modal.querySelector('.sanz-lightbox-img');
      self.caption = modal.querySelector('.sanz-lightbox-caption');

      // Cerrar
      modal.querySelector('.sanz-lightbox-backdrop').addEventListener('click', function () { self.close(); });
      modal.querySelector('.sanz-lightbox-close').addEventListener('click', function () { self.close(); });

      // Navegación
      modal.querySelector('.sanz-lightbox-nav-prev').addEventListener('click', function (e) {
        e.stopPropagation();
        self.prev();
      });
      modal.querySelector('.sanz-lightbox-nav-next').addEventListener('click', function (e) {
        e.stopPropagation();
        self.next();
      });

      // Teclado (Esc, Flechas)
      document.addEventListener('keydown', function (e) {
        if (!self.el.classList.contains('active')) return;
        if (e.key === 'Escape') self.close();
        if (e.key === 'ArrowLeft') self.prev();
        if (e.key === 'ArrowRight') self.next();
      });

      // Deslizar táctil en móviles para cambiar imagen o cerrar
      var touchStartX = 0;
      var touchStartY = 0;
      modal.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      modal.addEventListener('touchend', function (e) {
        if (e.changedTouches.length === 1) {
          var deltaX = e.changedTouches[0].clientX - touchStartX;
          var deltaY = e.changedTouches[0].clientY - touchStartY;

          // Deslizamiento horizontal
          if (Math.abs(deltaX) > 45 && Math.abs(deltaY) < 60) {
            if (deltaX < 0) {
              self.next();
            } else {
              self.prev();
            }
          }
          // Deslizamiento vertical hacia abajo para cerrar
          else if (deltaY > 90 && Math.abs(deltaX) < 60) {
            self.close();
          }
        }
      }, { passive: true });

      // Vincular elementos disparadores
      self.bindTriggers();
    },

    bindTriggers: function () {
      var self = this;
      document.addEventListener('click', function (e) {
        var trigger = e.target.closest('.sanz-lightbox-trigger');
        if (!trigger) return;

        e.preventDefault();
        var groupName = trigger.dataset.lightbox || 'default';
        var allInGroup = Array.from(document.querySelectorAll('.sanz-lightbox-trigger[data-lightbox="' + groupName + '"]'));
        
        self.currentGroup = allInGroup.map(function (el) {
          return {
            src: el.getAttribute('href') || el.dataset.src,
            caption: el.dataset.caption || el.getAttribute('title') || '',
            alt: (el.querySelector('img') ? el.querySelector('img').getAttribute('alt') : '') || ''
          };
        });

        self.currentIndex = allInGroup.indexOf(trigger);
        if (self.currentIndex < 0) self.currentIndex = 0;

        self.open();
      });
    },

    open: function () {
      if (!this.currentGroup.length) return;
      this.updateContent();
      this.el.classList.add('active');
      this.el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },

    close: function () {
      this.el.classList.remove('active');
      this.el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    },

    prev: function () {
      if (!this.currentGroup.length) return;
      this.currentIndex = (this.currentIndex - 1 + this.currentGroup.length) % this.currentGroup.length;
      this.updateContent();
    },

    next: function () {
      if (!this.currentGroup.length) return;
      this.currentIndex = (this.currentIndex + 1) % this.currentGroup.length;
      this.updateContent();
    },

    updateContent: function () {
      var item = this.currentGroup[this.currentIndex];
      if (!item) return;

      this.img.src = item.src;
      this.img.alt = item.alt || item.caption || 'Pastelería Sanz';

      var total = this.currentGroup.length;
      var counterText = total > 1 ? ' (' + (this.currentIndex + 1) + ' / ' + total + ')' : '';

      if (item.caption) {
        this.caption.textContent = item.caption + counterText;
        this.caption.style.display = 'block';
      } else if (total > 1) {
        this.caption.textContent = 'Fotografía ' + (this.currentIndex + 1) + ' de ' + total;
        this.caption.style.display = 'block';
      } else {
        this.caption.style.display = 'none';
      }
    }
  };

  // Inicializar todo al cargar el DOM
  document.addEventListener('DOMContentLoaded', function () {
    var carousels = document.querySelectorAll('.sanz-carousel');
    carousels.forEach(function (c) {
      initCarousel(c);
    });

    lightbox.init();
  });
})();
