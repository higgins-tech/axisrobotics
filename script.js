/* =====================================================================
   AXIS ROBOTICS — main script (vanilla JS, no dependencies)
   Structure:
     0.  Helpers
     1.  Preloader
     2.  Header theme + at-top expanded nav
     3.  Mega menu (build + open/close + accordion)
     4.  Reveal-on-scroll (IntersectionObserver)
     5.  Pin controller factory (generic scroll-jacked sections)
     6.  Bottleneck pinned card stack
     7.  Products pinned panels
     8.  Loop scroll-tied word reveal
     9.  Rock parallax (living system)
     10. Master scroll/resize ticker
     11. Misc (placeholder links, launch buttons)
===================================================================== */
(function(){
  'use strict';

  /* -------------------------------------------------------------
     0. HELPERS
  ------------------------------------------------------------- */
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const isDesktop = () => window.matchMedia('(min-width:1024px)').matches;
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* -------------------------------------------------------------
     1. PRELOADER
  ------------------------------------------------------------- */
  function initPreloader(){
    const root    = $('#preloader');
    const percent = $('#preloaderPercent');
    const bar     = $('#preloaderBar');
    if (!root) return;

    if (prefersReducedMotion()){
      finish();
      return;
    }

    let value = 0;
    const tick = () => {
      // natural, slightly randomised increments rather than a flat linear count
      value += Math.random() * 9 + 3;
      value = Math.min(value, 100);
      const shown = Math.floor(value);
      if (percent) percent.textContent = shown;
      if (bar) bar.style.width = shown + '%';

      if (value >= 100){
        setTimeout(finish, 260);
      } else {
        setTimeout(tick, 70);
      }
    };
    setTimeout(tick, 250);

    function finish(){
      root.classList.add('is-done');
      document.body.classList.remove('is-locked');
      root.addEventListener('transitionend', () => {
        root.remove();
        window.dispatchEvent(new Event('scroll'));
      }, { once: true });
      // safety net in case transitionend never fires
      setTimeout(() => {
        if (root.parentNode) root.remove();
        window.dispatchEvent(new Event('scroll'));
      }, 1600);
    }
  }

  /* -------------------------------------------------------------
     2. HEADER THEME + AT-TOP EXPANDED NAV
  ------------------------------------------------------------- */
  const header       = $('#siteHeader');
  const navCompact    = $('#navCompact');
  const navExpandedEl = $('#navExpanded');

  function updateHeaderTheme(){
    if (!header) return;
    const probeY = header.offsetHeight + 6;
    const probeX = window.innerWidth / 2;
    const el = document.elementFromPoint(probeX, probeY);
    if (!el) return;
    const themedSection = el.closest('[data-section-theme]');
    if (themedSection){
      const theme = themedSection.dataset.sectionTheme;
      if (header.dataset.theme !== theme) header.dataset.theme = theme;
    }
  }

  function updateAtTop(){
    if (!header) return;
    header.classList.toggle('at-top', window.scrollY < 60);
  }

  /* -------------------------------------------------------------
     3. MEGA MENU
  ------------------------------------------------------------- */
  const megaMenu        = $('#megaMenu');
  const megaMenuScrim   = $('#megaMenuScrim');
  const megaMenuColumns = $('#megaMenuColumns');
  const megaMenuClose   = $('#megaMenuClose');
  const footerNav       = $('#footerNav');

  function buildMegaMenu(){
    if (!footerNav || !megaMenuColumns) return;
    const cols = $$('.nav-col', footerNav);

    cols.forEach((col) => {
      const category = col.dataset.category || col.querySelector('h4')?.textContent || '';
      const links = $$('a', col).map(a => ({ href: a.getAttribute('href'), label: a.textContent }));

      const wrap = document.createElement('div');
      wrap.className = 'mm-cat';
      wrap.dataset.category = category;

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'mm-cat__trigger';
      trigger.innerHTML = `<span>${category}</span><i class="ri-add-line"></i>`;

      const panel = document.createElement('div');
      panel.className = 'mm-cat__panel';
      const ul = document.createElement('ul');
      links.forEach(l => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = l.href;
        a.textContent = l.label;
        li.appendChild(a);
        ul.appendChild(li);
      });
      panel.appendChild(ul);

      trigger.addEventListener('click', () => toggleCategory(wrap));

      wrap.appendChild(trigger);
      wrap.appendChild(panel);
      megaMenuColumns.appendChild(wrap);
    });
  }

  function toggleCategory(catEl, forceOpen){
    const willOpen = forceOpen !== undefined ? forceOpen : !catEl.classList.contains('is-open');
    $$('.mm-cat', megaMenuColumns).forEach(c => {
      if (c === catEl) return;
      c.classList.remove('is-open');
    });
    catEl.classList.toggle('is-open', willOpen);
  }

  function openMegaMenu(category){
    if (!megaMenu) return;
    megaMenu.classList.add('is-open');
    megaMenuScrim.classList.add('is-open');
    document.body.classList.add('is-locked');
    navCompact?.setAttribute('aria-expanded', 'true');

    if (category){
      const catEl = $$('.mm-cat', megaMenuColumns).find(c => c.dataset.category === category);
      if (catEl) toggleCategory(catEl, true);
    }
  }

  function closeMegaMenu(){
    if (!megaMenu) return;
    megaMenu.classList.remove('is-open');
    megaMenuScrim.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    navCompact?.setAttribute('aria-expanded', 'false');
  }

  function initNavToggles(){
    navCompact?.addEventListener('click', () => {
      const isOpen = megaMenu.classList.contains('is-open');
      isOpen ? closeMegaMenu() : openMegaMenu();
    });
    megaMenuClose?.addEventListener('click', closeMegaMenu);
    megaMenuScrim?.addEventListener('click', closeMegaMenu);

    $$('.nav-expanded__item', navExpandedEl).forEach(btn => {
      btn.addEventListener('click', () => openMegaMenu(btn.dataset.category));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMegaMenu();
    });
  }

  /* -------------------------------------------------------------
     4. REVEAL ON SCROLL
  ------------------------------------------------------------- */
  function initReveals(){
    const els = $$('[data-reveal]');
    if (!els.length) return;

    if (prefersReducedMotion()){
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

    els.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  }

  /* -------------------------------------------------------------
     5. PIN CONTROLLER FACTORY
     Drives sticky, scroll-jacked sections on desktop only.
     wrapper: tall spacer element (height set to steps * 100vh)
     onProgress(continuousValue, rawProgress0to1): called every frame
     onStepChange(stepIndex): called only when the active step changes
  ------------------------------------------------------------- */
  function createPinController({ wrapper, steps, onProgress, onStepChange }){
    let currentStep = -1;

    function layout(){
      if (!wrapper) return;
      if (isDesktop()){
        wrapper.style.height = (steps * 100) + 'vh';
      } else {
        wrapper.style.height = '';
      }
    }

    function update(){
      if (!wrapper || !isDesktop()){
        if (currentStep !== -1){ currentStep = -1; }
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const rawProgress = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;
      const continuous = rawProgress * (steps - 1);
      const stepIndex = clamp(Math.round(continuous), 0, steps - 1);

      onProgress && onProgress(continuous, rawProgress);
      if (stepIndex !== currentStep){
        currentStep = stepIndex;
        onStepChange && onStepChange(stepIndex);
      }
    }

    layout();
    return { layout, update };
  }

  /* -------------------------------------------------------------
     6. BOTTLENECK — pinned 3-card stack
  ------------------------------------------------------------- */
  function initBottleneck(){
    const wrapper = $('#bottleneckPin');
    if (!wrapper) return null;
    const steps = parseInt(wrapper.dataset.steps, 10) || 3;
    const cards = $$('.story-card', wrapper);
    const indexLabel = $('#bottleneckIndex');

    cards.forEach((card, i) => { card.style.zIndex = String(steps - i); });

    function applyProgress(continuous){
      if (!isDesktop()) return;
      cards.forEach((card, i) => {
        const d = continuous - i;
        let translateY = 0, scale = 1, opacity = 1;

        if (d <= -1){
          translateY = 70; scale = 0.94; opacity = 0;
        } else if (d < 0){
          const t = d + 1; // 0 -> 1
          translateY = lerp(70, 0, t);
          scale = lerp(0.94, 1, t);
          opacity = lerp(0.55, 1, t);
        } else if (d === 0){
          translateY = 0; scale = 1; opacity = 1;
        } else if (d <= 1){
          translateY = lerp(0, -60, d);
          scale = lerp(1, 0.95, d);
          opacity = lerp(1, 0, d);
        } else {
          translateY = -60; scale = 0.95; opacity = 0;
        }

        card.style.transform = `translateY(${translateY}px) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.pointerEvents = opacity > 0.4 ? 'auto' : 'none';
      });
    }

    function applyStep(stepIndex){
      if (indexLabel) indexLabel.textContent = stepIndex + 1;
    }

    // initial paint
    applyProgress(0);
    applyStep(0);

    return createPinController({
      wrapper,
      steps,
      onProgress: applyProgress,
      onStepChange: applyStep
    });
  }

  /* -------------------------------------------------------------
     7. PRODUCTS — pinned panels + progress rail + device mock
  ------------------------------------------------------------- */
  function initProducts(){
    const wrapper = $('#productsPin');
    if (!wrapper) return null;
    const steps = parseInt(wrapper.dataset.steps, 10) || 4;
    const panels = $$('.products__panel', wrapper);
    const indexLabel = $('#productsIndex');
    const dot = $('#productsDot');
    const deviceMock = $('#deviceMock');
    const screen = $('#productsScreen');

    function applyProgress(_continuous, rawProgress){
      if (!isDesktop() || !dot) return;
      dot.style.top = (rawProgress * 100) + '%';
    }

    function applyStep(stepIndex){
      panels.forEach((panel, i) => {
        panel.classList.toggle('is-active', i === stepIndex);
      });
      if (indexLabel) indexLabel.textContent = stepIndex + 1;

      const activePanel = panels[stepIndex];
      if (activePanel && deviceMock){
        const device = activePanel.dataset.device || 'laptop';
        deviceMock.dataset.device = device;
        const label = activePanel.querySelector('.products__panel-media')?.dataset.assetLabel;
        if (screen && label) screen.dataset.assetLabel = label;
      }
    }

    applyStep(0);
    applyProgress(0, 0);

    return createPinController({
      wrapper,
      steps,
      onProgress: applyProgress,
      onStepChange: applyStep
    });
  }

  /* -------------------------------------------------------------
     8. LOOP — scroll-tied word reveal
  ------------------------------------------------------------- */
  function initLoop(){
    const section = $('#loop');
    const words = $$('#loopText [data-w]');
    if (!section || !words.length) return null;

    if (prefersReducedMotion()){
      words.forEach(w => w.classList.add('is-revealed'));
      return null;
    }

    let active = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => { active = entry.isIntersecting; });
    }, { threshold: 0, rootMargin: '10% 0px 10% 0px' });
    io.observe(section);

    function update(){
      if (!active) return;
      const line = window.innerHeight * 0.62;
      words.forEach(word => {
        const rect = word.getBoundingClientRect();
        word.classList.toggle('is-revealed', rect.top < line);
      });
    }

    return { layout(){}, update };
  }

  /* -------------------------------------------------------------
     9. ROCK PARALLAX — living system section
  ------------------------------------------------------------- */
  function initRockParallax(){
    const section = $('#living-system');
    const rock = $('#rockParallax');
    if (!section || !rock) return null;
    if (prefersReducedMotion()) return null;

    function update(){
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      const offset = clamp((center - vh / 2) / vh, -1, 1);
      rock.style.transform =
        `translate(-50%, calc(-50% + ${(offset * -36).toFixed(1)}px)) rotate(${(offset * 10).toFixed(1)}deg)`;
    }

    return { layout(){}, update };
  }

  /* -------------------------------------------------------------
     10. MASTER SCROLL / RESIZE TICKER
  ------------------------------------------------------------- */
  function initTicker(controllers){
    let ticking = false;

    function runAll(){
      controllers.forEach(c => c && c.update && c.update());
      ticking = false;
    }
    function onScroll(){
      if (!ticking){
        ticking = true;
        requestAnimationFrame(runAll);
      }
      updateHeaderTheme();
      updateAtTop();
    }
    function onResize(){
      controllers.forEach(c => c && c.layout && c.layout());
      onScroll();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // initial paint
    onResize();
    runAll();
    updateHeaderTheme();
    updateAtTop();
  }

  /* -------------------------------------------------------------
     11. MISC — placeholder links
  ------------------------------------------------------------- */
  function initMisc(){
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href="#"]');
      if (a) e.preventDefault();
    });
  }

  /* -------------------------------------------------------------
     BOOTSTRAP
  ------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    buildMegaMenu();
    initNavToggles();
    initReveals();
    initMisc();

    const controllers = [
      initBottleneck(),
      initProducts(),
      initLoop(),
      initRockParallax()
    ].filter(Boolean);

    initTicker(controllers);
  });

})();
