const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const errors = [];

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  beforeParse(window) {
    // jsdom doesn't implement layout, IntersectionObserver, matchMedia, or elementFromPoint.
    // Provide minimal shims so the real script.js can execute end-to-end without throwing.
    window.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.matchMedia = window.matchMedia || function (query) {
      return {
        matches: query.includes('1024px') ? false : false, // simulate mobile viewport
        media: query,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {}
      };
    };
    window.document.elementFromPoint = () => null;
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    };
    window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    window.onerror = (msg) => { errors.push(String(msg)); };
  }
});

const { window } = dom;

window.addEventListener('error', (e) => {
  errors.push((e.error && e.error.stack) || e.message);
});

// Load stylesheet text just to confirm the linked path resolves (jsdom won't fetch remote fonts/icons — fine)
const cssPath = path.join(__dirname, 'css', 'style.css');
if (!fs.existsSync(cssPath)) errors.push('css/style.css missing');

// Manually inject script.js (module scripts loaded via <script src> aren't fetched by jsdom without a live server)
const scriptSrc = fs.readFileSync(path.join(__dirname, 'js', 'script.js'), 'utf8');
try {
  window.eval(scriptSrc);
} catch (err) {
  errors.push('Top-level script error: ' + err.stack);
}

// jsdom fires a real 'DOMContentLoaded' event asynchronously on its own once
// parsing completes — we just wait for it rather than dispatching a second,
// duplicate one ourselves (which would double-run the bootstrap listeners).

// Give preloader's setTimeout chain a moment to run, then assert on resulting DOM state
setTimeout(() => {
  try {
    const doc = window.document;

    // Mega menu should have been populated from the footer nav (5 categories)
    const megaCats = doc.querySelectorAll('#megaMenuColumns .mm-cat');
    if (megaCats.length !== 5) errors.push(`Expected 5 mega-menu categories, got ${megaCats.length}`);

    const megaLinks = doc.querySelectorAll('#megaMenuColumns .mm-cat__panel a');
    if (megaLinks.length !== 14) errors.push(`Expected 14 mega-menu links total, got ${megaLinks.length}`);

    // Nav toggle should open the menu
    doc.getElementById('navCompact').dispatchEvent(new window.Event('click', { bubbles: true }));
    if (!doc.getElementById('megaMenu').classList.contains('is-open')) {
      errors.push('Mega menu did not open on navCompact click');
    }
    // Close it again
    doc.getElementById('megaMenuClose').dispatchEvent(new window.Event('click', { bubbles: true }));
    if (doc.getElementById('megaMenu').classList.contains('is-open')) {
      errors.push('Mega menu did not close on close-button click');
    }

    // Category accordion open/close
    const firstTrigger = doc.querySelector('#megaMenuColumns .mm-cat__trigger');
    firstTrigger.dispatchEvent(new window.Event('click', { bubbles: true }));
    if (!firstTrigger.closest('.mm-cat').classList.contains('is-open')) {
      errors.push('First mega-menu category did not expand on click');
    }

    // Scroll + resize should not throw (exercises pin controllers, header theme, loop reveal, parallax)
    window.dispatchEvent(new window.Event('resize'));
    window.scrollY = 500;
    window.dispatchEvent(new window.Event('scroll'));
    window.scrollY = 3000;
    window.dispatchEvent(new window.Event('scroll'));

    // Placeholder-link click handling shouldn't throw and should preventDefault
    const legalLink = doc.querySelector('.site-footer__legal-links a');
    let defaultPrevented = false;
    legalLink.addEventListener('click', (e) => { defaultPrevented = e.defaultPrevented; });
    legalLink.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    console.log('--- Smoke test results ---');
    console.log('Mega menu categories found:', megaCats.length);
    console.log('Mega menu links found:', megaLinks.length);
    console.log('Placeholder link preventDefault fired (best-effort):', defaultPrevented);
    console.log('Errors captured:', errors.length);
    errors.forEach((e, i) => console.log(`  [${i + 1}]`, e));

    process.exit(errors.length ? 1 : 0);
  } catch (err) {
    console.log('Assertion phase threw:', err.stack);
    process.exit(1);
  }
}, 3000);
