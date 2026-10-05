/* ============================================================================
   Polaris Web Components — form fields
   Registers: s-text-field, s-email-field, s-url-field, s-search-field,
   s-password-field, s-number-field, s-money-field, s-text-area, s-select,
   s-checkbox, s-switch, s-choice-list, s-choice, s-color-field, s-date-field,
   s-drop-zone.
   Requires polaris-web-components.js to be loaded first.
   ============================================================================ */
(function () {
  'use strict';
  if (!window.PolarisWC || !window.PolarisWC.define) {
    console.error('[polaris-web-components-forms] load polaris-web-components.js first');
    return;
  }
  if (window.__polarisWCforms) return;
  window.__polarisWCforms = true;

  var define = window.PolarisWC.define;
  var H = window.PolarisWC.helpers;
  var iconUrl = window.PolarisWC.iconUrl;
  var attr = H.attr, has = H.has;

  /* ---- forms-specific shadow stylesheet ---- */
  var FCSS = `
  :host { display: block; box-sizing: border-box; font-family: var(--p-font-family-sans, Inter, sans-serif); }
  :host([_inline]) { display: inline-block; }
  *, *::before, *::after { box-sizing: border-box; }

  .field { display: flex; flex-direction: column; gap: 4px; }
  .lbl { font-size: 13px; line-height: 20px; font-weight: var(--p-font-weight-regular, 450); color: var(--p-color-text); }
  .lbl .req { color: var(--p-color-icon-critical); margin-left: 2px; }
  .lbl-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .optional { font-size: 12px; color: var(--p-color-text-secondary); font-weight: 400; }
  .help { font-size: 12px; line-height: 16px; color: var(--p-color-text-secondary); }
  .err { font-size: 12px; line-height: 16px; color: var(--p-color-text-critical); display: flex; align-items: center; gap: 4px; }
  .err img { width: 14px; height: 14px; }

  .control { position: relative; display: flex; align-items: stretch; border-radius: var(--p-border-radius-200, 8px);
    background: var(--p-color-input-bg-surface, #FDFDFD);
    transition: border-color var(--p-motion-duration-100, 100ms) var(--p-motion-ease), background var(--p-motion-duration-100, 100ms) var(--p-motion-ease); }
  .control::before { content: ''; position: absolute; inset: 0; border: var(--p-border-width-0165, 0.66px) solid var(--p-color-input-border, #8A8A8A); border-top-color: #898F94; border-radius: inherit; pointer-events: none; }
  .control:hover { background: var(--p-color-input-bg-surface-hover, #FAFAFA); }
  .control:hover::before { border-color: var(--p-color-input-border-hover, #616161); }
  .control:focus-within { background: var(--p-color-input-bg-surface-active, #F7F7F7); outline: var(--p-border-width-050, 2px) solid var(--p-color-border-focus, #005BD3); outline-offset: var(--p-space-025, 1px); }
  .control:focus-within::before { border: var(--p-border-width-025, 1px) solid var(--p-color-input-border-active, #1A1A1A); }
  .control.err-state { background: var(--p-color-bg-surface-critical); }
  .control.err-state::before { border-color: var(--p-color-border-critical-secondary, #8E0B21); }
  .control.disabled { background: var(--p-color-bg-surface-disabled, rgba(0,0,0,.05)); }
  .control.disabled::before { border: none; }

  input, textarea, select { font: inherit; font-size: 13px; line-height: 20px; color: var(--p-color-text); background: transparent; border: 0; outline: 0; width: 100%; padding: var(--p-space-150, 6px) var(--p-space-300, 12px); min-height: 32px; }
  textarea { line-height: 20px; min-height: 78px; resize: vertical; }
  input::placeholder, textarea::placeholder { color: var(--p-color-text-secondary); }
  input:disabled, textarea:disabled, select:disabled { color: var(--p-color-text-disabled); cursor: not-allowed; }
  select { appearance: none; -webkit-appearance: none; padding-right: 32px; cursor: pointer; }

  .affix { display: flex; align-items: center; font-size: 13px; color: var(--p-color-text-secondary); user-select: none; }
  .affix.prefix { margin: 0 0 0 12px; }
  .affix.prefix ~ input { padding-left: 6px; }
  .affix.suffix { margin: 0 12px 0 4px; }
  .lead, .trail { display: flex; align-items: center; justify-content: center; width: 32px; color: var(--p-color-icon-secondary); flex: 0 0 32px; }
  .lead img, .trail img { width: 16px; height: 16px; }
  .iconbtn { all: unset; cursor: pointer; }
  .caret { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; pointer-events: none; }

  /* stepper */
  .spin { display: flex; flex-direction: column; width: 22px; margin: 4px; gap: 1px; }
  .spin button { flex: 1; all: unset; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--p-color-icon); background: var(--p-color-bg-fill-tertiary); border-radius: var(--p-border-radius-100, 4px); }
  .spin button:hover { background: var(--p-color-bg-fill-tertiary-hover); }
  .spin button:active { background: var(--p-color-bg-fill-tertiary-active); }
  .spin svg { width: 9px; height: 9px; }

  /* checkbox & radio */
  .choice { display: inline-flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 13px; line-height: 20px; color: var(--p-color-text); padding: 2px 0; }
  .choice input { position: absolute; opacity: 0; width: 0; height: 0; }
  .mark { width: 18px; height: 18px; flex: 0 0 18px; margin-top: 1px; background: var(--p-color-input-bg-surface); border: var(--p-border-width-025, 1px) solid var(--p-color-input-border, #8A8A8A); display: flex; align-items: center; justify-content: center; transition: all var(--p-motion-duration-100, 100ms) var(--p-motion-ease); }
  .mark.checkbox { border-radius: var(--p-border-radius-100, 4px); } .mark.radio { border-radius: 50%; }
  .choice:hover .mark { border-color: var(--p-color-input-border-hover, #616161); }
  .choice input:focus-visible + .mark { outline: var(--p-border-width-050, 2px) solid var(--p-color-border-focus); outline-offset: var(--p-space-025, 1px); }
  .choice input:checked + .mark.checkbox { background: var(--p-color-bg-fill-brand, #303030); border-color: var(--p-color-bg-fill-brand, #303030); }
  .choice input:checked + .mark.checkbox::after { content:''; width:10px; height:10px; background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='4 11 8 15 16 6'/></svg>") no-repeat center/contain; }
  .choice input:checked + .mark.radio { border-color: var(--p-color-bg-fill-brand, #303030); }
  .choice input:checked + .mark.radio::after { content:''; width:10px; height:10px; border-radius:50%; background:var(--p-color-bg-fill-brand, #303030); }
  .mark.indeterminate { background:var(--p-color-bg-fill-brand, #303030); border-color:var(--p-color-bg-fill-brand, #303030); } .mark.indeterminate::after { content:''; width:8px; height:2px; background:#fff; border-radius:1px; }
  .choice.disabled { color: var(--p-color-text-disabled); cursor: not-allowed; }
  .choice.disabled .mark { background: var(--p-color-checkbox-bg-surface-disabled, rgba(0,0,0,.08)); border-color: transparent; }
  .choice-content { display: flex; flex-direction: column; gap: 2px; }
  .choice-desc { font-size: 12px; color: var(--p-color-text-secondary); line-height: 16px; }

  /* switch */
  .sw-row { display: flex; align-items: center; gap: 12px; }
  .sw-label { flex: 1; }
  .sw-title { font-size: 13px; line-height: 20px; font-weight: var(--p-font-weight-regular, 450); color: var(--p-color-text); }
  .sw-desc { font-size: 12px; color: var(--p-color-text-secondary); margin-top: 2px; line-height: 16px; }
  .sw { position: relative; width: 32px; height: 18px; flex: 0 0 32px; display: inline-block; cursor: pointer; }
  .sw input { position: absolute; opacity: 0; width: 0; height: 0; }
  .sw .track { position: absolute; inset: 0; background: var(--p-color-bg-fill-selected, #CCC); border-radius: var(--p-border-radius-full); transition: background var(--p-motion-duration-150, 150ms) var(--p-motion-ease); }
  .sw .thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: #fff; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform var(--p-motion-duration-150, 150ms) var(--p-motion-ease); }
  .sw input:checked ~ .track { background: var(--p-color-bg-fill-brand, #303030); }
  .sw input:checked ~ .thumb { transform: translateX(14px); }
  .sw input:focus-visible ~ .track { outline: var(--p-border-width-050, 2px) solid var(--p-color-border-focus); outline-offset: var(--p-space-025, 1px); }
  .sw input:disabled ~ .track { background: var(--p-color-bg-fill-disabled); }

  /* color field */
  .swatch { width: 30px; height: 30px; border-radius: 6px 0 0 6px; flex: 0 0 30px; border-right: 1px solid var(--p-color-border); }

  /* drop zone */
  .dz { border: 1px dashed var(--p-color-border-tertiary, #CCC); border-radius: var(--p-border-radius-200, 8px); background: var(--p-color-bg-surface); padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; cursor: pointer; transition: all var(--p-motion-duration-150, 150ms) var(--p-motion-ease); }
  .dz:hover { background: var(--p-color-bg-surface-hover); border-color: var(--p-color-input-border-hover); }
  .dz.active { border-color: var(--p-color-border-focus); background: var(--p-color-bg-surface-emphasis, #F0F2FF); }
  .dz-btn { background: var(--p-color-bg-fill); border: none; box-shadow: var(--p-shadow-button); border-radius: var(--p-border-radius-200, 8px); padding: 6px 12px; font: inherit; font-size: 12px; line-height: 16px; font-weight: var(--p-font-weight-medium, 550); color: var(--p-color-text); cursor: pointer; }
  .dz-hint { font-size: 13px; color: var(--p-color-text-secondary); }
  .dz-sub { font-size: 12px; color: var(--p-color-text-secondary); }
  `;
  var fsheet = new CSSStyleSheet();
  fsheet.replaceSync(FCSS);
  var sheets = [window.__polarisWCsheet, fsheet];

  var CARET = '<svg class="caret" viewBox="0 0 20 20" fill="var(--p-color-text)"><path d="M5 8l5 5 5-5z"/></svg>';
  var ERRICON = '<img src="' + iconUrl('alert-circle') + '" alt="">';

  /* shared label + help/error wrapper */
  function fieldShell(self, controlHTML) {
    var label = attr(self, 'label');
    var help = attr(self, 'helpText') || attr(self, 'helptext');
    var error = attr(self, 'error');
    var required = has(self, 'required');
    var optional = (attr(self, 'requiredIndicator') === 'optional') || has(self, 'optional');
    return '<div class="field">' +
      (label ? '<div class="lbl-row"><span class="lbl">' + label + (required ? '<span class="req">*</span>' : '') + '</span>' + (optional ? '<span class="optional">Optional</span>' : '') + '</div>' : '') +
      controlHTML +
      (error ? '<span class="err">' + ERRICON + error + '</span>' : (help ? '<span class="help">' + help + '</span>' : '')) +
      '</div>';
  }

  /* generic text-like input field factory */
  function textField(tag, opts) {
    opts = opts || {};
    define(tag, {
      extraSheets: sheets.slice(1),
      attrs: ['label', 'value', 'placeholder', 'helptext', 'error', 'required', 'disabled', 'type', 'prefix', 'suffix', 'icon', 'multiline', 'min', 'max', 'step'],
      connected: function () {
        Object.defineProperty(this, 'value', {
          configurable: true,
          get: function () { var i = this.shadowRoot.querySelector('input,textarea,select'); return i ? i.value : this.getAttribute('value'); },
          set: function (v) { this.setAttribute('value', v); }
        });
      },
      render: function () {
        this.shadowRoot.adoptedStyleSheets = sheets;
        var val = attr(this, 'value') || '';
        var ph = attr(this, 'placeholder') || '';
        var disabled = has(this, 'disabled');
        var error = attr(this, 'error');
        var prefix = opts.prefix || attr(this, 'prefix');
        var suffix = opts.suffix || attr(this, 'suffix');
        var icon = opts.icon || attr(this, 'icon');
        var trailing = opts.trailing;
        var type = opts.type || attr(this, 'type') || 'text';
        var multiline = has(this, 'multiline') || opts.multiline;
        var ctlClass = 'control' + (error ? ' err-state' : '') + (disabled ? ' disabled' : '');
        var input;
        if (multiline) {
          input = '<textarea placeholder="' + ph + '"' + (disabled ? ' disabled' : '') + '>' + val + '</textarea>';
        } else {
          input = '<input type="' + type + '" value="' + val.replace(/"/g, '&quot;') + '" placeholder="' + ph + '"' + (disabled ? ' disabled' : '') + '>';
        }
        var inner =
          (prefix ? '<span class="affix prefix">' + prefix + '</span>' : '') +
          (icon ? '<span class="lead"><img src="' + iconUrl(icon) + '" alt=""></span>' : '') +
          input +
          (suffix ? '<span class="affix suffix">' + suffix + '</span>' : '') +
          (trailing ? trailing : '');
        this.shadowRoot.innerHTML = fieldShell(this, '<div class="' + ctlClass + '">' + inner + '</div>');
        if (opts.onMount) opts.onMount.call(this);
      }
    });
  }

  textField('s-text-field', {});
  textField('s-email-field', { type: 'email' });
  textField('s-url-field', { type: 'url' });
  textField('s-search-field', { type: 'search', icon: 'search' });
  textField('s-text-area', { multiline: true });
  textField('s-money-field', { prefix: '$', suffix: 'USD' });
  textField('s-password-field', {
    type: 'password',
    trailing: '<button class="trail iconbtn" data-toggle aria-label="Show password"><img src="' + iconUrl('hide') + '" alt=""></button>',
    onMount: function () {
      var btn = this.shadowRoot.querySelector('[data-toggle]');
      var inp = this.shadowRoot.querySelector('input');
      if (btn) btn.onclick = function () { inp.type = inp.type === 'password' ? 'text' : 'password'; };
    }
  });

  /* number field with stepper */
  define('s-number-field', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'value', 'placeholder', 'helptext', 'error', 'required', 'disabled', 'min', 'max', 'step', 'suffix'],
    connected: function () {
      Object.defineProperty(this, 'value', { configurable: true, get: function () { var i = this.shadowRoot.querySelector('input'); return i ? i.value : this.getAttribute('value'); }, set: function (v) { this.setAttribute('value', v); } });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      var val = attr(this, 'value') || '';
      var disabled = has(this, 'disabled');
      var error = attr(this, 'error');
      var suffix = attr(this, 'suffix');
      var ctlClass = 'control' + (error ? ' err-state' : '') + (disabled ? ' disabled' : '');
      var spin = '<div class="spin"><button data-inc aria-label="Increase"><svg viewBox="0 0 10 10" fill="currentColor"><path d="M5 2l4 5H1z"/></svg></button><button data-dec aria-label="Decrease"><svg viewBox="0 0 10 10" fill="currentColor"><path d="M5 8l4-5H1z"/></svg></button></div>';
      var inner = '<input type="text" inputmode="decimal" value="' + val + '"' + (disabled ? ' disabled' : '') + '>' + (suffix ? '<span class="affix suffix">' + suffix + '</span>' : '') + spin;
      this.shadowRoot.innerHTML = fieldShell(this, '<div class="' + ctlClass + '">' + inner + '</div>');
      var inp = this.shadowRoot.querySelector('input');
      var step = parseFloat(attr(this, 'step') || '1');
      var bump = function (d) { var n = parseFloat(inp.value || '0'); if (isNaN(n)) n = 0; inp.value = (n + d * step); this.setAttribute('value', inp.value); this.dispatchEvent(new Event('change', { bubbles: true })); }.bind(this);
      this.shadowRoot.querySelector('[data-inc]').onclick = function () { bump(1); };
      this.shadowRoot.querySelector('[data-dec]').onclick = function () { bump(-1); };
    }
  });

  /* select (slots <option> into a real <select>) */
  define('s-select', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'helptext', 'error', 'required', 'disabled', 'value'],
    connected: function () {
      Object.defineProperty(this, 'value', { configurable: true, get: function () { var s = this.shadowRoot.querySelector('select'); return s ? s.value : null; }, set: function (v) { var s = this.shadowRoot.querySelector('select'); if (s) s.value = v; } });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      var disabled = has(this, 'disabled');
      var error = attr(this, 'error');
      var ctlClass = 'control' + (error ? ' err-state' : '') + (disabled ? ' disabled' : '');
      this.shadowRoot.innerHTML = fieldShell(this, '<div class="' + ctlClass + '"><select' + (disabled ? ' disabled' : '') + '><slot></slot></select>' + CARET + '</div>');
      /* move light-dom <option>s into the shadow <select> */
      var sel = this.shadowRoot.querySelector('select');
      var opts = this.querySelectorAll('option');
      if (opts.length) {
        sel.innerHTML = '';
        opts.forEach(function (o) { sel.appendChild(o.cloneNode(true)); });
        if (attr(this, 'value')) sel.value = attr(this, 'value');
      }
    }
  });

  /* checkbox */
  define('s-checkbox', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'checked', 'disabled', 'indeterminate', 'helptext', 'details', 'error'],
    connected: function () {
      Object.defineProperty(this, 'checked', { configurable: true, get: function () { var i = this.shadowRoot.querySelector('input'); return i ? i.checked : has(this, 'checked'); }, set: function (v) { v ? this.setAttribute('checked', '') : this.removeAttribute('checked'); } });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      this.style.display = 'block';
      var label = attr(this, 'label') || '';
      var details = attr(this, 'details') || attr(this, 'helpText') || attr(this, 'helptext');
      var checked = has(this, 'checked');
      var indet = has(this, 'indeterminate');
      var disabled = has(this, 'disabled');
      this.shadowRoot.innerHTML =
        '<label class="choice' + (disabled ? ' disabled' : '') + '">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
        '<span class="mark checkbox' + (indet ? ' indeterminate' : '') + '"></span>' +
        '<span class="choice-content"><span>' + label + '</span>' + (details ? '<span class="choice-desc">' + details + '</span>' : '') + '</span>' +
        '</label>';
      var inp = this.shadowRoot.querySelector('input');
      if (indet) inp.indeterminate = true;
      inp.addEventListener('change', function () { this.checked ? this.setAttribute('checked', '') : this.removeAttribute('checked'); }.bind(this));
    }
  });

  /* switch */
  define('s-switch', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'checked', 'disabled', 'details', 'helptext'],
    connected: function () {
      Object.defineProperty(this, 'checked', { configurable: true, get: function () { var i = this.shadowRoot.querySelector('input'); return i ? i.checked : has(this, 'checked'); }, set: function (v) { v ? this.setAttribute('checked', '') : this.removeAttribute('checked'); } });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      this.style.display = 'block';
      var label = attr(this, 'label') || '';
      var details = attr(this, 'details') || attr(this, 'helpText') || attr(this, 'helptext');
      var checked = has(this, 'checked');
      var disabled = has(this, 'disabled');
      this.shadowRoot.innerHTML =
        '<div class="sw-row">' +
        '<span class="sw-label"><span class="sw-title">' + label + '</span>' + (details ? '<span class="sw-desc">' + details + '</span>' : '') + '</span>' +
        '<label class="sw"><input type="checkbox"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '><span class="track"></span><span class="thumb"></span></label>' +
        '</div>';
      var inp = this.shadowRoot.querySelector('input');
      inp.addEventListener('change', function () { this.checked ? this.setAttribute('checked', '') : this.removeAttribute('checked'); }.bind(this));
    }
  });

  /* choice-list: group of radios or checkboxes. <s-choice> children carry label/details. */
  define('s-choice-list', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'multiple', 'name', 'helptext', 'error'],
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      this.style.display = 'block';
      var label = attr(this, 'label');
      var help = attr(this, 'helpText') || attr(this, 'helptext');
      var error = attr(this, 'error');
      this.shadowRoot.innerHTML =
        '<div class="field">' +
        (label ? '<span class="lbl">' + label + '</span>' : '') +
        '<div style="display:flex;flex-direction:column;gap:8px"><slot></slot></div>' +
        (error ? '<span class="err">' + ERRICON + error + '</span>' : (help ? '<span class="help">' + help + '</span>' : '')) +
        '</div>';
      /* propagate multiple + name to child choices */
      var multiple = has(this, 'multiple');
      var name = attr(this, 'name') || ('choice-' + Math.random().toString(36).slice(2, 7));
      this.querySelectorAll('s-choice').forEach(function (c) {
        c.setAttribute('_kind', multiple ? 'checkbox' : 'radio');
        c.setAttribute('_name', name);
      });
    }
  });

  define('s-choice', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'details', 'value', 'selected', 'checked', 'disabled', '_kind', '_name'],
    connected: function () {
      Object.defineProperty(this, 'checked', { configurable: true, get: function () { var i = this.shadowRoot.querySelector('input'); return i ? i.checked : false; }, set: function (v) { v ? this.setAttribute('selected', '') : this.removeAttribute('selected'); } });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      this.style.display = 'block';
      var kind = attr(this, '_kind') || 'radio';
      var name = attr(this, '_name') || 'choice';
      var label = attr(this, 'label') || this.textContent.trim() || '';
      var details = attr(this, 'details');
      var checked = has(this, 'selected') || has(this, 'checked');
      var disabled = has(this, 'disabled');
      this.shadowRoot.innerHTML =
        '<label class="choice' + (disabled ? ' disabled' : '') + '">' +
        '<input type="' + kind + '" name="' + name + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
        '<span class="mark ' + kind + '"></span>' +
        '<span class="choice-content"><span>' + label + '</span>' + (details ? '<span class="choice-desc">' + details + '</span>' : '') + '</span>' +
        '</label>';
    }
  });

  /* color field: swatch + hex input */
  define('s-color-field', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'value', 'helptext', 'error', 'disabled'],
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      var val = (attr(this, 'value') || '#005BD3').replace(/^#/, '');
      var inner = '<span class="swatch" style="background:#' + val + '"></span><span class="affix prefix" style="border-radius:0">#</span><input type="text" value="' + val + '">';
      this.shadowRoot.innerHTML = fieldShell(this, '<div class="control">' + inner + '</div>');
      var inp = this.shadowRoot.querySelector('input');
      var sw = this.shadowRoot.querySelector('.swatch');
      inp.addEventListener('input', function () { sw.style.background = '#' + inp.value; });
    }
  });

  /* date field: read-only text + calendar icon */
  define('s-date-field', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'value', 'helptext', 'error', 'disabled', 'placeholder'],
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      var val = attr(this, 'value') || '';
      var ph = attr(this, 'placeholder') || 'Select date';
      var inner = '<input type="text" value="' + val + '" placeholder="' + ph + '"><span class="trail"><img src="' + iconUrl('calendar') + '" alt=""></span>';
      this.shadowRoot.innerHTML = fieldShell(this, '<div class="control">' + inner + '</div>');
    }
  });

  /* drop zone */
  define('s-drop-zone', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'helptext', 'accept'],
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      var label = attr(this, 'label');
      var help = attr(this, 'helpText') || attr(this, 'helptext') || 'Accepts images up to 20 MB';
      this.shadowRoot.innerHTML =
        '<div class="field">' +
        (label ? '<span class="lbl">' + label + '</span>' : '') +
        '<div class="dz"><button class="dz-btn" type="button">Add files</button><span class="dz-hint">or drop files to upload</span><span class="dz-sub">' + help + '</span></div>' +
        '</div>';
      var dz = this.shadowRoot.querySelector('.dz');
      ['dragenter', 'dragover'].forEach(function (e) { dz.addEventListener(e, function (ev) { ev.preventDefault(); dz.classList.add('active'); }); });
      ['dragleave', 'drop'].forEach(function (e) { dz.addEventListener(e, function (ev) { ev.preventDefault(); dz.classList.remove('active'); }); });
    }
  });

})();
