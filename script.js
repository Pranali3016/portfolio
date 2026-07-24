document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Shared scroll dispatcher: every scroll-driven update below registers
     a callback here instead of adding its own scroll listener, so a
     single passive listener + a single rAF-guard drives all of them —
     avoids stacking redundant listeners and duplicate layout reads. */
  const scrollCallbacks = [];
  let scrollTicking = false;
  const onSharedScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollCallbacks.forEach(fn => fn());
      scrollTicking = false;
    });
  };

  /* ---------------------------------------------------------
     Lenis smooth scrolling, synced to GSAP's ticker so every
     scroll-driven animation below reads off the same clock.
     Skipped entirely for reduced-motion — native `scroll-behavior:
     smooth` from style.css still covers anchor jumps in that case.
  --------------------------------------------------------- */
  let lenis = null;
  if (!prefersReducedMotion && window.Lenis && window.gsap) {
    lenis = new Lenis({ duration: 1.38, smoothWheel: true });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------
     Animated neural-network background (canvas)
  --------------------------------------------------------- */
  const canvas = document.getElementById('bgCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height, nodes, sparkles, dpr, pulses = [], shootingStar = null;
    const ACCENT = '50,240,210';   // teal
    const ACCENT2 = '108,141,255'; // soft blue
    const LINK_DIST = 150;
    const MOUSE_RADIUS = 140;
    let mouse = { x: -9999, y: -9999, active: false };

    const countFor = (w, h) => Math.min(52, Math.max(22, Math.round((w * h) / 34000)));
    const sparkleCountFor = (w, h) => Math.min(100, Math.max(40, Math.round((w * h) / 17000)));

    /* Node glow is an identical radial gradient for every node of a given
       color, just re-centered — pre-rendering it once as a sprite and
       stamping it with drawImage avoids allocating a new gradient object
       for every node on every single animation frame (the biggest per-frame
       cost in this loop, and the main source of mobile jank). Rebuilt
       whenever dpr changes so the sprite stays crisp on the actual device. */
    let glowSprites = {};
    const buildGlowSprite = (color, r) => {
      const d = r * 2; // CSS-px diameter covering the full radial gradient
      const sprite = document.createElement('canvas');
      sprite.width = Math.ceil(d * dpr);
      sprite.height = Math.ceil(d * dpr);
      const sctx = sprite.getContext('2d');
      const cx = sprite.width / 2, cy = sprite.height / 2, sr = r * dpr;
      const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
      g.addColorStop(0, `rgba(${color},0.95)`);
      g.addColorStop(0.5, `rgba(${color},0.2)`);
      g.addColorStop(1, `rgba(${color},0)`);
      sctx.fillStyle = g;
      sctx.beginPath();
      sctx.arc(cx, cy, sr, 0, Math.PI * 2);
      sctx.fill();
      return sprite;
    };
    const buildGlowSprites = () => {
      glowSprites = {
        teal: buildGlowSprite(ACCENT, 2.1 * 6),
        violet: buildGlowSprite(ACCENT2, 2.5 * 6)
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = document.documentElement.scrollHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGlowSprites();

      const target = countFor(width, Math.min(height, window.innerHeight * 1.6));
      nodes = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * Math.min(height, window.innerHeight * 1.6),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        violet: Math.random() < 0.25
      }));
      pulses = [];

      // small twinkling sparkles — separate layer, always drifting + fading in/out
      const sparkleTarget = sparkleCountFor(width, Math.min(height, window.innerHeight * 1.6));
      sparkles = Array.from({ length: sparkleTarget }, () => ({
        x: Math.random() * width,
        y: Math.random() * Math.min(height, window.innerHeight * 1.6),
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.1 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
        violet: Math.random() < 0.3
      }));
    };

    /* Track the cursor so nearby nodes can drift away from it */
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY + window.scrollY;
      mouse.active = true;
    }, { passive: true });
    window.addEventListener('mouseleave', () => { mouse.active = false; });

    /* Occasionally fire a bright "signal" that travels along a live link —
       reads as data flowing through the network rather than static wiring */
    const maybeSpawnPulse = (linksThisFrame) => {
      if (prefersReducedMotion) return;
      if (Math.random() > 0.02) return;
      if (!linksThisFrame.length) return;
      const link = linksThisFrame[Math.floor(Math.random() * linksThisFrame.length)];
      pulses.push({ a: link.a, b: link.b, t: 0, violet: Math.random() < 0.35 });
    };

    // Time-based spawn window (one every 6-12s, never more than one live at once)
    let nextShootingStarAt = prefersReducedMotion ? Infinity : performance.now() + 6000 + Math.random() * 6000;

    const maybeSpawnShootingStar = () => {
      if (prefersReducedMotion || shootingStar) return;
      if (performance.now() < nextShootingStarAt) return;

      // Randomized spawn position along the top band, direction and speed
      const startX = Math.random() * width;
      const dir = Math.random() < 0.5 ? -1 : 1;                 // left-to-right or right-to-left
      const angle = (24 + Math.random() * 28) * (Math.PI / 180); // 24°-52° below horizontal
      const speed = 5.5 + Math.random() * 5;                     // randomized speed
      shootingStar = {
        x: startX, y: -30 - Math.random() * 40,
        vx: Math.cos(angle) * speed * dir,
        vy: Math.sin(angle) * speed,
        trail: 16 + Math.random() * 10,                          // randomized trail length
        life: 0,
        maxLife: 90 + Math.random() * 40
      };
      nextShootingStarAt = performance.now() + 6000 + Math.random() * 6000;
    };

    const drawShootingStar = () => {
      if (!shootingStar) return;
      const s = shootingStar;
      s.x += s.vx;
      s.y += s.vy;
      s.life++;

      // Ease in, hold, ease out — smoother than a hard cutoff
      const lifeP = s.life / s.maxLife;
      const fade = lifeP < 0.15 ? lifeP / 0.15 : lifeP > 0.75 ? Math.max(0, 1 - (lifeP - 0.75) / 0.25) : 1;

      const tailX = s.x - s.vx * s.trail;
      const tailY = s.y - s.vy * s.trail;
      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.6, `rgba(${ACCENT},${(0.35 * fade).toFixed(2)})`);
      grad.addColorStop(1, `rgba(255,255,255,${(0.95 * fade).toFixed(2)})`);

      ctx.save();
      ctx.shadowBlur = 7;
      ctx.shadowColor = `rgba(${ACCENT},${(0.6 * fade).toFixed(2)})`;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      // Bright core at the head of the star
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${(0.95 * fade).toFixed(2)})`;
      ctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (s.y > height * 0.75 || s.x < -80 || s.x > width + 80 || s.life > s.maxLife) shootingStar = null;
    };

    const step = () => {
      ctx.clearRect(0, 0, width, height);

      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;

        // gentle repulsion around the cursor
        if (mouse.active) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < MOUSE_RADIUS * MOUSE_RADIUS && dSq > 0.0001) {
            const d = Math.sqrt(dSq);
            const force = (1 - d / MOUSE_RADIUS) * 0.6;
            n.x += (dx / d) * force;
            n.y += (dy / d) * force;
          }
        }

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      });

      const liveLinks = [];
      const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < LINK_DIST_SQ) {
            const dist = Math.sqrt(distSq); // only computed for pairs already in range
            const alpha = (1 - dist / LINK_DIST) * 0.5;
            ctx.strokeStyle = `rgba(${ACCENT},${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            liveLinks.push({ a, b });
          }
        }
      }
      maybeSpawnPulse(liveLinks);
      maybeSpawnShootingStar();
      drawShootingStar();

      // glowing nodes (soft radial fill reads as "alive" rather than flat dots)
      nodes.forEach(n => {
        const color = n.violet ? ACCENT2 : ACCENT;
        const r = n.violet ? 2.5 : 2.1;
        const sprite = n.violet ? glowSprites.violet : glowSprites.teal;
        const d = r * 12; // 2 * (r * 6), matches the sprite's CSS-px diameter
        if (sprite) ctx.drawImage(sprite, n.x - d / 2, n.y - d / 2, d, d);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},0.95)`;
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // small drifting, twinkling sparkles — a separate live layer over the network
      sparkles.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = width; else if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height; else if (s.y > height) s.y = 0;
        s.phase += s.speed;

        const twinkle = (Math.sin(s.phase) + 1) / 2; // 0 -> 1 -> 0
        const alpha = 0.14 + twinkle * 0.5;
        const color = s.violet ? ACCENT2 : ACCENT;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${alpha.toFixed(2)})`;
        ctx.arc(s.x, s.y, s.r * (0.6 + twinkle * 0.7), 0, Math.PI * 2);
        ctx.fill();
      });

      // advance + draw traveling signal pulses
      pulses = pulses.filter(p => p.t <= 1);
      pulses.forEach(p => {
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        const color = p.violet ? ACCENT2 : ACCENT;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 6);
        glow.addColorStop(0, `rgba(${color},0.95)`);
        glow.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        p.t += 0.02;
      });
    };

    let rafId;
    let loopRunning = false;
    const loop = () => { step(); rafId = requestAnimationFrame(loop); };
    const startLoop = () => {
      if (loopRunning || prefersReducedMotion) return;
      loopRunning = true;
      loop();
    };
    const stopLoop = () => {
      loopRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
    };

    resize();
    if (prefersReducedMotion) {
      step(); // draw one static frame, no animation loop
    } else {
      startLoop();
    }

    // Tab hidden (switched away / minimized) — stop drawing entirely
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (prefersReducedMotion) step();
      }, 200);
    });
  }

  /* Ripple on click for every .btn — a short-lived span expanding from the
     click point, purely decorative and removed once its animation ends */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (prefersReducedMotion) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  /* Magnetic hover: nav links and the outline nav button drift a few px
     toward the cursor, and spring back on mouseleave */
  if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.navbar-nav .nav-link, .navbar-nav .btn-outline-accent').forEach(el => {
      const strength = 0.3, max = 7;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        const dx = Math.max(-max, Math.min(max, x * strength));
        const dy = Math.max(-max, Math.min(max, y * strength));
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    // Hero CTAs: same magnetic pull, folded together with their hover-scale
    // so the JS-set transform doesn't clobber the CSS one (inline wins ties)
    document.querySelectorAll('.hero-cta .btn').forEach(el => {
      const strength = 0.22, max = 6;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        const dx = Math.max(-max, Math.min(max, x * strength));
        const dy = Math.max(-max, Math.min(max, y * strength));
        el.style.transform = `translate(${dx}px, ${dy - 4}px) scale(1.045)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* Cursor-tracking glow on project + skill cards — sets --mx/--my in %,
     which the ::before radial-gradient in style.css reads */
  if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.model-card, .skill-group, .about-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });
  }


  const nav = document.getElementById('mainNav');
  if (nav) {
    if (prefersReducedMotion) {
      nav.classList.add('nav-in');
    } else {
      setTimeout(() => nav.classList.add('nav-in'), 60);
    }
  }
  const onScrollNav = () => {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScrollNav();
  if (nav) scrollCallbacks.push(onScrollNav);

  /* Subtle depth: the aurora and grid background layers drift at slightly
     different speeds as you scroll, on top of their own idle animation */
  const bgAurora = document.getElementById('bgAuroraWrap');
  const bgGrid = document.getElementById('bgGridWrap');
  if ((bgAurora || bgGrid) && !prefersReducedMotion) {
    const updateBgParallax = () => {
      const y = window.scrollY;
      if (bgAurora) bgAurora.style.transform = `translate3d(0, ${(y * 0.04).toFixed(1)}px, 0)`;
      if (bgGrid) bgGrid.style.transform = `translate3d(0, ${(y * -0.02).toFixed(1)}px, 0)`;
    };
    updateBgParallax();
    scrollCallbacks.push(updateBgParallax);
  }

  /* Close mobile nav on link click */
  const navMenu = document.getElementById('navMenu');
  document.querySelectorAll('#navMenu .nav-link, #navMenu .btn').forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
      }
    });
  });

  /* Active nav link on scroll */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-nav]');

  const setActive = (id) => {
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach(sec => navObserver.observe(sec));

  /* Reveal-on-scroll */
  /* Cards sharing a row get a small incremental delay so they cascade in,
     instead of all popping in on the same frame when the row hits the viewport */
  document.querySelectorAll('.row').forEach(row => {
    const staggerTargets = row.querySelectorAll(':scope > div > .model-card, :scope > div > .skill-group');
    staggerTargets.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 0.08, 0.32)}s`;
    });
  });

  const revealEls = document.querySelectorAll('.reveal, .reveal-down, .reveal-left, .reveal-right, .reveal-scale');

  if (prefersReducedMotion) {
    revealEls.forEach(el => el.classList.add('visible'));
  } else {
    // Toggle (not unobserve) so every section replays its entrance each time
    // it scrolls into view, and resets once it scrolls back out — scrolling
    // down plays it, scrolling back up resets it, scrolling down replays it.
    // will-change is applied only while a transition is actually running —
    // promoting every reveal element to its own layer for the page's whole
    // lifetime is wasted GPU memory/compositing cost, especially on mobile.
    const clearWillChange = (e) => {
      if (e.target === e.currentTarget) e.target.style.willChange = 'auto';
    };
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        el.style.willChange = 'transform, opacity';
        el.addEventListener('transitionend', clearWillChange, { once: true });
        el.classList.toggle('visible', entry.isIntersecting);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* Hero greeting ("hello, i'm"): split into letters and reveal one by one,
     slightly ahead of the name so the two reads as a single cascading intro.
     Hero heading: each word animates up into place — the "line-by-line" reveal.
     Both replay every time the hero scrolls back into view (not just on load). */
  const greetingEl = document.getElementById('heroGreeting');
  if (greetingEl) {
    const text = greetingEl.textContent;
    greetingEl.innerHTML = text.split('').map(ch =>
      ch === ' ' ? ' ' : `<span class="letter">${ch}</span>`
    ).join('');
  }
  const letters = greetingEl ? greetingEl.querySelectorAll('.letter') : [];
  const heroWords = document.querySelectorAll('#heroTitle .word');
  const heroEl0 = document.getElementById('top');

  const playHeroIntro = () => {
    gsap.set(letters, { opacity: 0, y: 10 });
    gsap.to(letters, { opacity: 1, y: 0, duration: 0.5, ease: 'power4.out', stagger: 0.03 });
    gsap.set(heroWords, { opacity: 0, y: 40, rotateX: -40 });
    gsap.to(heroWords, {
      opacity: 1, y: 0, rotateX: 0,
      duration: 1.12,
      ease: 'expo.out',
      stagger: 0.15,
      delay: 0.3
    });
  };
  const resetHeroIntro = () => {
    gsap.set(letters, { opacity: 0, y: 10 });
    gsap.set(heroWords, { opacity: 0, y: 40, rotateX: -40 });
  };

  if (prefersReducedMotion || !window.gsap) {
    letters.forEach(l => { l.style.opacity = 1; });
    heroWords.forEach(w => { w.style.opacity = 1; });
  } else if (heroEl0 && (letters.length || heroWords.length)) {
    const heroIntroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) playHeroIntro();
        else resetHeroIntro();
      });
    }, { threshold: 0.35 });
    heroIntroObserver.observe(heroEl0);
  }

  /* Pause the hero orbital illustrations' CSS animations once they scroll
     out of view — no reason to keep spinning/pulsing off-screen elements */
  const heroOrbs = document.querySelector('.hero-orbs');
  if (heroOrbs && !prefersReducedMotion) {
    const orbsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        heroOrbs.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, { threshold: 0 });
    orbsObserver.observe(heroOrbs);
  }

  /* Subtle parallax: hero text and portrait drift a few px opposite the
     cursor, giving the section a sense of depth without being distracting */
  const heroEl = document.querySelector('.hero');
  const heroInner = document.querySelector('.hero-inner');
  if (heroEl && heroInner && !prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let parallaxRunning = false;

    const parallaxTick = () => {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      heroInner.style.transform = `translate3d(${(curX * -6).toFixed(2)}px, ${(curY * -4).toFixed(2)}px, 0)`;

      // Settled close enough to target — stop the loop instead of running forever
      if (Math.abs(targetX - curX) < 0.001 && Math.abs(targetY - curY) < 0.001) {
        parallaxRunning = false;
        heroInner.style.willChange = 'auto';
        return;
      }
      requestAnimationFrame(parallaxTick);
    };
    const startParallax = () => {
      if (parallaxRunning) return;
      parallaxRunning = true;
      heroInner.style.willChange = 'transform';
      requestAnimationFrame(parallaxTick);
    };

    heroEl.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1 .. 1
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
      startParallax();
    }, { passive: true });
    heroEl.addEventListener('mouseleave', () => {
      targetX = 0; targetY = 0;
      startParallax();
    });
  }

  /* Typing effect for hero role */
  const roleEl = document.getElementById('roleText');
  const roles = ['AI/ML Engineer', 'Agentic AI Builder', 'RAG Systems Engineer', 'LLM Application Developer'];

  if (roleEl && !prefersReducedMotion) {
    let roleIndex = 0;
    let charIndex = roles[0].length;
    let deleting = false;

    const tick = () => {
      const current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        if (charIndex > current.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        charIndex--;
        if (charIndex < 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          charIndex = 0;
        }
      }
      roleEl.textContent = current.substring(0, charIndex) || roles[roleIndex].substring(0, charIndex);
      setTimeout(tick, deleting ? 35 : 65);
    };
    setTimeout(tick, 1800);
  }

  /* Subtle mouse-tilt on project cards */
  if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* Timeline: line grows as you scroll through the section, tracking how
     far the viewport center has moved through the timeline's height */
  const timelineEl = document.querySelector('.timeline');
  if (timelineEl) {
    const updateTimelineProgress = () => {
      const r = timelineEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.5 - r.top) / r.height;
      timelineEl.style.setProperty('--progress', Math.max(0, Math.min(1, progress)).toFixed(3));
    };
    updateTimelineProgress();
    scrollCallbacks.push(updateTimelineProgress);
    let timelineResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(timelineResizeTimer);
      timelineResizeTimer = setTimeout(updateTimelineProgress, 150);
    });
  }

  /* Animated number counters on project metrics — counts up from 0 to the
     stated value the first time each metric scrolls into view */
  const counterEls = document.querySelectorAll('.m-val');
  if (counterEls.length && !prefersReducedMotion) {
    counterEls.forEach(el => {
      const raw = el.textContent.trim();
      const match = raw.match(/^([\d.]+)(.*)$/); // leading number + trailing suffix (%, etc.)
      if (match) el.dataset.countTarget = match[1] + '|' + match[2];
    });

    const runCounter = (el) => {
      const stored = el.dataset.countTarget;
      if (!stored) return; // non-numeric metrics like "IEEE" or "©" stay as-is
      const [numStr, suffix] = stored.split('|');
      const target = parseFloat(numStr);
      const decimals = (numStr.split('.')[1] || '').length;
      const duration = 900;
      const start = performance.now();
      el.dataset.countRun = String(start); // lets a fresh run supersede a stale one in flight
      const tick = (now) => {
        if (el.dataset.countRun !== String(start)) return; // superseded by a newer run
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (entry.isIntersecting) {
          runCounter(el);
        } else if (el.dataset.countTarget) {
          el.dataset.countRun = '';
          const [numStr, suffix] = el.dataset.countTarget.split('|');
          el.textContent = (0).toFixed((numStr.split('.')[1] || '').length) + suffix;
        }
      });
    }, { threshold: 0.6 });
    counterEls.forEach(el => counterObserver.observe(el));
  }

  /* Ambient glow that follows the cursor within the contact section */
  const contactSection = document.getElementById('contact');
  const contactGlow = document.querySelector('.contact-glow');
  if (contactSection && contactGlow && !prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    contactSection.addEventListener('mousemove', (e) => {
      const r = contactSection.getBoundingClientRect();
      contactGlow.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      contactGlow.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  }


  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('cf-name').value.trim();
      const email = document.getElementById('cf-email').value.trim();
      const message = document.getElementById('cf-message').value.trim();

      if (!name || !email || !message) {
        status.classList.remove('success');
        status.textContent = 'Please fill in every field.';
        status.style.color = 'var(--warn)';
        return;
      }

      const subject = encodeURIComponent(`Portfolio contact from ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:pranalihagare@gmail.com?subject=${subject}&body=${body}`;

      status.style.color = 'var(--accent)';
      status.classList.add('success');
      status.innerHTML = '<span class="status-check">✓</span> Opening your email client…';
      form.reset();
    });
  }

  /* One passive listener drives every scroll-dependent update registered
     above, throttled to a single rAF pass per frame. */
  if (scrollCallbacks.length) {
    window.addEventListener('scroll', onSharedScroll, { passive: true });
  }
});