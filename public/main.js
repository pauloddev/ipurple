/* iPurple Imports · interações (sem dependências) */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: material ao rolar ---------- */
  const header = document.getElementById('topo-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu-mobile');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('is-open') && !menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
  });

  /* ---------- Reveal ao rolar ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Contadores ---------- */
  const fmt = new Intl.NumberFormat('pt-BR');
  const counters = document.querySelectorAll('.count');
  const runCount = (el) => {
    const to = Number(el.dataset.to); const pre = el.dataset.prefix || '';
    if (reduceMotion) { el.textContent = pre + fmt.format(to); return; }
    const dur = 1400; const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur); const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + fmt.format(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Carrossel com destaque central ---------- */
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('.carousel-track');
    const slides = Array.from(track.children);
    const dotsWrap = root.querySelector('[data-dots]');
    let active = -1; let timer = null; let userTouched = false;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir para o item ${i + 1} de ${slides.length}`);
      b.addEventListener('click', () => { stop(); go(i); });
      dotsWrap.appendChild(b);
      return b;
    });

    const centerOf = (el) => el.offsetLeft + el.offsetWidth / 2;
    const go = (i, behavior) => {
      const n = (i + slides.length) % slides.length;
      const left = centerOf(slides[n]) - track.clientWidth / 2;
      track.scrollTo({ left, behavior: behavior || (reduceMotion ? 'auto' : 'smooth') });
    };
    const update = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0; let bestD = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(centerOf(s) - mid); if (d < bestD) { bestD = d; best = i; } });
      if (best === active) return;
      active = best;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === best));
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === best)));
    };
    let raf = 0;
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', () => { const a = active; active = -1; update(); go(a, 'auto'); });

    root.querySelector('[data-prev]').addEventListener('click', () => { stop(); go(active - 1); });
    root.querySelector('[data-next]').addEventListener('click', () => { stop(); go(active + 1); });
    track.addEventListener('pointerdown', stop, { passive: true });
    track.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop(); }, { passive: true });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { stop(); go(active - 1); }
      if (e.key === 'ArrowRight') { stop(); go(active + 1); }
    });
    slides.forEach((s) => s.addEventListener('click', () => { const i = slides.indexOf(s); if (i !== active) { stop(); go(i); } }));

    function stop() { userTouched = true; clearInterval(timer); timer = null; }
    const delay = Number(root.dataset.autoplay || 0);
    const start = () => {
      if (!delay || reduceMotion || userTouched || timer) return;
      timer = setInterval(() => go(active + 1), delay);
    };
    root.addEventListener('mouseenter', () => { clearInterval(timer); timer = null; });
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', () => { clearInterval(timer); timer = null; });

    // começa no 2º item para mostrar vizinhos dos dois lados
    requestAnimationFrame(() => { go(Math.min(1, slides.length - 1), 'auto'); update(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        en.forEach((e) => { if (e.isIntersecting) start(); else { clearInterval(timer); timer = null; } });
      }, { threshold: 0.3 }).observe(root);
    }
  });

  /* ---------- Horário: destaca o dia e mostra aberto/fechado (horário de Brasília) ---------- */
  const hours = document.querySelector('[data-hours]');
  if (hours) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      const dayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      const mins = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
      const row = hours.querySelector(`[data-day="${dayIdx}"]`);
      if (row) row.classList.add('today');
      const open = dayIdx >= 1 && dayIdx <= 6 && mins >= 540 && mins < 1140;
      const st = hours.querySelector('[data-status]');
      st.textContent = open ? 'Aberto agora' : 'Fechado agora';
      st.classList.add(open ? 'open' : 'closed');
      st.hidden = false;
    } catch (e) { /* sem destaque se o navegador não suportar */ }
  }

  /* ---------- Ano no rodapé ---------- */
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
