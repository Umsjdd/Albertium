(function() {
  'use strict';

  // ═══ PRELOADER ═══
  if (document.getElementById('preloader')) {
    const preloader = document.getElementById('preloader');
    const preloaderLine = document.getElementById('preloaderLine');

    window.addEventListener('load', () => {
      requestAnimationFrame(() => {
        preloaderLine.classList.add('grow');
      });
      setTimeout(() => {
        preloader.classList.add('done');
        animateHero();
      }, 2500);
      setTimeout(() => { preloader.style.display = 'none'; }, 3400);
    });
  }

  // ═══ HERO ANIMATION ═══
  function animateHero() {
    const lines = document.querySelectorAll('.hero-heading .line-inner');
    const label = document.getElementById('heroLabel');
    const sub = document.getElementById('heroSub');
    const buttons = document.getElementById('heroButtons');

    lines.forEach((line, i) => {
      setTimeout(() => { line.classList.add('visible'); }, 200 + i * 150);
    });
    setTimeout(() => {
      label.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      label.style.opacity = '1';
      label.style.transform = 'translateY(0)';
    }, 300);
    setTimeout(() => {
      sub.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      sub.style.opacity = '1';
      sub.style.transform = 'translateY(0)';
    }, 800);

    // Animate floating shapes
    setTimeout(() => {
      document.querySelectorAll('.arch-shape').forEach((s, i) => {
        setTimeout(() => { s.classList.add('visible'); }, i * 200);
      });
    }, 600);

    // Animate building draw
    setTimeout(() => {
      const bd = document.getElementById('buildingDraw');
      if (bd) bd.classList.add('visible');
    }, 1200);
    setTimeout(() => {
      buttons.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      buttons.style.opacity = '1';
      buttons.style.transform = 'translateY(0)';
    }, 1000);
  }

  // ═══ SCROLL PROGRESS BAR ═══
  const scrollProgress = document.getElementById('scrollProgress');

  function updateScrollProgress() {
    if (!scrollProgress) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = progress + '%';
  }

  // ═══ NAV SCROLL ═══
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function updateNav() {
    if (!nav) return;
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    // Check if over dark section
    const darkSections = document.querySelectorAll('.services, .stats, .footer, [data-dark-section]');
    let onDark = false;
    darkSections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top < 72 && rect.bottom > 72) onDark = true;
    });
    if (onDark && scrollY <= 80) {
      nav.classList.add('on-dark');
    } else {
      nav.classList.remove('on-dark');
    }
    lastScroll = scrollY;
  }

  // ═══ HAMBURGER ═══
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ═══ REVEAL ON SCROLL ═══
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ═══ BUILDING DRAW + SECTION LINE OBSERVER ═══
  const drawObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.building-draw:not(#buildingDraw), .section-line').forEach(el => drawObserver.observe(el));

  // ═══ COUNTER ANIMATION ═══
  if (document.querySelectorAll('.stat-number[data-count]').length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count);
          animateCounter(el, target);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number[data-count]').forEach(el => counterObserver.observe(el));

    function animateCounter(el, target) {
      const duration = 2000;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current + '+';
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    }
  }

  // ═══ PROJECTS DRAG SCROLL ═══
  const projectsTrack = document.querySelector('.projects-track');
  if (projectsTrack) {
    let isDown = false, startX, scrollLeft;
    projectsTrack.addEventListener('mousedown', (e) => {
      isDown = true; projectsTrack.style.cursor = 'grabbing';
      startX = e.pageX - projectsTrack.offsetLeft;
      scrollLeft = projectsTrack.scrollLeft;
    });
    projectsTrack.addEventListener('mouseleave', () => { isDown = false; projectsTrack.style.cursor = ''; });
    projectsTrack.addEventListener('mouseup', () => { isDown = false; projectsTrack.style.cursor = ''; });
    projectsTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - projectsTrack.offsetLeft;
      projectsTrack.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
  }

  // ═══ PARALLAX ═══
  const heroDeco = document.getElementById('heroDeco');

  function updateParallax() {
    if (!heroDeco) return;
    const scrollY = window.scrollY;
    heroDeco.style.transform = 'translateY(calc(-50% + ' + (scrollY * 0.15) + 'px))';
  }

  // ═══ MAGNETIC BUTTONS ═══
  document.querySelectorAll('.btn-primary, .btn-white, .nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // ═══ SCROLL HANDLER ═══
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollProgress();
        updateNav();
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ═══ CONTACT MODAL ═══
  if (document.getElementById('modalOverlay')) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalForm = document.getElementById('modalForm');
    const modalSuccess = document.getElementById('modalSuccess');
    let currentStep = 1;

    // Open modal
    document.querySelectorAll('[data-modal]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        modalOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    // Close modal
    function closeModal() {
      modalOverlay.classList.remove('open');
      document.body.style.overflow = '';
      // Reset after animation
      setTimeout(() => {
        currentStep = 1;
        showStep(1);
        modalForm.style.display = '';
        modalSuccess.classList.remove('active');
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      }, 400);
    }

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Option selection
    document.querySelectorAll('.option-grid').forEach(grid => {
      grid.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });
    });

    // Step navigation
    function showStep(step) {
      document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
      const target = document.querySelector('.modal-step[data-step="' + step + '"]');
      if (target) target.classList.add('active');

      // Update progress
      document.querySelectorAll('.modal-progress-bar').forEach((bar, i) => {
        bar.classList.toggle('active', i < step);
      });
      currentStep = step;
    }

    // Next buttons
    document.querySelectorAll('.modal-next').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.id === 'formSubmit') {
          modalForm.style.display = 'none';
          modalSuccess.classList.add('active');
          return;
        }
        if (currentStep < 4) showStep(currentStep + 1);
      });
    });

    // Back buttons
    document.querySelectorAll('.modal-back').forEach(btn => {
      btn.addEventListener('click', () => {
        const goto = parseInt(btn.dataset.goto);
        showStep(goto);
      });
    });
  }

  // ═══ CUSTOM CURSOR ═══
  (function initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;
    document.body.classList.add('has-custom-cursor');

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);

    const circle = document.createElement('div');
    circle.className = 'cursor-circle';
    document.body.appendChild(circle);

    const text = document.createElement('div');
    text.className = 'cursor-text';
    document.body.appendChild(text);

    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
    let circleX = 0, circleY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate() {
      dotX += (mouseX - dotX) * 0.9;
      dotY += (mouseY - dotY) * 0.9;
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';

      circleX += (mouseX - circleX) * 0.15;
      circleY += (mouseY - circleY) * 0.15;
      circle.style.left = circleX + 'px';
      circle.style.top = circleY + 'px';
      text.style.left = circleX + 'px';
      text.style.top = circleY + 'px';

      requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('mouseover', (e) => {
      const projectEl = e.target.closest('.project-card, .project-grid-card, [data-cursor-text]');
      if (projectEl) {
        circle.classList.add('hover');
        text.textContent = projectEl.dataset.cursorText || 'View';
        text.classList.add('visible');
        dot.style.opacity = '0';
        return;
      }
      if (e.target.closest('a, button, [data-cursor-hover]')) {
        circle.classList.add('hover');
        dot.style.opacity = '0';
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.project-card, .project-grid-card, [data-cursor-text], a, button, [data-cursor-hover]')) {
        circle.classList.remove('hover');
        text.classList.remove('visible');
        dot.style.opacity = '1';
      }
    });
  })();

  // ═══ ACTIVE NAV LINK ═══
  const currentPage = window.location.pathname.split('/').pop() || 'demo.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.style.color = 'var(--accent)';
    }
  });

})();
