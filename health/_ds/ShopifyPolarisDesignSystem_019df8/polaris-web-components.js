/* ============================================================================
   Polaris Web Components — standalone implementation
   ----------------------------------------------------------------------------
   Registers the `s-*` custom elements from Shopify's framework-agnostic
   Polaris web component library (the current, stable direction — Polaris React
   is now deprecated). The real library ships from
   cdn.shopify.com/shopifycloud/polaris.js and only renders inside the Shopify
   admin (it inherits merchant branding and blocks CSS overrides). This file is
   an OFFLINE re-implementation styled with the Polaris design tokens in
   colors_and_type.css, so you can author mocks in real `<s-*>` syntax and have
   them render anywhere.

   Load order on a page:
     <link rel="stylesheet" href="colors_and_type.css">   (defines --p-* tokens)
     <script src="polaris-web-components.js"></script>      (this file — core)
     <script src="polaris-web-components-forms.js"></script>(form fields)

   Covered here (core): s-page, s-section, s-stack, s-box, s-grid, s-divider,
   s-heading, s-text, s-paragraph, s-button, s-link, s-button-group, s-chip,
   s-clickable, s-badge, s-banner, s-spinner, s-icon, s-thumbnail, s-avatar,
   s-image, s-unordered-list, s-ordered-list, s-modal.
   ============================================================================ */
(function () {
  'use strict';
  if (window.__polarisWCcore) return;
  window.__polarisWCcore = true;

  /* ---- resolve asset base from this script's own URL ---- */
  var SCRIPT = document.currentScript;
  var BASE = SCRIPT ? SCRIPT.src.replace(/[^/]+$/, '') : '';
  var ICON_BASE = (window.PolarisWC && window.PolarisWC.iconBase) || (BASE + 'assets/icons/');
  window.PolarisWC = window.PolarisWC || {};
  window.PolarisWC.iconBase = ICON_BASE;

  /* ---- spacing scale: t-shirt keywords → px (matches Polaris gap/padding) ---- */
  var SPACE = {
    'none': '0', '0': '0',
    'small-500': '2px', 'small-400': '4px', 'small-300': '6px', 'small-200': '8px', 'small-100': '12px',
    'extratight': '4px', 'extra-tight': '4px', 'extrasmall': '4px', 'extra-small': '4px',
    'tight': '8px', 'small': '8px',
    'base': '12px',
    'medium': '16px',
    'loose': '20px', 'large': '20px', 'large-100': '24px',
    'extraloose': '24px', 'extra-loose': '24px', 'extralarge': '24px', 'extra-large': '24px',
    'large-200': '32px', 'large-300': '40px', 'large-400': '48px', 'large-500': '64px'
  };
  function space(v) {
    if (v == null || v === '') return null;
    var k = String(v).toLowerCase();
    return SPACE.hasOwnProperty(k) ? SPACE[k] : v; /* allow raw px values too */
  }

  var RADIUS = { none: '0', small: '4px', base: '8px', large: '12px', larger: '16px', 'large-100': '16px', full: '9999px' };
  function radius(v) { if (v == null) return null; var k = String(v).toLowerCase(); return RADIUS[k] || v; }

  /* ---- icon name → file (e.g. "menu-horizontal" → MenuHorizontalIcon.svg) ---- */
  function iconUrl(name) {
    if (!name) return '';
    var pascal = String(name).split(/[-_ ]/).map(function (s) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }).join('');
    if (!/Icon$/.test(pascal)) pascal += 'Icon';
    return ICON_BASE + pascal + '.svg';
  }
  window.PolarisWC.iconUrl = iconUrl;

  /* ---- shared shadow stylesheet ---- */
  var CSS = `
  :host { box-sizing: border-box; font-family: var(--p-font-family-sans, Inter, system-ui, sans-serif); }
  :host *, :host *::before, :host *::after { box-sizing: border-box; }

  /* ----- Page ----- */
  :host([_page]) { display: block; }
  .page { max-width: 998px; margin: 0 auto; padding: 20px 24px 64px; display: flex; flex-direction: column; gap: 16px; }
  .page.full { max-width: none; }
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .page-back { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--p-color-text-secondary); margin-bottom: 6px; border-radius: var(--p-border-radius-200); }
  .page-back:hover { background: var(--p-color-bg-fill-tertiary-hover); }
  .page-title { font-size: var(--p-font-size-500); line-height: var(--p-font-line-height-600); font-weight: var(--p-font-weight-semibold); letter-spacing: var(--p-font-letter-spacing-dense); margin: 0; color: var(--p-color-text); }
  .page-sub { font-size: 13px; line-height: 20px; color: var(--p-color-text-secondary); margin-top: 4px; }
  .page-actions { display: flex; gap: 8px; flex-shrink: 0; }

  /* ----- Section (card) ----- */
  .section { position: relative; background: var(--p-color-bg-surface, #fff); border-radius: var(--p-border-radius-300, 12px); box-shadow: var(--p-shadow-100); padding: var(--p-space-400, 16px); display: flex; flex-direction: column; gap: 12px; }
  .section::before { content: ''; position: absolute; inset: 0; z-index: 0; box-shadow: var(--p-shadow-bevel-100); border-radius: inherit; pointer-events: none; mix-blend-mode: luminosity; }
  .section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .section-title { font-size: var(--p-font-size-325); line-height: var(--p-font-line-height-500); font-weight: var(--p-font-weight-semibold); margin: 0; color: var(--p-color-text); }

  /* ----- Typography ----- */
  .t { margin: 0; color: var(--p-color-text); font-weight: var(--p-font-weight-regular, 450); }
  .t.subdued { color: var(--p-color-text-secondary); }
  .t.critical { color: var(--p-color-text-critical); }
  .t.success { color: var(--p-color-text-success); }
  .t.info { color: var(--p-color-text-info); }
  .t.caution { color: var(--p-color-text-caution); }
  .t.headingXl { font-size: 24px; line-height: 32px; font-weight: var(--p-font-weight-bold); letter-spacing: var(--p-font-letter-spacing-dense); }
  .t.headingLg { font-size: 20px; line-height: 24px; font-weight: var(--p-font-weight-semibold); letter-spacing: var(--p-font-letter-spacing-dense); }
  .t.headingMd { font-size: 14px; line-height: 20px; font-weight: var(--p-font-weight-semibold); }
  .t.headingSm { font-size: 13px; line-height: 20px; font-weight: var(--p-font-weight-semibold); }
  .t.headingXs { font-size: 12px; line-height: 16px; font-weight: var(--p-font-weight-semibold); }
  .t.bodyLg { font-size: 14px; line-height: 20px; }
  .t.bodyMd { font-size: 13px; line-height: 20px; }
  .t.bodySm { font-size: 12px; line-height: 16px; }
  .t.bodyXs { font-size: 11px; line-height: 12px; }
  .t.medium { font-weight: var(--p-font-weight-medium); }
  .t.strong, .t.semibold { font-weight: var(--p-font-weight-semibold); }
  .t.bold { font-weight: var(--p-font-weight-bold); }

  /* ----- Button ----- */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--p-space-050, 2px); font-family: inherit; font-weight: var(--p-font-weight-medium, 550); font-size: var(--p-font-size-300, 12px); line-height: var(--p-font-line-height-400, 16px); min-height: 28px; padding: var(--p-space-150, 6px) var(--p-space-300, 12px); border-radius: var(--p-border-radius-200, 8px); border: none; box-sizing: border-box; cursor: pointer; user-select: none; text-decoration: none; white-space: nowrap; transition: background var(--p-motion-duration-100, 100ms) var(--p-motion-ease, cubic-bezier(.25,.1,.25,1)); }
  .btn:focus-visible { outline: var(--p-border-width-050, 2px) solid var(--p-color-border-focus, #005BD3); outline-offset: var(--p-space-025, 1px); }
  .btn.secondary { background: var(--p-color-bg-fill, #fff); color: var(--p-color-text); box-shadow: var(--p-shadow-button); }
  .btn.secondary:hover { background: var(--p-color-bg-fill-hover); }
  .btn.secondary:active { background: var(--p-color-bg-fill-active); box-shadow: var(--p-shadow-button-inset); }
  .btn.primary { background: var(--p-color-button-gradient-bg-fill), var(--p-color-bg-fill-brand, #303030); color: var(--p-color-text-brand-on-bg-fill, #fff); box-shadow: var(--p-shadow-button-primary); }
  .btn.primary:hover { background: var(--p-color-button-gradient-bg-fill), var(--p-color-bg-fill-brand-hover, #1A1A1A); box-shadow: var(--p-shadow-button-primary-hover); }
  .btn.primary:active { background: var(--p-color-button-gradient-bg-fill), var(--p-color-bg-fill-brand-active, #1A1A1A); box-shadow: var(--p-shadow-button-primary-inset); }
  .btn.tertiary { background: transparent; color: var(--p-color-text); }
  .btn.tertiary:hover { background: var(--p-color-bg-fill-transparent-hover, rgba(0,0,0,.05)); }
  .btn.tertiary:active { background: var(--p-color-bg-fill-transparent-active, rgba(0,0,0,.08)); }
  .btn.primary.critical { background: var(--p-color-bg-fill-critical, #C70A24); color: var(--p-color-text-critical-on-bg-fill, #fff); box-shadow: var(--p-shadow-button-primary-critical); }
  .btn.primary.critical:hover { background: var(--p-color-bg-fill-critical-hover, #A30A24); box-shadow: var(--p-shadow-button-primary-critical-hover); }
  .btn.primary.critical:active { background: var(--p-color-bg-fill-critical-active); box-shadow: var(--p-shadow-button-primary-critical-inset); }
  .btn.secondary.critical, .btn.tertiary.critical { color: var(--p-color-text-critical); }
  .btn.plain { background: transparent; border: 0; box-shadow: none; color: var(--p-color-text-link); min-height: 0; padding: 0; }
  .btn.plain:hover { text-decoration: underline; color: var(--p-color-text-link-hover); }
  .btn.lg { min-height: 32px; }
  .btn.sl { min-height: 28px; }
  .btn.fw { width: 100%; }
  .btn[aria-disabled="true"], .btn:disabled { background: var(--p-color-bg-fill-disabled, rgba(0,0,0,.05)); color: var(--p-color-text-disabled, #B5B5B5); box-shadow: none; cursor: not-allowed; pointer-events: none; }
  .btn .ic { width: 16px; height: 16px; display: inline-flex; margin: -2px 0; }
  .btn .ic img { width: 16px; height: 16px; }
  .btn.primary .ic img, .btn.primary.critical .ic img { filter: invert(1); }
  .btn .spin { width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: pwc-spin .6s linear infinite; }

  /* ----- Link ----- */
  .lnk { color: var(--p-color-text-link); text-decoration: none; cursor: pointer; font-size: inherit; }
  .lnk:hover { text-decoration: underline; color: var(--p-color-text-link-hover); }

  /* ----- Badge ----- */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: var(--p-space-050, 2px) var(--p-space-200, 8px); border-radius: var(--p-border-radius-200, 8px); font-size: var(--p-font-size-300, 12px); font-weight: var(--p-font-weight-medium, 550); line-height: var(--p-font-line-height-400, 16px); background: var(--p-color-bg-fill-transparent-secondary, rgba(0,0,0,.06)); color: var(--p-color-text-secondary); }
  .badge .dot { width: 8px; height: 8px; border-radius: 3px; box-sizing: border-box; margin-left: -2px; }
  .badge.info { background: var(--p-color-bg-fill-info-secondary); color: var(--p-color-text-info); }
  .badge.success { background: var(--p-color-bg-fill-success-secondary); color: var(--p-color-text-success); }
  .badge.attention, .badge.caution { background: var(--p-color-bg-fill-caution-secondary); color: var(--p-color-text-caution); }
  .badge.warning { background: var(--p-color-bg-fill-warning-secondary); color: var(--p-color-text-warning); }
  .badge.critical { background: var(--p-color-bg-fill-critical-secondary); color: var(--p-color-text-critical); }
  .badge.magic { background: var(--p-color-bg-fill-magic-secondary); color: var(--p-color-text-magic); }

  /* ----- Banner ----- */
  .banner { position: relative; border-radius: var(--p-border-radius-300, 12px); background: var(--p-color-bg-surface); box-shadow: var(--p-shadow-200); overflow: hidden; }
  .banner::before { content: ''; position: absolute; inset: 0; z-index: 1; box-shadow: var(--p-shadow-bevel-100); border-radius: inherit; pointer-events: none; mix-blend-mode: luminosity; }
  .banner .bstrip { display: flex; align-items: center; gap: 8px; padding: var(--p-space-200, 8px) var(--p-space-300, 12px); }
  .banner .bstrip .btitle { font-size: 13px; line-height: 20px; font-weight: var(--p-font-weight-semibold, 650); flex: 1; }
  .banner .bbody { font-size: 13px; line-height: 20px; padding: var(--p-space-300, 12px) var(--p-space-400, 16px); color: var(--p-color-text); }
  .banner.info .bstrip { background: var(--p-color-bg-fill-info); color: var(--p-color-text-info-on-bg-fill); }
  .banner.success .bstrip { background: var(--p-color-bg-fill-success); color: var(--p-color-text-success-on-bg-fill); }
  .banner.warning .bstrip { background: var(--p-color-bg-fill-warning); color: var(--p-color-text-warning-on-bg-fill); }
  .banner.caution .bstrip { background: var(--p-color-bg-fill-caution); color: var(--p-color-text-caution-on-bg-fill); }
  .banner.critical .bstrip { background: var(--p-color-bg-fill-critical); color: var(--p-color-text-critical-on-bg-fill); }
  .banner.magic .bstrip { background: var(--p-color-bg-fill-magic); color: var(--p-color-text-magic-on-bg-fill); }
  .banner .bicon { width: 18px; height: 18px; flex: 0 0 18px; display: inline-flex; }
  .banner .bicon img { width: 18px; height: 18px; }
  .banner.info .bicon img, .banner.success .bicon img, .banner.critical .bicon img, .banner.magic .bicon img { filter: invert(1) brightness(2); }
  /* headerless banner: tinted surface row (withinContentContainer style) */
  .banner.flat { display: flex; gap: 10px; align-items: flex-start; padding: var(--p-space-300, 12px); border-radius: var(--p-border-radius-200, 8px); box-shadow: none; color: var(--p-color-text); }
  .banner.flat::before { content: none; }
  .banner.flat.info { background: var(--p-color-bg-surface-info); }
  .banner.flat.success { background: var(--p-color-bg-surface-success); }
  .banner.flat.warning { background: var(--p-color-bg-surface-warning); }
  .banner.flat.caution { background: var(--p-color-bg-surface-caution); }
  .banner.flat.critical { background: var(--p-color-bg-surface-critical); }
  .banner.flat.magic { background: var(--p-color-bg-surface-magic); }
  .banner.flat .bbody { padding: 0; flex: 1; }
  .banner.flat .bicon img { filter: none; }
  .banner .bdismiss { all: unset; cursor: pointer; display: inline-flex; opacity: .8; }
  .banner .bdismiss:hover { opacity: 1; }

  /* ----- Spinner ----- */
  .spinner { display: inline-block; border-radius: 50%; border: 3px solid var(--p-color-border); border-top-color: var(--p-color-text); animation: pwc-spin .6s linear infinite; }
  @keyframes pwc-spin { to { transform: rotate(360deg); } }

  /* ----- Icon ----- */
  .icon { display: inline-flex; align-items: center; justify-content: center; }
  .icon img { display: block; }

  /* ----- Thumbnail / Avatar / Image ----- */
  .thumb { border-radius: 8px; border: 1px solid var(--p-color-border); background: var(--p-color-bg-surface-secondary); object-fit: cover; display: block; }
  .avatar { border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; overflow: hidden; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .img { display: block; max-width: 100%; border-radius: 8px; }

  /* ----- Lists ----- */
  .list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 20px; }

  /* ----- Divider ----- */
  .divider { border: 0; border-top: 1px solid var(--p-color-border); margin: 0; height: 0; }

  /* ----- Chip ----- */
  .chip { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 4px 0 8px; border-radius: var(--p-border-radius-200, 8px); font-size: 12px; font-weight: var(--p-font-weight-medium, 550); background: var(--p-color-bg-fill-transparent-secondary, rgba(0,0,0,.06)); color: var(--p-color-text-secondary); }
  .chip .x { all: unset; cursor: pointer; display: inline-flex; color: var(--p-color-icon-secondary); }
  .chip .x svg { width: 12px; height: 12px; }

  /* ----- Modal ----- */
  .scrim { position: fixed; inset: 0; background: var(--p-color-backdrop-bg, rgba(0,0,0,.71)); display: flex; align-items: center; justify-content: center; z-index: var(--p-z-index-11, 519); padding: 24px; }
  .modal { background: var(--p-color-bg-surface, #fff); border-radius: var(--p-border-radius-400, 16px); box-shadow: var(--p-shadow-600); width: 100%; max-width: 480px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--p-color-border-secondary); }
  .modal-title { font-size: 14px; line-height: 20px; font-weight: var(--p-font-weight-semibold, 650); }
  .modal-body { padding: 16px; overflow: auto; font-size: 13px; line-height: 20px; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--p-color-border-secondary); }
  .modal-x { all: unset; cursor: pointer; color: var(--p-color-icon-secondary); display: inline-flex; border-radius: var(--p-border-radius-200); }
  .modal-x:hover { background: var(--p-color-bg-fill-transparent-hover); }
  `;

  var sheet = new CSSStyleSheet();
  sheet.replaceSync(CSS);
  window.__polarisWCsheet = sheet; /* shared with forms file */

  /* ---- base helpers ---- */
  function svgIcon(name, cls) {
    var u = iconUrl(name);
    return '<span class="' + (cls || 'icon') + '"><img src="' + u + '" alt="" width="16" height="16"></span>';
  }
  function attr(el, name) { return el.getAttribute(name); }
  function has(el, name) { return el.hasAttribute(name); }
  function setStyle(el, prop, val) { if (val != null) el.style.setProperty(prop, val); else el.style.removeProperty(prop); }

  /* base class: shadow root + shared sheet + a render() that runs on connect & attr change */
  function define(tag, spec) {
    if (customElements.get(tag)) return;
    var C = class extends HTMLElement {
      static get observedAttributes() { return spec.attrs || []; }
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.adoptedStyleSheets = [sheet].concat(spec.extraSheets || []);
        this._wrap = document.createElement('span'); /* not used by all */
      }
      connectedCallback() {
        if (spec.flag) this.setAttribute(spec.flag, '');
        this._render();
        if (spec.connected) spec.connected.call(this);
      }
      attributeChangedCallback() { if (this.isConnected) this._render(); }
      _render() { spec.render.call(this); }
    };
    customElements.define(tag, C);
    return C;
  }
  window.PolarisWC.define = define;
  window.PolarisWC.helpers = { svgIcon: svgIcon, space: space, radius: radius, attr: attr, has: has, setStyle: setStyle };

  /* ============================ LAYOUT ============================ */

  /* s-stack: flex container. direction block(default)=column, inline=row */
  define('s-stack', {
    attrs: ['direction', 'gap', 'alignitems', 'justifycontent', 'wrap', 'inlinesize'],
    render: function () {
      this.style.display = 'flex';
      var dir = (attr(this, 'direction') || 'block').toLowerCase();
      this.style.flexDirection = dir === 'inline' ? 'row' : 'column';
      this.style.flexWrap = (attr(this, 'wrap') === 'false') ? 'nowrap' : (dir === 'inline' ? 'wrap' : 'nowrap');
      setStyle(this, 'gap', space(attr(this, 'gap')) || '0');
      var ai = attr(this, 'alignItems') || attr(this, 'alignitems');
      var jc = attr(this, 'justifyContent') || attr(this, 'justifycontent');
      setStyle(this, 'align-items', ai);
      setStyle(this, 'justify-content', jc);
      if (!this.shadowRoot.querySelector('slot')) this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });

  /* s-box: padding / border / background container */
  define('s-box', {
    attrs: ['padding', 'paddingblock', 'paddinginline', 'paddingblockstart', 'paddingblockend', 'paddinginlinestart', 'paddinginlineend', 'background', 'borderwidth', 'border', 'borderradius', 'bordercolor', 'borderblockend', 'borderblockstart', 'minblocksize', 'mininlinesize', 'inlinesize'],
    render: function () {
      this.style.display = 'block';
      var p = function (n) { return space(attr(this, n)); }.bind(this);
      setStyle(this, 'padding', p('padding'));
      setStyle(this, 'padding-block', p('paddingBlock') != null ? p('paddingBlock') : (space(attr(this, 'paddingblock'))));
      setStyle(this, 'padding-inline', space(attr(this, 'paddingInline') || attr(this, 'paddinginline')));
      setStyle(this, 'padding-top', space(attr(this, 'paddingBlockStart') || attr(this, 'paddingblockstart')));
      setStyle(this, 'padding-bottom', space(attr(this, 'paddingBlockEnd') || attr(this, 'paddingblockend')));
      setStyle(this, 'padding-left', space(attr(this, 'paddingInlineStart') || attr(this, 'paddinginlinestart')));
      setStyle(this, 'padding-right', space(attr(this, 'paddingInlineEnd') || attr(this, 'paddinginlineend')));
      var bg = attr(this, 'background');
      if (bg) setStyle(this, 'background', bg === 'subdued' ? 'var(--p-color-bg-surface-secondary)' : bg === 'surface' ? 'var(--p-color-bg-surface)' : bg);
      var bw = attr(this, 'borderWidth') || attr(this, 'borderwidth') || (has(this, 'border') ? 'base' : null);
      if (bw) { this.style.borderStyle = 'solid'; this.style.borderWidth = bw === 'base' ? '1px' : (bw === 'thick' ? '2px' : bw); this.style.borderColor = attr(this, 'borderColor') || 'var(--p-color-border)'; }
      var be = attr(this, 'borderBlockEnd') || attr(this, 'borderblockend');
      if (be) { this.style.borderBottom = '1px solid var(--p-color-border)'; }
      var bbs = attr(this, 'borderBlockStart') || attr(this, 'borderblockstart');
      if (bbs) { this.style.borderTop = '1px solid var(--p-color-border)'; }
      setStyle(this, 'border-radius', radius(attr(this, 'borderRadius') || attr(this, 'borderradius')));
      setStyle(this, 'min-height', space(attr(this, 'minBlockSize') || attr(this, 'minblocksize')));
      setStyle(this, 'min-width', space(attr(this, 'minInlineSize') || attr(this, 'mininlinesize')));
      setStyle(this, 'width', attr(this, 'inlineSize') || attr(this, 'inlinesize'));
      if (!this.shadowRoot.querySelector('slot')) this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });

  /* s-grid */
  define('s-grid', {
    attrs: ['gridtemplatecolumns', 'gridtemplaterows', 'gap', 'columns'],
    render: function () {
      this.style.display = 'grid';
      var cols = attr(this, 'gridTemplateColumns') || attr(this, 'gridtemplatecolumns');
      var n = attr(this, 'columns');
      if (!cols && n) cols = 'repeat(' + n + ', 1fr)';
      setStyle(this, 'grid-template-columns', cols);
      setStyle(this, 'grid-template-rows', attr(this, 'gridTemplateRows') || attr(this, 'gridtemplaterows'));
      setStyle(this, 'gap', space(attr(this, 'gap')) || '0');
      if (!this.shadowRoot.querySelector('slot')) this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });

  /* s-divider */
  define('s-divider', {
    render: function () { this.shadowRoot.innerHTML = '<hr class="divider">'; this.style.display = 'block'; }
  });

  /* s-section: card container with optional heading */
  define('s-section', {
    attrs: ['heading'],
    render: function () {
      var h = attr(this, 'heading');
      var actions = '';
      this.shadowRoot.innerHTML =
        '<div class="section">' +
        (h ? '<div class="section-head"><h2 class="section-title">' + h + '</h2><slot name="actions"></slot></div>' : '') +
        '<slot></slot></div>';
      this.style.display = 'block';
    }
  });

  /* s-page: page container with heading + primary/secondary actions */
  define('s-page', {
    flag: '_page',
    attrs: ['heading', 'subtitle', 'backaction', 'fullwidth'],
    render: function () {
      var h = attr(this, 'heading') || '';
      var sub = attr(this, 'subtitle');
      var full = has(this, 'fullWidth') || has(this, 'fullwidth');
      this.shadowRoot.innerHTML =
        '<div class="page' + (full ? ' full' : '') + '">' +
          '<div class="page-head">' +
            '<div><h1 class="page-title">' + h + '</h1>' + (sub ? '<div class="page-sub">' + sub + '</div>' : '') + '</div>' +
            '<div class="page-actions"><slot name="primary-action"></slot><slot name="secondary-actions"></slot></div>' +
          '</div>' +
          '<slot></slot>' +
        '</div>';
    }
  });

  /* ============================ TYPOGRAPHY ============================ */
  function typo(tag, defaultVariant, block) {
    define(tag, {
      attrs: ['variant', 'tone', 'fontweight', 'weight'],
      render: function () {
        var v = attr(this, 'variant') || defaultVariant;
        var tone = attr(this, 'tone');
        var w = attr(this, 'fontWeight') || attr(this, 'weight');
        var cls = 't ' + v + (tone ? ' ' + tone : '') + (w === 'bold' || w === 'semibold' ? ' strong' : '');
        var el = block ? 'p' : 'span';
        this.style.display = block ? 'block' : 'inline';
        this.shadowRoot.innerHTML = '<' + el + ' class="' + cls + '"><slot></slot></' + el + '>';
      }
    });
  }
  typo('s-text', 'bodyMd', false);
  typo('s-paragraph', 'bodyMd', true);
  typo('s-heading', 'headingSm', true);

  /* ============================ ACTIONS ============================ */

  define('s-button', {
    attrs: ['variant', 'tone', 'size', 'icon', 'disabled', 'loading', 'href', 'fullwidth', 'accessibilitylabel', 'target'],
    render: function () {
      var variant = (attr(this, 'variant') || 'auto').toLowerCase();
      if (variant === 'auto') variant = 'secondary';
      var tone = (attr(this, 'tone') || '').toLowerCase();
      var size = (attr(this, 'size') || '').toLowerCase();
      var icon = attr(this, 'icon');
      var href = attr(this, 'href');
      var loading = has(this, 'loading');
      var disabled = has(this, 'disabled');
      var label = attr(this, 'accessibilityLabel') || attr(this, 'accessibilitylabel');
      var cls = 'btn ' + variant + (tone ? ' ' + tone : '') +
        (size === 'large' ? ' lg' : size === 'slim' ? ' sl' : '') +
        ((has(this, 'fullWidth') || has(this, 'fullwidth')) ? ' fw' : '');
      var inner = (loading ? '<span class="spin"></span>' : (icon ? svgIcon(icon, 'ic') : '')) + '<slot></slot>';
      var tagName = href ? 'a' : 'button';
      var extra = href ? ' href="' + href + '"' + (attr(this, 'target') ? ' target="' + attr(this, 'target') + '"' : '') : ' type="button"';
      if (disabled) extra += ' aria-disabled="true"';
      if (label) extra += ' aria-label="' + label + '"';
      this.shadowRoot.innerHTML = '<' + tagName + ' class="' + cls + '"' + extra + '>' + inner + '</' + tagName + '>';
      this.style.display = (has(this, 'fullWidth') || has(this, 'fullwidth')) ? 'block' : 'inline-block';
    }
  });

  define('s-link', {
    attrs: ['href', 'tone', 'target', 'external'],
    render: function () {
      var href = attr(this, 'href') || '#';
      var ext = has(this, 'external');
      this.style.display = 'inline';
      this.shadowRoot.innerHTML = '<a class="lnk" href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '><slot></slot></a>';
    }
  });

  define('s-clickable', {
    render: function () {
      this.style.display = 'inline-block'; this.style.cursor = 'pointer';
      this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });

  define('s-button-group', {
    render: function () {
      this.style.display = 'flex'; this.style.gap = '8px'; this.style.flexWrap = 'wrap'; this.style.alignItems = 'center';
      this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });

  define('s-chip', {
    attrs: ['removable'],
    render: function () {
      var x = has(this, 'removable') ? '<button class="x" aria-label="Remove"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l6 6m0-6l-6 6"/></svg></button>' : '';
      this.style.display = 'inline-flex';
      this.shadowRoot.innerHTML = '<span class="chip"><slot></slot>' + x + '</span>';
    }
  });
  /* alias used by some docs */
  define('s-clickable-chip', { attrs: ['removable'], render: function(){ var x='<button class="x" aria-label="Remove"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l6 6m0-6l-6 6"/></svg></button>'; this.style.display='inline-flex'; this.style.cursor='pointer'; this.shadowRoot.innerHTML='<span class="chip"><slot></slot>'+(has(this,'removable')?x:'')+'</span>'; } });

  /* ============================ FEEDBACK ============================ */

  var STATUS_ICON = { info: 'InfoIcon', success: 'CheckCircleIcon', warning: 'AlertTriangleIcon', critical: 'AlertCircleIcon', caution: 'AlertTriangleIcon' };

  define('s-badge', {
    attrs: ['tone', 'progress'],
    render: function () {
      var tone = (attr(this, 'tone') || 'default').toLowerCase();
      var prog = attr(this, 'progress');
      var dotColor = {
        success: 'var(--p-color-icon-success)', info: 'var(--p-color-icon-info)', attention: 'var(--p-color-icon-caution)',
        caution: 'var(--p-color-icon-caution)', warning: 'var(--p-color-icon-warning)', critical: 'var(--p-color-icon-critical)', default: 'var(--p-color-icon-secondary)'
      }[tone] || 'var(--p-color-icon-secondary)';
      var dot = '';
      if (prog === 'complete') dot = '<span class="dot" style="background:' + dotColor + '"></span>';
      else if (prog === 'partiallyComplete' || prog === 'partiallycomplete') dot = '<span class="dot" style="background:linear-gradient(to top,' + dotColor + ' 50%,transparent 50%);border:1.25px solid ' + dotColor + '"></span>';
      else if (prog === 'incomplete') dot = '<span class="dot" style="border:1.25px solid ' + dotColor + '"></span>';
      this.style.display = 'inline-flex';
      this.shadowRoot.innerHTML = '<span class="badge ' + tone + '">' + dot + '<slot></slot></span>';
    }
  });

  define('s-banner', {
    attrs: ['tone', 'heading', 'dismissible'],
    render: function () {
      var tone = (attr(this, 'tone') || 'info').toLowerCase();
      var heading = attr(this, 'heading');
      var ic = STATUS_ICON[tone] || 'InfoIcon';
      var dismiss = has(this, 'dismissible') ? '<button class="bdismiss" aria-label="Dismiss"><img src="' + iconUrl('x') + '" width="16" height="16" alt=""></button>' : '';
      this.style.display = 'block';
      if (heading) {
        /* page-level banner: solid tone strip with icon + heading, body on surface */
        this.shadowRoot.innerHTML =
          '<div class="banner ' + tone + '">' +
          '<div class="bstrip"><span class="bicon"><img src="' + iconUrl(ic) + '" width="18" height="18" alt=""></span>' +
          '<span class="btitle">' + heading + '</span>' + dismiss + '</div>' +
          '<div class="bbody"><slot></slot></div>' +
          '</div>';
      } else {
        /* headerless banner: tinted surface row (withinContentContainer) */
        this.shadowRoot.innerHTML =
          '<div class="banner flat ' + tone + '">' +
          '<span class="bicon"><img src="' + iconUrl(ic) + '" width="18" height="18" alt=""></span>' +
          '<div class="bbody"><slot></slot></div>' + dismiss + '</div>';
      }
      var d = this.shadowRoot.querySelector('.bdismiss');
      if (d) d.onclick = function () { this.remove(); }.bind(this);
    }
  });

  define('s-spinner', {
    attrs: ['size'],
    render: function () {
      var s = attr(this, 'size') === 'large' ? 32 : attr(this, 'size') === 'small' ? 16 : 20;
      this.style.display = 'inline-flex';
      this.shadowRoot.innerHTML = '<span class="spinner" style="width:' + s + 'px;height:' + s + 'px"></span>';
    }
  });

  /* ============================ MEDIA ============================ */

  define('s-icon', {
    attrs: ['icon', 'type', 'tone', 'size'],
    render: function () {
      var name = attr(this, 'icon') || attr(this, 'type');
      var sz = attr(this, 'size') === 'large' ? 20 : attr(this, 'size') === 'small' ? 14 : 16;
      var toneColor = { subdued: 'var(--p-color-icon-secondary)', critical: 'var(--p-color-icon-critical)', success: 'var(--p-color-icon-success)', info: 'var(--p-color-icon-info)' }[attr(this, 'tone')] || 'var(--p-color-icon)';
      this.style.display = 'inline-flex'; this.style.color = toneColor;
      this.shadowRoot.innerHTML = '<span class="icon"><img src="' + iconUrl(name) + '" width="' + sz + '" height="' + sz + '" alt="" style="filter:none"></span>';
    }
  });

  define('s-thumbnail', {
    attrs: ['src', 'alt', 'size'],
    render: function () {
      var sz = { small: 40, base: 56, large: 80 }[attr(this, 'size')] || 56;
      var src = attr(this, 'src');
      this.style.display = 'inline-block';
      this.shadowRoot.innerHTML = src
        ? '<img class="thumb" src="' + src + '" alt="' + (attr(this, 'alt') || '') + '" style="width:' + sz + 'px;height:' + sz + 'px">'
        : '<span class="thumb" style="width:' + sz + 'px;height:' + sz + 'px;display:inline-flex;align-items:center;justify-content:center"><img src="' + iconUrl('image') + '" width="20" height="20" alt="" style="opacity:.4"></span>';
    }
  });

  define('s-avatar', {
    attrs: ['src', 'initials', 'size', 'name'],
    render: function () {
      var sz = { small: 24, base: 32, large: 40, xl: 56 }[attr(this, 'size')] || 32;
      var src = attr(this, 'src');
      var initials = attr(this, 'initials') || (attr(this, 'name') ? attr(this, 'name').split(/\s+/).map(function (s) { return s[0]; }).slice(0, 2).join('') : '');
      var palette = ['#C530C5', '#52F490', '#2CE0D4', '#51C0FF', '#FD4B92', '#25E82B', '#9474FF'];
      var fg = ['#FDEFFD', '#014B40', '#033C39', '#002133', '#FFF6F8', '#033D05', '#F8F7FF'];
      var idx = (initials.charCodeAt(0) || 0) % palette.length;
      this.style.display = 'inline-flex';
      this.shadowRoot.innerHTML = src
        ? '<span class="avatar" style="width:' + sz + 'px;height:' + sz + 'px"><img src="' + src + '" alt=""></span>'
        : '<span class="avatar" style="width:' + sz + 'px;height:' + sz + 'px;background:' + palette[idx] + ';color:' + fg[idx] + ';font-size:' + (sz * 0.4) + 'px">' + initials + '</span>';
    }
  });

  define('s-image', {
    attrs: ['src', 'alt', 'borderradius'],
    render: function () {
      this.style.display = 'block';
      this.shadowRoot.innerHTML = '<img class="img" src="' + (attr(this, 'src') || '') + '" alt="' + (attr(this, 'alt') || '') + '" style="border-radius:' + (radius(attr(this, 'borderRadius') || attr(this, 'borderradius')) || '8px') + '">';
    }
  });

  /* ============================ LISTS ============================ */
  define('s-unordered-list', { render: function () { this.style.display = 'block'; this.shadowRoot.innerHTML = '<ul class="list"><slot></slot></ul>'; } });
  define('s-ordered-list', { render: function () { this.style.display = 'block'; this.shadowRoot.innerHTML = '<ol class="list"><slot></slot></ol>'; } });
  define('s-list-item', { render: function () { this.style.display = 'list-item'; this.shadowRoot.innerHTML = '<slot></slot>'; } });

  /* ============================ MODAL ============================ */
  define('s-modal', {
    attrs: ['heading', 'open'],
    connected: function () {
      this.hideOverlay = function () { this.removeAttribute('open'); };
      this.showOverlay = function () { this.setAttribute('open', ''); };
    },
    render: function () {
      var open = has(this, 'open');
      if (!open) { this.shadowRoot.innerHTML = ''; this.style.display = 'none'; return; }
      this.style.display = 'block';
      var heading = attr(this, 'heading') || '';
      this.shadowRoot.innerHTML =
        '<div class="scrim"><div class="modal">' +
        '<div class="modal-head"><span class="modal-title">' + heading + '</span><button class="modal-x" aria-label="Close"><img src="' + iconUrl('x') + '" width="18" height="18" alt=""></button></div>' +
        '<div class="modal-body"><slot></slot></div>' +
        '<div class="modal-foot"><slot name="footer"></slot></div>' +
        '</div></div>';
      var close = function () { this.hideOverlay(); }.bind(this);
      this.shadowRoot.querySelector('.modal-x').onclick = close;
      this.shadowRoot.querySelector('.scrim').addEventListener('click', function (e) { if (e.target.classList.contains('scrim')) close(); });
    }
  });

  /* command / commandFor wiring (s-button command="--show" commandFor="id") */
  document.addEventListener('click', function (e) {
    var path = e.composedPath();
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node.tagName === 'S-BUTTON' && (node.getAttribute('commandFor') || node.getAttribute('commandfor'))) {
        var id = node.getAttribute('commandFor') || node.getAttribute('commandfor');
        var cmd = (node.getAttribute('command') || '--show').toLowerCase();
        var target = document.getElementById(id);
        if (target) {
          if (cmd.indexOf('hide') >= 0) target.hideOverlay && target.hideOverlay();
          else if (cmd.indexOf('toggle') >= 0) { has(target, 'open') ? target.hideOverlay() : target.showOverlay(); }
          else target.showOverlay && target.showOverlay();
        }
        break;
      }
    }
  });

})();
