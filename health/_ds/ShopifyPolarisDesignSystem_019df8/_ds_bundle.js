/* @ds-bundle: {"format":3,"namespace":"ShopifyPolarisDesignSystem_019df8","components":[],"sourceHashes":{"polaris-web-components-forms.js":"c104b460edc1","polaris-web-components.js":"77c53110ebc0","ui_kits/admin/Badge.jsx":"25ccc688ebf5","ui_kits/admin/Button.jsx":"1c0b9aab1e4b","ui_kits/admin/Card.jsx":"bed1819bc880","ui_kits/admin/IndexTable.jsx":"56b3677d3d0b","ui_kits/admin/Page.jsx":"837628f8adb9","ui_kits/admin/Screens.jsx":"776ee581c90f","ui_kits/admin/Sidebar.jsx":"eda59ba4029a","ui_kits/admin/Topbar.jsx":"fc8f1281481f","ui_kits/polaris-docs/DocsShell.jsx":"d59dc79191f6","ui_kits/polaris-docs/Pages.jsx":"54b0e55d753a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ShopifyPolarisDesignSystem_019df8 = window.ShopifyPolarisDesignSystem_019df8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// polaris-web-components-forms.js
try { (() => {
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
  var attr = H.attr,
    has = H.has;

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
    var optional = attr(self, 'requiredIndicator') === 'optional' || has(self, 'optional');
    return '<div class="field">' + (label ? '<div class="lbl-row"><span class="lbl">' + label + (required ? '<span class="req">*</span>' : '') + '</span>' + (optional ? '<span class="optional">Optional</span>' : '') + '</div>' : '') + controlHTML + (error ? '<span class="err">' + ERRICON + error + '</span>' : help ? '<span class="help">' + help + '</span>' : '') + '</div>';
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
          get: function () {
            var i = this.shadowRoot.querySelector('input,textarea,select');
            return i ? i.value : this.getAttribute('value');
          },
          set: function (v) {
            this.setAttribute('value', v);
          }
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
        var inner = (prefix ? '<span class="affix prefix">' + prefix + '</span>' : '') + (icon ? '<span class="lead"><img src="' + iconUrl(icon) + '" alt=""></span>' : '') + input + (suffix ? '<span class="affix suffix">' + suffix + '</span>' : '') + (trailing ? trailing : '');
        this.shadowRoot.innerHTML = fieldShell(this, '<div class="' + ctlClass + '">' + inner + '</div>');
        if (opts.onMount) opts.onMount.call(this);
      }
    });
  }
  textField('s-text-field', {});
  textField('s-email-field', {
    type: 'email'
  });
  textField('s-url-field', {
    type: 'url'
  });
  textField('s-search-field', {
    type: 'search',
    icon: 'search'
  });
  textField('s-text-area', {
    multiline: true
  });
  textField('s-money-field', {
    prefix: '$',
    suffix: 'USD'
  });
  textField('s-password-field', {
    type: 'password',
    trailing: '<button class="trail iconbtn" data-toggle aria-label="Show password"><img src="' + iconUrl('hide') + '" alt=""></button>',
    onMount: function () {
      var btn = this.shadowRoot.querySelector('[data-toggle]');
      var inp = this.shadowRoot.querySelector('input');
      if (btn) btn.onclick = function () {
        inp.type = inp.type === 'password' ? 'text' : 'password';
      };
    }
  });

  /* number field with stepper */
  define('s-number-field', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'value', 'placeholder', 'helptext', 'error', 'required', 'disabled', 'min', 'max', 'step', 'suffix'],
    connected: function () {
      Object.defineProperty(this, 'value', {
        configurable: true,
        get: function () {
          var i = this.shadowRoot.querySelector('input');
          return i ? i.value : this.getAttribute('value');
        },
        set: function (v) {
          this.setAttribute('value', v);
        }
      });
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
      var bump = function (d) {
        var n = parseFloat(inp.value || '0');
        if (isNaN(n)) n = 0;
        inp.value = n + d * step;
        this.setAttribute('value', inp.value);
        this.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      }.bind(this);
      this.shadowRoot.querySelector('[data-inc]').onclick = function () {
        bump(1);
      };
      this.shadowRoot.querySelector('[data-dec]').onclick = function () {
        bump(-1);
      };
    }
  });

  /* select (slots <option> into a real <select>) */
  define('s-select', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'helptext', 'error', 'required', 'disabled', 'value'],
    connected: function () {
      Object.defineProperty(this, 'value', {
        configurable: true,
        get: function () {
          var s = this.shadowRoot.querySelector('select');
          return s ? s.value : null;
        },
        set: function (v) {
          var s = this.shadowRoot.querySelector('select');
          if (s) s.value = v;
        }
      });
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
        opts.forEach(function (o) {
          sel.appendChild(o.cloneNode(true));
        });
        if (attr(this, 'value')) sel.value = attr(this, 'value');
      }
    }
  });

  /* checkbox */
  define('s-checkbox', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'checked', 'disabled', 'indeterminate', 'helptext', 'details', 'error'],
    connected: function () {
      Object.defineProperty(this, 'checked', {
        configurable: true,
        get: function () {
          var i = this.shadowRoot.querySelector('input');
          return i ? i.checked : has(this, 'checked');
        },
        set: function (v) {
          v ? this.setAttribute('checked', '') : this.removeAttribute('checked');
        }
      });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      this.style.display = 'block';
      var label = attr(this, 'label') || '';
      var details = attr(this, 'details') || attr(this, 'helpText') || attr(this, 'helptext');
      var checked = has(this, 'checked');
      var indet = has(this, 'indeterminate');
      var disabled = has(this, 'disabled');
      this.shadowRoot.innerHTML = '<label class="choice' + (disabled ? ' disabled' : '') + '">' + '<input type="checkbox"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' + '<span class="mark checkbox' + (indet ? ' indeterminate' : '') + '"></span>' + '<span class="choice-content"><span>' + label + '</span>' + (details ? '<span class="choice-desc">' + details + '</span>' : '') + '</span>' + '</label>';
      var inp = this.shadowRoot.querySelector('input');
      if (indet) inp.indeterminate = true;
      inp.addEventListener('change', function () {
        this.checked ? this.setAttribute('checked', '') : this.removeAttribute('checked');
      }.bind(this));
    }
  });

  /* switch */
  define('s-switch', {
    extraSheets: sheets.slice(1),
    attrs: ['label', 'checked', 'disabled', 'details', 'helptext'],
    connected: function () {
      Object.defineProperty(this, 'checked', {
        configurable: true,
        get: function () {
          var i = this.shadowRoot.querySelector('input');
          return i ? i.checked : has(this, 'checked');
        },
        set: function (v) {
          v ? this.setAttribute('checked', '') : this.removeAttribute('checked');
        }
      });
    },
    render: function () {
      this.shadowRoot.adoptedStyleSheets = sheets;
      this.style.display = 'block';
      var label = attr(this, 'label') || '';
      var details = attr(this, 'details') || attr(this, 'helpText') || attr(this, 'helptext');
      var checked = has(this, 'checked');
      var disabled = has(this, 'disabled');
      this.shadowRoot.innerHTML = '<div class="sw-row">' + '<span class="sw-label"><span class="sw-title">' + label + '</span>' + (details ? '<span class="sw-desc">' + details + '</span>' : '') + '</span>' + '<label class="sw"><input type="checkbox"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '><span class="track"></span><span class="thumb"></span></label>' + '</div>';
      var inp = this.shadowRoot.querySelector('input');
      inp.addEventListener('change', function () {
        this.checked ? this.setAttribute('checked', '') : this.removeAttribute('checked');
      }.bind(this));
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
      this.shadowRoot.innerHTML = '<div class="field">' + (label ? '<span class="lbl">' + label + '</span>' : '') + '<div style="display:flex;flex-direction:column;gap:8px"><slot></slot></div>' + (error ? '<span class="err">' + ERRICON + error + '</span>' : help ? '<span class="help">' + help + '</span>' : '') + '</div>';
      /* propagate multiple + name to child choices */
      var multiple = has(this, 'multiple');
      var name = attr(this, 'name') || 'choice-' + Math.random().toString(36).slice(2, 7);
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
      Object.defineProperty(this, 'checked', {
        configurable: true,
        get: function () {
          var i = this.shadowRoot.querySelector('input');
          return i ? i.checked : false;
        },
        set: function (v) {
          v ? this.setAttribute('selected', '') : this.removeAttribute('selected');
        }
      });
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
      this.shadowRoot.innerHTML = '<label class="choice' + (disabled ? ' disabled' : '') + '">' + '<input type="' + kind + '" name="' + name + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' + '<span class="mark ' + kind + '"></span>' + '<span class="choice-content"><span>' + label + '</span>' + (details ? '<span class="choice-desc">' + details + '</span>' : '') + '</span>' + '</label>';
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
      inp.addEventListener('input', function () {
        sw.style.background = '#' + inp.value;
      });
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
      this.shadowRoot.innerHTML = '<div class="field">' + (label ? '<span class="lbl">' + label + '</span>' : '') + '<div class="dz"><button class="dz-btn" type="button">Add files</button><span class="dz-hint">or drop files to upload</span><span class="dz-sub">' + help + '</span></div>' + '</div>';
      var dz = this.shadowRoot.querySelector('.dz');
      ['dragenter', 'dragover'].forEach(function (e) {
        dz.addEventListener(e, function (ev) {
          ev.preventDefault();
          dz.classList.add('active');
        });
      });
      ['dragleave', 'drop'].forEach(function (e) {
        dz.addEventListener(e, function (ev) {
          ev.preventDefault();
          dz.classList.remove('active');
        });
      });
    }
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "polaris-web-components-forms.js", error: String((e && e.message) || e) }); }

// polaris-web-components.js
try { (() => {
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
  var ICON_BASE = window.PolarisWC && window.PolarisWC.iconBase || BASE + 'assets/icons/';
  window.PolarisWC = window.PolarisWC || {};
  window.PolarisWC.iconBase = ICON_BASE;

  /* ---- spacing scale: t-shirt keywords → px (matches Polaris gap/padding) ---- */
  var SPACE = {
    'none': '0',
    '0': '0',
    'small-500': '2px',
    'small-400': '4px',
    'small-300': '6px',
    'small-200': '8px',
    'small-100': '12px',
    'extratight': '4px',
    'extra-tight': '4px',
    'extrasmall': '4px',
    'extra-small': '4px',
    'tight': '8px',
    'small': '8px',
    'base': '12px',
    'medium': '16px',
    'loose': '20px',
    'large': '20px',
    'large-100': '24px',
    'extraloose': '24px',
    'extra-loose': '24px',
    'extralarge': '24px',
    'extra-large': '24px',
    'large-200': '32px',
    'large-300': '40px',
    'large-400': '48px',
    'large-500': '64px'
  };
  function space(v) {
    if (v == null || v === '') return null;
    var k = String(v).toLowerCase();
    return SPACE.hasOwnProperty(k) ? SPACE[k] : v; /* allow raw px values too */
  }
  var RADIUS = {
    none: '0',
    small: '4px',
    base: '8px',
    large: '12px',
    larger: '16px',
    'large-100': '16px',
    full: '9999px'
  };
  function radius(v) {
    if (v == null) return null;
    var k = String(v).toLowerCase();
    return RADIUS[k] || v;
  }

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
  function attr(el, name) {
    return el.getAttribute(name);
  }
  function has(el, name) {
    return el.hasAttribute(name);
  }
  function setStyle(el, prop, val) {
    if (val != null) el.style.setProperty(prop, val);else el.style.removeProperty(prop);
  }

  /* base class: shadow root + shared sheet + a render() that runs on connect & attr change */
  function define(tag, spec) {
    if (customElements.get(tag)) return;
    var C = class extends HTMLElement {
      static get observedAttributes() {
        return spec.attrs || [];
      }
      constructor() {
        super();
        this.attachShadow({
          mode: 'open'
        });
        this.shadowRoot.adoptedStyleSheets = [sheet].concat(spec.extraSheets || []);
        this._wrap = document.createElement('span'); /* not used by all */
      }
      connectedCallback() {
        if (spec.flag) this.setAttribute(spec.flag, '');
        this._render();
        if (spec.connected) spec.connected.call(this);
      }
      attributeChangedCallback() {
        if (this.isConnected) this._render();
      }
      _render() {
        spec.render.call(this);
      }
    };
    customElements.define(tag, C);
    return C;
  }
  window.PolarisWC.define = define;
  window.PolarisWC.helpers = {
    svgIcon: svgIcon,
    space: space,
    radius: radius,
    attr: attr,
    has: has,
    setStyle: setStyle
  };

  /* ============================ LAYOUT ============================ */

  /* s-stack: flex container. direction block(default)=column, inline=row */
  define('s-stack', {
    attrs: ['direction', 'gap', 'alignitems', 'justifycontent', 'wrap', 'inlinesize'],
    render: function () {
      this.style.display = 'flex';
      var dir = (attr(this, 'direction') || 'block').toLowerCase();
      this.style.flexDirection = dir === 'inline' ? 'row' : 'column';
      this.style.flexWrap = attr(this, 'wrap') === 'false' ? 'nowrap' : dir === 'inline' ? 'wrap' : 'nowrap';
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
      var p = function (n) {
        return space(attr(this, n));
      }.bind(this);
      setStyle(this, 'padding', p('padding'));
      setStyle(this, 'padding-block', p('paddingBlock') != null ? p('paddingBlock') : space(attr(this, 'paddingblock')));
      setStyle(this, 'padding-inline', space(attr(this, 'paddingInline') || attr(this, 'paddinginline')));
      setStyle(this, 'padding-top', space(attr(this, 'paddingBlockStart') || attr(this, 'paddingblockstart')));
      setStyle(this, 'padding-bottom', space(attr(this, 'paddingBlockEnd') || attr(this, 'paddingblockend')));
      setStyle(this, 'padding-left', space(attr(this, 'paddingInlineStart') || attr(this, 'paddinginlinestart')));
      setStyle(this, 'padding-right', space(attr(this, 'paddingInlineEnd') || attr(this, 'paddinginlineend')));
      var bg = attr(this, 'background');
      if (bg) setStyle(this, 'background', bg === 'subdued' ? 'var(--p-color-bg-surface-secondary)' : bg === 'surface' ? 'var(--p-color-bg-surface)' : bg);
      var bw = attr(this, 'borderWidth') || attr(this, 'borderwidth') || (has(this, 'border') ? 'base' : null);
      if (bw) {
        this.style.borderStyle = 'solid';
        this.style.borderWidth = bw === 'base' ? '1px' : bw === 'thick' ? '2px' : bw;
        this.style.borderColor = attr(this, 'borderColor') || 'var(--p-color-border)';
      }
      var be = attr(this, 'borderBlockEnd') || attr(this, 'borderblockend');
      if (be) {
        this.style.borderBottom = '1px solid var(--p-color-border)';
      }
      var bbs = attr(this, 'borderBlockStart') || attr(this, 'borderblockstart');
      if (bbs) {
        this.style.borderTop = '1px solid var(--p-color-border)';
      }
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
    render: function () {
      this.shadowRoot.innerHTML = '<hr class="divider">';
      this.style.display = 'block';
    }
  });

  /* s-section: card container with optional heading */
  define('s-section', {
    attrs: ['heading'],
    render: function () {
      var h = attr(this, 'heading');
      var actions = '';
      this.shadowRoot.innerHTML = '<div class="section">' + (h ? '<div class="section-head"><h2 class="section-title">' + h + '</h2><slot name="actions"></slot></div>' : '') + '<slot></slot></div>';
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
      this.shadowRoot.innerHTML = '<div class="page' + (full ? ' full' : '') + '">' + '<div class="page-head">' + '<div><h1 class="page-title">' + h + '</h1>' + (sub ? '<div class="page-sub">' + sub + '</div>' : '') + '</div>' + '<div class="page-actions"><slot name="primary-action"></slot><slot name="secondary-actions"></slot></div>' + '</div>' + '<slot></slot>' + '</div>';
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
      var cls = 'btn ' + variant + (tone ? ' ' + tone : '') + (size === 'large' ? ' lg' : size === 'slim' ? ' sl' : '') + (has(this, 'fullWidth') || has(this, 'fullwidth') ? ' fw' : '');
      var inner = (loading ? '<span class="spin"></span>' : icon ? svgIcon(icon, 'ic') : '') + '<slot></slot>';
      var tagName = href ? 'a' : 'button';
      var extra = href ? ' href="' + href + '"' + (attr(this, 'target') ? ' target="' + attr(this, 'target') + '"' : '') : ' type="button"';
      if (disabled) extra += ' aria-disabled="true"';
      if (label) extra += ' aria-label="' + label + '"';
      this.shadowRoot.innerHTML = '<' + tagName + ' class="' + cls + '"' + extra + '>' + inner + '</' + tagName + '>';
      this.style.display = has(this, 'fullWidth') || has(this, 'fullwidth') ? 'block' : 'inline-block';
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
      this.style.display = 'inline-block';
      this.style.cursor = 'pointer';
      this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });
  define('s-button-group', {
    render: function () {
      this.style.display = 'flex';
      this.style.gap = '8px';
      this.style.flexWrap = 'wrap';
      this.style.alignItems = 'center';
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
  define('s-clickable-chip', {
    attrs: ['removable'],
    render: function () {
      var x = '<button class="x" aria-label="Remove"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l6 6m0-6l-6 6"/></svg></button>';
      this.style.display = 'inline-flex';
      this.style.cursor = 'pointer';
      this.shadowRoot.innerHTML = '<span class="chip"><slot></slot>' + (has(this, 'removable') ? x : '') + '</span>';
    }
  });

  /* ============================ FEEDBACK ============================ */

  var STATUS_ICON = {
    info: 'InfoIcon',
    success: 'CheckCircleIcon',
    warning: 'AlertTriangleIcon',
    critical: 'AlertCircleIcon',
    caution: 'AlertTriangleIcon'
  };
  define('s-badge', {
    attrs: ['tone', 'progress'],
    render: function () {
      var tone = (attr(this, 'tone') || 'default').toLowerCase();
      var prog = attr(this, 'progress');
      var dotColor = {
        success: 'var(--p-color-icon-success)',
        info: 'var(--p-color-icon-info)',
        attention: 'var(--p-color-icon-caution)',
        caution: 'var(--p-color-icon-caution)',
        warning: 'var(--p-color-icon-warning)',
        critical: 'var(--p-color-icon-critical)',
        default: 'var(--p-color-icon-secondary)'
      }[tone] || 'var(--p-color-icon-secondary)';
      var dot = '';
      if (prog === 'complete') dot = '<span class="dot" style="background:' + dotColor + '"></span>';else if (prog === 'partiallyComplete' || prog === 'partiallycomplete') dot = '<span class="dot" style="background:linear-gradient(to top,' + dotColor + ' 50%,transparent 50%);border:1.25px solid ' + dotColor + '"></span>';else if (prog === 'incomplete') dot = '<span class="dot" style="border:1.25px solid ' + dotColor + '"></span>';
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
        this.shadowRoot.innerHTML = '<div class="banner ' + tone + '">' + '<div class="bstrip"><span class="bicon"><img src="' + iconUrl(ic) + '" width="18" height="18" alt=""></span>' + '<span class="btitle">' + heading + '</span>' + dismiss + '</div>' + '<div class="bbody"><slot></slot></div>' + '</div>';
      } else {
        /* headerless banner: tinted surface row (withinContentContainer) */
        this.shadowRoot.innerHTML = '<div class="banner flat ' + tone + '">' + '<span class="bicon"><img src="' + iconUrl(ic) + '" width="18" height="18" alt=""></span>' + '<div class="bbody"><slot></slot></div>' + dismiss + '</div>';
      }
      var d = this.shadowRoot.querySelector('.bdismiss');
      if (d) d.onclick = function () {
        this.remove();
      }.bind(this);
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
      var toneColor = {
        subdued: 'var(--p-color-icon-secondary)',
        critical: 'var(--p-color-icon-critical)',
        success: 'var(--p-color-icon-success)',
        info: 'var(--p-color-icon-info)'
      }[attr(this, 'tone')] || 'var(--p-color-icon)';
      this.style.display = 'inline-flex';
      this.style.color = toneColor;
      this.shadowRoot.innerHTML = '<span class="icon"><img src="' + iconUrl(name) + '" width="' + sz + '" height="' + sz + '" alt="" style="filter:none"></span>';
    }
  });
  define('s-thumbnail', {
    attrs: ['src', 'alt', 'size'],
    render: function () {
      var sz = {
        small: 40,
        base: 56,
        large: 80
      }[attr(this, 'size')] || 56;
      var src = attr(this, 'src');
      this.style.display = 'inline-block';
      this.shadowRoot.innerHTML = src ? '<img class="thumb" src="' + src + '" alt="' + (attr(this, 'alt') || '') + '" style="width:' + sz + 'px;height:' + sz + 'px">' : '<span class="thumb" style="width:' + sz + 'px;height:' + sz + 'px;display:inline-flex;align-items:center;justify-content:center"><img src="' + iconUrl('image') + '" width="20" height="20" alt="" style="opacity:.4"></span>';
    }
  });
  define('s-avatar', {
    attrs: ['src', 'initials', 'size', 'name'],
    render: function () {
      var sz = {
        small: 24,
        base: 32,
        large: 40,
        xl: 56
      }[attr(this, 'size')] || 32;
      var src = attr(this, 'src');
      var initials = attr(this, 'initials') || (attr(this, 'name') ? attr(this, 'name').split(/\s+/).map(function (s) {
        return s[0];
      }).slice(0, 2).join('') : '');
      var palette = ['#C530C5', '#52F490', '#2CE0D4', '#51C0FF', '#FD4B92', '#25E82B', '#9474FF'];
      var fg = ['#FDEFFD', '#014B40', '#033C39', '#002133', '#FFF6F8', '#033D05', '#F8F7FF'];
      var idx = (initials.charCodeAt(0) || 0) % palette.length;
      this.style.display = 'inline-flex';
      this.shadowRoot.innerHTML = src ? '<span class="avatar" style="width:' + sz + 'px;height:' + sz + 'px"><img src="' + src + '" alt=""></span>' : '<span class="avatar" style="width:' + sz + 'px;height:' + sz + 'px;background:' + palette[idx] + ';color:' + fg[idx] + ';font-size:' + sz * 0.4 + 'px">' + initials + '</span>';
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
  define('s-unordered-list', {
    render: function () {
      this.style.display = 'block';
      this.shadowRoot.innerHTML = '<ul class="list"><slot></slot></ul>';
    }
  });
  define('s-ordered-list', {
    render: function () {
      this.style.display = 'block';
      this.shadowRoot.innerHTML = '<ol class="list"><slot></slot></ol>';
    }
  });
  define('s-list-item', {
    render: function () {
      this.style.display = 'list-item';
      this.shadowRoot.innerHTML = '<slot></slot>';
    }
  });

  /* ============================ MODAL ============================ */
  define('s-modal', {
    attrs: ['heading', 'open'],
    connected: function () {
      this.hideOverlay = function () {
        this.removeAttribute('open');
      };
      this.showOverlay = function () {
        this.setAttribute('open', '');
      };
    },
    render: function () {
      var open = has(this, 'open');
      if (!open) {
        this.shadowRoot.innerHTML = '';
        this.style.display = 'none';
        return;
      }
      this.style.display = 'block';
      var heading = attr(this, 'heading') || '';
      this.shadowRoot.innerHTML = '<div class="scrim"><div class="modal">' + '<div class="modal-head"><span class="modal-title">' + heading + '</span><button class="modal-x" aria-label="Close"><img src="' + iconUrl('x') + '" width="18" height="18" alt=""></button></div>' + '<div class="modal-body"><slot></slot></div>' + '<div class="modal-foot"><slot name="footer"></slot></div>' + '</div></div>';
      var close = function () {
        this.hideOverlay();
      }.bind(this);
      this.shadowRoot.querySelector('.modal-x').onclick = close;
      this.shadowRoot.querySelector('.scrim').addEventListener('click', function (e) {
        if (e.target.classList.contains('scrim')) close();
      });
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
          if (cmd.indexOf('hide') >= 0) target.hideOverlay && target.hideOverlay();else if (cmd.indexOf('toggle') >= 0) {
            has(target, 'open') ? target.hideOverlay() : target.showOverlay();
          } else target.showOverlay && target.showOverlay();
        }
        break;
      }
    }
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "polaris-web-components.js", error: String((e && e.message) || e) }); }

// ui_kits/admin/Badge.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Badge (status pill)
// Tone: default | info | success | attention | warning | critical | new | magic
// Optional `progress`: 'incomplete' | 'partiallyComplete' | 'complete' renders a dot.

const BADGE_TONES = {
  default: {
    bg: 'rgba(0,0,0,0.06)',
    fg: '#616161',
    dot: '#616161'
  },
  info: {
    bg: '#D5EBFF',
    fg: '#003A5A',
    dot: '#0094D5'
  },
  success: {
    bg: '#AFFEBF',
    fg: '#014B40',
    dot: '#047B5D'
  },
  attention: {
    bg: '#FFEB78',
    fg: '#4F4700',
    dot: '#998A00'
  },
  warning: {
    bg: '#FFD6A4',
    fg: '#5E4200',
    dot: '#B28400'
  },
  critical: {
    bg: '#FED1D7',
    fg: '#8E0B21',
    dot: '#E22C38'
  },
  new: {
    bg: 'rgba(0,0,0,0.06)',
    fg: '#616161',
    dot: '#616161',
    bold: true
  },
  magic: {
    bg: '#E9E5FF',
    fg: '#5700D1',
    dot: '#8051FF'
  }
};
const Badge = ({
  children,
  tone = 'default',
  progress,
  size = 'medium'
}) => {
  const t = BADGE_TONES[tone] || BADGE_TONES.default;
  const dot = progress ? progress === 'complete' ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 3,
      background: t.dot
    }
  }) : progress === 'partiallyComplete' ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 3,
      background: `linear-gradient(to top, ${t.dot} 50%, transparent 50%)`,
      border: `1.25px solid ${t.dot}`,
      boxSizing: 'border-box'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 3,
      border: `1.25px solid ${t.dot}`,
      boxSizing: 'border-box'
    }
  }) : null;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: size === 'large' ? '4px 8px' : '2px 8px',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: t.bold ? 700 : 550,
      lineHeight: '16px',
      background: t.bg,
      color: t.fg
    }
  }, dot, children);
};
window.Badge = Badge;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Badge.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Button.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Button
// Polaris primary buttons have a signature look: graphite-black fill + a subtle
// inner-bottom-shadow that creates a "pressable" bevel. Critical = red, default
// = white card, tertiary = transparent. Sizes: micro / slim / medium (default) / large.

const Button = ({
  children,
  onClick,
  variant = 'default',
  size = 'medium',
  disabled,
  icon,
  iconRight,
  fullWidth,
  type = 'button'
}) => {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    fontFamily: 'inherit',
    fontWeight: 550,
    lineHeight: '16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    transition: 'background 100ms var(--p-motion-ease, cubic-bezier(.25,.1,.25,1))',
    border: 'none',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    width: fullWidth ? '100%' : undefined
  };
  const sizes = {
    micro: {
      minHeight: 24,
      padding: '4px 8px',
      fontSize: 12
    },
    slim: {
      minHeight: 28,
      padding: '6px 12px',
      fontSize: 12
    },
    medium: {
      minHeight: 28,
      padding: '6px 12px',
      fontSize: 12
    },
    large: {
      minHeight: 32,
      padding: '6px 12px',
      fontSize: 12
    }
  };
  const variants = {
    default: {
      background: 'var(--p-color-bg-fill, #fff)',
      color: 'var(--p-color-text, #303030)',
      boxShadow: 'var(--p-shadow-button, 0 -1px 0 0 #b5b5b5 inset, 0 0 0 1px rgba(0,0,0,0.1) inset, 0 0.5px 0 1.5px #FFF inset)'
    },
    primary: {
      background: 'var(--p-color-button-gradient-bg-fill, linear-gradient(180deg, rgba(48,48,48,0) 63.53%, rgba(255,255,255,0.15) 100%)), var(--p-color-bg-fill-brand, #303030)',
      color: 'var(--p-color-text-brand-on-bg-fill, #fff)',
      boxShadow: 'var(--p-shadow-button-primary, 0 -1px 0 1px rgba(0,0,0,0.8) inset, 0 0 0 1px rgba(48,48,48,1) inset, 0 0.5px 0 1.5px rgba(255,255,255,0.25) inset)'
    },
    critical: {
      background: 'var(--p-color-bg-fill-critical, #C70A24)',
      color: 'var(--p-color-text-critical-on-bg-fill, #FFFAFB)',
      boxShadow: 'var(--p-shadow-button-primary-critical, 0 -1px 0 1px rgba(142,31,11,0.8) inset, 0 0 0 1px rgba(181,38,11,0.8) inset, 0 0.5px 0 1.5px rgba(255,255,255,0.349) inset)'
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--p-color-text, #303030)'
    },
    plain: {
      background: 'transparent',
      color: 'var(--p-color-text-link, #005BD3)',
      padding: 0,
      minHeight: 0
    }
  };
  const disabledStyle = disabled ? {
    background: 'rgba(0,0,0,0.05)',
    color: '#B5B5B5',
    boxShadow: 'none'
  } : null;
  const style = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...disabledStyle
  };
  if (variant === 'plain') style.fontWeight = 550;
  const [hover, setHover] = React.useState(false);
  if (hover && !disabled) {
    if (variant === 'primary') style.background = 'var(--p-color-button-gradient-bg-fill), var(--p-color-bg-fill-brand-hover, #1A1A1A)';else if (variant === 'critical') style.background = 'var(--p-color-bg-fill-critical-hover, #A30A24)';else if (variant === 'default') style.background = 'var(--p-color-bg-fill-hover, #FAFAFA)';else if (variant === 'tertiary') style.background = 'var(--p-color-bg-fill-transparent-hover, rgba(0,0,0,0.05))';else if (variant === 'plain') style.color = 'var(--p-color-text-link-hover, #004299)';
  }
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    style: style,
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, icon), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, iconRight));
};
window.Button = Button;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Button.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Card.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Card
// White surface, 12px radius, shadow-100 + inset bevel ring (Polaris v13 cards
// have NO 1px border — the ShadowBevel inset shadow draws the edge).

const Card = ({
  title,
  actions,
  children,
  padding = 16,
  sectioned = true,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'var(--p-color-bg-surface, #fff)',
    borderRadius: 12,
    boxShadow: 'var(--p-shadow-100, 0 1px 0 rgba(26,26,26,0.07)), var(--p-shadow-bevel-100, 1px 0 0 0 rgba(0,0,0,0.13) inset, -1px 0 0 0 rgba(0,0,0,0.13) inset, 0 -1px 0 0 rgba(0,0,0,0.17) inset, 0 1px 0 0 rgba(204,204,204,0.5) inset)',
    overflow: 'hidden',
    ...style
  }
}, (title || actions) && /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${padding}px ${padding}px ${sectioned ? 0 : padding}px`
  }
}, typeof title === 'string' ? /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 13,
    lineHeight: '20px',
    fontWeight: 650,
    margin: 0,
    color: '#303030'
  }
}, title) : title, actions && /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, actions)), sectioned ? /*#__PURE__*/React.createElement("div", {
  style: {
    padding
  }
}, children) : children);
const CardSection = ({
  title,
  children,
  padding = 16,
  divided = true
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    padding,
    borderTop: divided ? '1px solid #EBEBEB' : 'none'
  }
}, title && /*#__PURE__*/React.createElement("h3", {
  style: {
    fontSize: 13,
    lineHeight: '20px',
    fontWeight: 650,
    margin: '0 0 8px',
    color: '#303030'
  }
}, title), children);
window.Card = Card;
window.CardSection = CardSection;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Card.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/IndexTable.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — IndexTable + OrderRow
// Tabs at top + filter bar + dense table with checkbox column.
// Used for Orders / Products / Customers — same shell, different cells.

const FAKE_ORDERS = [{
  id: '#1042',
  date: 'Today at 2:31 pm',
  customer: 'Lena Wexler',
  total: 124.50,
  payment: 'paid',
  fulfillment: 'unfulfilled',
  items: 3,
  channel: 'Online Store'
}, {
  id: '#1041',
  date: 'Today at 1:18 pm',
  customer: 'Marcus Tan',
  total: 68.00,
  payment: 'paid',
  fulfillment: 'fulfilled',
  items: 1,
  channel: 'Online Store'
}, {
  id: '#1040',
  date: 'Today at 12:04 pm',
  customer: 'Priya Mehta',
  total: 432.10,
  payment: 'pending',
  fulfillment: 'unfulfilled',
  items: 8,
  channel: 'POS'
}, {
  id: '#1039',
  date: 'Yesterday',
  customer: 'Anya Petrov',
  total: 19.99,
  payment: 'refunded',
  fulfillment: 'fulfilled',
  items: 1,
  channel: 'Online Store'
}, {
  id: '#1038',
  date: 'Yesterday',
  customer: 'Daniel O\u2019Brien',
  total: 219.00,
  payment: 'paid',
  fulfillment: 'fulfilled',
  items: 2,
  channel: 'Online Store'
}, {
  id: '#1037',
  date: 'Mar 12',
  customer: 'Yuki Tanaka',
  total: 44.00,
  payment: 'paid',
  fulfillment: 'partial',
  items: 4,
  channel: 'Online Store'
}, {
  id: '#1036',
  date: 'Mar 12',
  customer: 'Hugo Bernal',
  total: 156.50,
  payment: 'paid',
  fulfillment: 'fulfilled',
  items: 2,
  channel: 'Online Store'
}];
const PAYMENT_TONE = {
  paid: 'success',
  pending: 'attention',
  refunded: 'default'
};
const FULFILLMENT_TONE = {
  fulfilled: 'success',
  unfulfilled: 'attention',
  partial: 'warning'
};
const FULFILLMENT_PROGRESS = {
  fulfilled: 'complete',
  unfulfilled: 'incomplete',
  partial: 'partiallyComplete'
};
const fmt = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const TabBar = ({
  tabs,
  current,
  onChange
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 2,
    padding: '8px 8px 0',
    borderBottom: '1px solid #EBEBEB'
  }
}, tabs.map(t => {
  const sel = t.id === current;
  return /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => onChange(t.id),
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: 8,
      fontSize: 12,
      lineHeight: '16px',
      fontWeight: 550,
      color: sel ? '#303030' : '#616161',
      background: sel ? 'rgba(0,0,0,0.08)' : 'transparent'
    }
  }, t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 6,
      fontSize: 11,
      color: '#616161',
      fontWeight: 450
    }
  }, t.count));
}));
const FilterBar = ({
  count,
  selected,
  onClearSelection
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #E3E3E3',
    background: '#fff'
  }
}, selected > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 500
  }
}, selected, " selected"), /*#__PURE__*/React.createElement(Button, {
  size: "slim"
}, "Mark as fulfilled"), /*#__PURE__*/React.createElement(Button, {
  size: "slim"
}, "Capture payment"), /*#__PURE__*/React.createElement(Button, {
  size: "slim"
}, "Print packing slips"), /*#__PURE__*/React.createElement(Button, {
  size: "slim",
  variant: "tertiary",
  onClick: onClearSelection
}, "Clear")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    flex: 1,
    maxWidth: 300
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/icons/SearchIcon.svg",
  width: 14,
  height: 14,
  alt: "",
  style: {
    position: 'absolute',
    left: 10,
    top: 9,
    opacity: 0.6
  }
}), /*#__PURE__*/React.createElement("input", {
  placeholder: "Searching all orders",
  style: {
    width: '100%',
    boxSizing: 'border-box',
    height: 28,
    padding: '0 12px 0 30px',
    borderRadius: 8,
    border: '0.66px solid #8A8A8A',
    background: '#FDFDFD',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none'
  }
})), /*#__PURE__*/React.createElement(Button, {
  size: "slim",
  icon: /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icons/FilterIcon.svg",
    width: 14,
    height: 14,
    alt: ""
  })
}, "Add filter"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 12,
    color: '#616161'
  }
}, count, " orders"), /*#__PURE__*/React.createElement(Button, {
  size: "slim",
  variant: "tertiary",
  icon: /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icons/ExportIcon.svg",
    width: 14,
    height: 14,
    alt: ""
  })
}, "Export")));
const OrderRow = ({
  order,
  selected,
  onSelect,
  onClick
}) => /*#__PURE__*/React.createElement("tr", {
  onClick: onClick,
  style: {
    cursor: 'pointer',
    background: selected ? '#F1F1F1' : '#fff'
  },
  onMouseEnter: e => {
    e.currentTarget.style.background = selected ? '#EBEBEB' : '#F7F7F7';
  },
  onMouseLeave: e => {
    e.currentTarget.style.background = selected ? '#F1F1F1' : '#fff';
  }
}, /*#__PURE__*/React.createElement("td", {
  style: cellCheckbox,
  onClick: e => {
    e.stopPropagation();
    onSelect();
  }
}, /*#__PURE__*/React.createElement(Checkbox, {
  checked: selected,
  onChange: onSelect
})), /*#__PURE__*/React.createElement("td", {
  style: cell
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 650
  }
}, order.id)), /*#__PURE__*/React.createElement("td", {
  style: {
    ...cell,
    color: '#616161'
  }
}, order.date), /*#__PURE__*/React.createElement("td", {
  style: cell
}, order.customer), /*#__PURE__*/React.createElement("td", {
  style: {
    ...cell,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right'
  }
}, fmt(order.total)), /*#__PURE__*/React.createElement("td", {
  style: cell
}, /*#__PURE__*/React.createElement(Badge, {
  tone: PAYMENT_TONE[order.payment],
  progress: order.payment === 'paid' ? 'complete' : 'incomplete'
}, order.payment[0].toUpperCase() + order.payment.slice(1))), /*#__PURE__*/React.createElement("td", {
  style: cell
}, /*#__PURE__*/React.createElement(Badge, {
  tone: FULFILLMENT_TONE[order.fulfillment],
  progress: FULFILLMENT_PROGRESS[order.fulfillment]
}, order.fulfillment[0].toUpperCase() + order.fulfillment.slice(1))), /*#__PURE__*/React.createElement("td", {
  style: {
    ...cell,
    color: '#616161'
  }
}, order.items, " items"), /*#__PURE__*/React.createElement("td", {
  style: {
    ...cell,
    color: '#616161'
  }
}, order.channel));
const Checkbox = ({
  checked,
  onChange
}) => /*#__PURE__*/React.createElement("span", {
  onClick: e => {
    e.stopPropagation();
    onChange?.();
  },
  style: {
    display: 'inline-flex',
    width: 18,
    height: 18,
    boxSizing: 'border-box',
    borderRadius: 4,
    border: '1px solid #8A8A8A',
    background: checked ? '#303030' : '#FDFDFD',
    borderColor: checked ? '#303030' : '#8A8A8A',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }
}, checked && /*#__PURE__*/React.createElement("svg", {
  width: "10",
  height: "10",
  viewBox: "0 0 10 10",
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M2 5l2 2 4-4",
  stroke: "#fff",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round"
})));
const cell = {
  padding: '6px',
  fontSize: 13,
  lineHeight: '20px',
  borderBottom: '1px solid #EBEBEB',
  verticalAlign: 'middle'
};
const cellCheckbox = {
  ...cell,
  width: 36,
  paddingLeft: 12,
  paddingRight: 8
};
const headCell = {
  ...cell,
  padding: '8px 6px',
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 550,
  color: '#616161',
  textAlign: 'left',
  background: '#F7F7F7'
};
const IndexTable = ({
  orders,
  onOpenOrder
}) => {
  const [selected, setSelected] = React.useState(new Set());
  const toggle = id => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const allChecked = selected.size === orders.length && orders.length > 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: 'var(--p-shadow-100, 0 1px 0 rgba(26,26,26,0.07)), var(--p-shadow-bevel-100, 1px 0 0 0 rgba(0,0,0,0.13) inset, -1px 0 0 0 rgba(0,0,0,0.13) inset, 0 -1px 0 0 rgba(0,0,0,0.17) inset, 0 1px 0 0 rgba(204,204,204,0.5) inset)'
    }
  }, /*#__PURE__*/React.createElement(FilterBar, {
    count: orders.length,
    selected: selected.size,
    onClearSelection: () => setSelected(new Set())
  }), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'Inter, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      ...headCell,
      width: 36,
      paddingLeft: 12,
      paddingRight: 8
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: allChecked,
    onChange: () => setSelected(allChecked ? new Set() : new Set(orders.map(o => o.id)))
  })), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Order"), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Date"), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Customer"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...headCell,
      textAlign: 'right'
    }
  }, "Total"), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Payment"), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Fulfillment"), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Items"), /*#__PURE__*/React.createElement("th", {
    style: headCell
  }, "Channel"))), /*#__PURE__*/React.createElement("tbody", null, orders.map(o => /*#__PURE__*/React.createElement(OrderRow, {
    key: o.id,
    order: o,
    selected: selected.has(o.id),
    onSelect: () => toggle(o.id),
    onClick: () => onOpenOrder?.(o)
  })))));
};
window.IndexTable = IndexTable;
window.OrderRow = OrderRow;
window.TabBar = TabBar;
window.FilterBar = FilterBar;
window.Checkbox = Checkbox;
window.FAKE_ORDERS = FAKE_ORDERS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/IndexTable.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Page.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Page header
// Title + optional badge + breadcrumb back link + secondary actions row.
// Fixed max width 998px content column, with sticky save/discard bar variant.

const Page = ({
  title,
  subtitle,
  backAction,
  badge,
  primaryAction,
  secondaryActions,
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 998,
    margin: '0 auto',
    padding: '20px 24px 80px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    color: '#303030'
  }
}, backAction && /*#__PURE__*/React.createElement("button", {
  onClick: backAction.onAction,
  style: {
    all: 'unset',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 550,
    color: '#616161',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    padding: 4,
    marginLeft: -4,
    borderRadius: 8
  },
  onMouseEnter: e => {
    e.currentTarget.style.background = '#D4D4D4';
  },
  onMouseLeave: e => {
    e.currentTarget.style.background = 'transparent';
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/icons/ArrowLeftIcon.svg",
  width: 14,
  height: 14,
  alt: ""
}), backAction.content), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: subtitle ? 4 : 20
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("h1", {
  style: {
    fontSize: 20,
    fontWeight: 650,
    margin: 0,
    lineHeight: '24px',
    letterSpacing: '-0.0125rem'
  }
}, title), badge), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
    alignItems: 'center'
  }
}, secondaryActions, primaryAction)), subtitle && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 20
  }
}, subtitle), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, children));
window.Page = Page;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Page.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Screens.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Screens
// Three click-through views: Home, Orders list, Order detail.

const StatCard = ({
  label,
  value,
  delta,
  deltaTone = 'success'
}) => /*#__PURE__*/React.createElement(Card, {
  padding: 16
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#616161',
    fontWeight: 550,
    marginBottom: 4
  }
}, label), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 22,
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums',
    color: '#303030',
    marginBottom: 4
  }
}, value), delta && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: deltaTone === 'success' ? '#047B5D' : '#8E0B21',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2
  }
}, /*#__PURE__*/React.createElement("span", null, deltaTone === 'success' ? '↑' : '↓'), delta));
const HomeScreen = ({
  onOpenOrders
}) => {
  const recent = FAKE_ORDERS.slice(0, 4);
  return /*#__PURE__*/React.createElement(Page, {
    title: "Good morning, Sam"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Today's sales",
    value: "$2,184.50",
    delta: "12% from yesterday"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Orders",
    value: "14",
    delta: "3 new"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Visitors",
    value: "1,284",
    delta: "\u2191 8%"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Conversion",
    value: "2.4%",
    delta: "0.3% lower",
    deltaTone: "critical"
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Sales over time",
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "slim",
      variant: "tertiary"
    }, "Last 7 days")
  }, /*#__PURE__*/React.createElement(SparkChart, null)), /*#__PURE__*/React.createElement(Card, {
    title: "Recent orders",
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "slim",
      variant: "plain",
      onClick: onOpenOrders
    }, "View all orders \u2192"),
    sectioned: false
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("tbody", null, recent.map(o => /*#__PURE__*/React.createElement("tr", {
    key: o.id,
    style: {
      borderTop: '1px solid #EBEBEB'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 16px',
      fontWeight: 650,
      width: 80
    }
  }, o.id), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 16px'
    }
  }, o.customer), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 16px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: o.fulfillment === 'fulfilled' ? 'success' : 'attention',
    progress: o.fulfillment === 'fulfilled' ? 'complete' : 'incomplete'
  }, o.fulfillment[0].toUpperCase() + o.fulfillment.slice(1))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 16px',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 550
    }
  }, "$", o.total.toFixed(2)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 16px',
      color: '#616161',
      width: 120
    }
  }, o.date)))))), /*#__PURE__*/React.createElement(Card, {
    title: "Get started with Shopify Magic",
    actions: /*#__PURE__*/React.createElement(Badge, {
      tone: "magic"
    }, "\u2726 New")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 12,
      background: 'linear-gradient(135deg, #F8F7FF, #E9E5FF)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icons/MagicIcon.svg",
    width: 28,
    height: 28,
    alt: "",
    style: {
      filter: 'invert(36%) sepia(90%) saturate(2400%) hue-rotate(244deg) brightness(96%) contrast(101%)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 650,
      marginBottom: 2
    }
  }, "Generate product descriptions in seconds"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#616161',
      fontSize: 13
    }
  }, "Let Shopify Magic write SEO-friendly copy for your whole catalog.")), /*#__PURE__*/React.createElement(Button, null, "Try it"))));
};
const SparkChart = () => {
  // 7-day spark — flat SVG, no animation, draws inside card
  const data = [820, 1240, 980, 1640, 1320, 2100, 2184];
  const W = 720,
    H = 140,
    P = 8;
  const max = Math.max(...data),
    min = Math.min(...data) * 0.7;
  const xs = data.map((_, i) => P + i * (W - 2 * P) / (data.length - 1));
  const ys = data.map(v => H - P - (v - min) / (max - min) * (H - 2 * P));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const fill = d + ` L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    width: "100%",
    height: "160",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sg",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#005BD3",
    stopOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#005BD3",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: fill,
    fill: "url(#sg)"
  }), /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: "none",
    stroke: "#005BD3",
    strokeWidth: "1.5"
  }), xs.map((x, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: x,
    cy: ys[i],
    r: i === xs.length - 1 ? 4 : 2,
    fill: "#005BD3"
  })));
};
const OrdersScreen = ({
  onOpenOrder
}) => {
  const [tab, setTab] = React.useState('all');
  const tabs = [{
    id: 'all',
    label: 'All',
    count: FAKE_ORDERS.length
  }, {
    id: 'unfulfilled',
    label: 'Unfulfilled',
    count: FAKE_ORDERS.filter(o => o.fulfillment !== 'fulfilled').length
  }, {
    id: 'unpaid',
    label: 'Unpaid',
    count: FAKE_ORDERS.filter(o => o.payment === 'pending').length
  }, {
    id: 'open',
    label: 'Open'
  }, {
    id: 'closed',
    label: 'Closed'
  }];
  const filtered = tab === 'all' ? FAKE_ORDERS : tab === 'unfulfilled' ? FAKE_ORDERS.filter(o => o.fulfillment !== 'fulfilled') : tab === 'unpaid' ? FAKE_ORDERS.filter(o => o.payment === 'pending') : FAKE_ORDERS;
  return /*#__PURE__*/React.createElement(Page, {
    title: "Orders",
    primaryAction: /*#__PURE__*/React.createElement(Button, {
      variant: "primary"
    }, "Create order"),
    secondaryActions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "medium",
      variant: "default"
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      size: "medium",
      variant: "default"
    }, "More actions"))
  }, /*#__PURE__*/React.createElement(Card, {
    sectioned: false,
    padding: 0
  }, /*#__PURE__*/React.createElement(TabBar, {
    tabs: tabs,
    current: tab,
    onChange: setTab
  }), /*#__PURE__*/React.createElement(IndexTable, {
    orders: filtered,
    onOpenOrder: onOpenOrder
  })));
};
const OrderDetailScreen = ({
  order,
  onBack
}) => /*#__PURE__*/React.createElement(Page, {
  backAction: {
    content: 'Orders',
    onAction: onBack
  },
  title: order.id,
  badge: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    progress: "complete"
  }, "Paid"), /*#__PURE__*/React.createElement(Badge, {
    tone: "attention",
    progress: "incomplete"
  }, "Unfulfilled")),
  primaryAction: /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Mark as fulfilled"),
  secondaryActions: /*#__PURE__*/React.createElement(Button, null, "Refund"),
  subtitle: order.date
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 16,
    alignItems: 'start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement(Card, {
  title: "Unfulfilled",
  actions: /*#__PURE__*/React.createElement(Badge, {
    tone: "attention",
    progress: "incomplete"
  }, "Unfulfilled"),
  sectioned: false
}, /*#__PURE__*/React.createElement(CardSection, {
  divided: false
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: 8,
    background: '#F1F1F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/icons/ImageIcon.svg",
  width: 20,
  height: 20,
  alt: "",
  style: {
    opacity: 0.5
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 550,
    fontSize: 13
  }
}, "Hand-knit alpaca beanie"), /*#__PURE__*/React.createElement("div", {
  style: {
    color: '#616161',
    fontSize: 12
  }
}, "Charcoal \xB7 One size"), /*#__PURE__*/React.createElement("div", {
  style: {
    color: '#616161',
    fontSize: 12
  }
}, "SKU: BEN-001-CHR")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#616161'
  }
}, "$42.00 \xD7 ", order.items), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 550,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 64,
    textAlign: 'right'
  }
}, "$", order.total.toFixed(2))))), /*#__PURE__*/React.createElement(Card, {
  title: "Paid"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '4px 16px',
    fontSize: 13
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#616161'
  }
}, "Subtotal"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right'
  }
}, "$", (order.total - 8).toFixed(2)), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#616161'
  }
}, "Shipping (Standard)"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right'
  }
}, "$8.00"), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#616161'
  }
}, "Tax"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right'
  }
}, "$0.00"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 650,
    borderTop: '1px solid #EBEBEB',
    paddingTop: 8
  }
}, "Total"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    borderTop: '1px solid #EBEBEB',
    paddingTop: 8
  }
}, "$", order.total.toFixed(2)))), /*#__PURE__*/React.createElement(Card, {
  title: "Timeline"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    fontSize: 13
  }
}, /*#__PURE__*/React.createElement(TimelineItem, {
  label: "Order created",
  time: order.date
}), /*#__PURE__*/React.createElement(TimelineItem, {
  label: "Payment authorized via Shopify Payments",
  time: order.date
}), /*#__PURE__*/React.createElement(TimelineItem, {
  label: "Payment captured \u2014 $124.50",
  time: order.date
})))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }
}, /*#__PURE__*/React.createElement(Card, {
  title: "Customer"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    background: '#52F490',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 650,
    color: '#014B40',
    fontSize: 12
  }
}, order.customer.split(' ').map(s => s[0]).join('')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 550
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#005BD3'
  }
}, order.customer)), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#616161'
  }
}, "3 orders")))), /*#__PURE__*/React.createElement(Card, {
  title: "Contact information"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#005BD3'
  }
}, order.customer.split(' ')[0].toLowerCase(), "@example.com"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#616161',
    marginTop: 4
  }
}, "+1 (555) 234-1098")), /*#__PURE__*/React.createElement(Card, {
  title: "Shipping address"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    lineHeight: '20px'
  }
}, order.customer, /*#__PURE__*/React.createElement("br", null), "128 Maple Ridge Rd", /*#__PURE__*/React.createElement("br", null), "Banff, AB T1L 1B5", /*#__PURE__*/React.createElement("br", null), "Canada")))));
const TimelineItem = ({
  label,
  time
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    background: '#047B5D',
    marginTop: 6
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", null, label), /*#__PURE__*/React.createElement("div", {
  style: {
    color: '#616161',
    fontSize: 12
  }
}, time)));
const SimpleEmptyScreen = ({
  title,
  message
}) => /*#__PURE__*/React.createElement(Page, {
  title: title
}, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '40px 20px',
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: '#F1F1F1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/icons/ProductIcon.svg",
  width: 28,
  height: 28,
  alt: "",
  style: {
    opacity: 0.5
  }
})), /*#__PURE__*/React.createElement("h3", {
  style: {
    fontSize: 14,
    fontWeight: 650,
    margin: '0 0 4px'
  }
}, title), /*#__PURE__*/React.createElement("p", {
  style: {
    color: '#616161',
    fontSize: 13,
    margin: '0 0 12px'
  }
}, message), /*#__PURE__*/React.createElement(Button, {
  variant: "primary"
}, "Get started"))));
window.HomeScreen = HomeScreen;
window.OrdersScreen = OrdersScreen;
window.OrderDetailScreen = OrderDetailScreen;
window.SimpleEmptyScreen = SimpleEmptyScreen;
window.StatCard = StatCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Sidebar.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Sidebar
// Left rail nav with active highlight, icons via /assets/icons SVGs (currentColor)
// Background is the cool light gray; selected items get a white pill.

const NAV_PRIMARY = [{
  id: 'home',
  label: 'Home',
  icon: 'HomeIcon'
}, {
  id: 'orders',
  label: 'Orders',
  icon: 'OrderIcon',
  badge: '3'
}, {
  id: 'products',
  label: 'Products',
  icon: 'ProductIcon'
}, {
  id: 'customers',
  label: 'Customers',
  icon: 'PersonIcon'
}, {
  id: 'content',
  label: 'Content',
  icon: 'PageIcon'
}, {
  id: 'analytics',
  label: 'Analytics',
  icon: 'ChartVerticalIcon'
}, {
  id: 'marketing',
  label: 'Marketing',
  icon: 'NotificationIcon'
}, {
  id: 'discounts',
  label: 'Discounts',
  icon: 'DiscountIcon'
}];
const NAV_SECONDARY = [{
  id: 'online-store',
  label: 'Online Store',
  icon: 'StoreIcon'
}, {
  id: 'pos',
  label: 'Point of Sale',
  icon: 'CashDollarIcon'
}];
const NavIcon = ({
  name,
  color = 'currentColor',
  size = 20
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    display: 'inline-flex',
    width: size,
    height: size,
    color
  }
}, /*#__PURE__*/React.createElement("img", {
  src: `../../assets/icons/${name}.svg`,
  width: size,
  height: size,
  alt: "",
  style: {
    display: 'block',
    filter: 'none'
  }
}));
const NavItem = ({
  item,
  selected,
  onClick
}) => {
  const [hover, setHover] = React.useState(false);
  const bg = selected ? '#FAFAFA' : hover ? '#F1F1F1' : 'transparent';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      all: 'unset',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 13,
      lineHeight: '20px',
      color: '#303030',
      fontWeight: selected ? 650 : 550,
      background: bg,
      transition: 'background-color 150ms cubic-bezier(0.19, 0.91, 0.38, 1)',
      width: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(NavIcon, {
    name: item.icon
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      lineHeight: '16px',
      fontWeight: 450,
      color: '#616161'
    }
  }, item.badge));
};
const Sidebar = ({
  current,
  onNavigate
}) => /*#__PURE__*/React.createElement("nav", {
  style: {
    width: 240,
    flex: '0 0 240px',
    background: '#EBEBEB',
    height: '100%',
    padding: '12px 12px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 8,
    background: '#FAFAFA',
    boxShadow: '0 1px 0 rgba(0,0,0,0.05), inset 0 0 0 1px rgba(0,0,0,0.04)'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: '#303030',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700
  }
}, "MG"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 650,
    flex: 1
  }
}, "Mountain Goods"), /*#__PURE__*/React.createElement(NavIcon, {
  name: "ChevronDownIcon",
  size: 14
})), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1
  }
}, NAV_PRIMARY.map(item => /*#__PURE__*/React.createElement(NavItem, {
  key: item.id,
  item: item,
  selected: current === item.id,
  onClick: () => onNavigate(item.id)
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    lineHeight: '16px',
    color: '#616161',
    fontWeight: 650,
    padding: '8px 8px 4px'
  }
}, "Sales channels"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1
  }
}, NAV_SECONDARY.map(item => /*#__PURE__*/React.createElement(NavItem, {
  key: item.id,
  item: item,
  selected: current === item.id,
  onClick: () => onNavigate(item.id)
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement(NavItem, {
  item: {
    id: 'settings',
    label: 'Settings',
    icon: 'SettingsIcon'
  },
  selected: current === 'settings',
  onClick: () => onNavigate('settings')
}));
window.Sidebar = Sidebar;
window.NavIcon = NavIcon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/Topbar.jsx
try { (() => {
/* eslint-disable */
// Polaris Admin — Topbar
// Dark inverse top stripe with global search, notifications, store badge, avatar.

const Topbar = () => {
  const [q, setQ] = React.useState('');
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 56,
      flex: '0 0 56px',
      background: '#1A1A1A',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      color: '#E3E3E3',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: '#E3E3E3',
      fontSize: 13,
      fontWeight: 650
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/shopify-logomark.svg",
    width: 28,
    height: 32,
    alt: "Shopify"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff'
    }
  }, "Mountain Goods")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 16,
      height: 16,
      opacity: 0.7,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icons/SearchIcon.svg",
    width: 16,
    height: 16,
    alt: "",
    style: {
      filter: 'invert(1) opacity(0.7)'
    }
  })), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Search",
    style: {
      width: '100%',
      boxSizing: 'border-box',
      height: 32,
      paddingLeft: 32,
      paddingRight: 12,
      background: '#303030',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      fontSize: 13,
      fontFamily: 'inherit',
      outline: 'none'
    },
    onFocus: e => {
      e.target.style.outline = '2px solid #005BD3';
      e.target.style.outlineOffset = '1px';
    },
    onBlur: e => {
      e.target.style.outline = 'none';
    }
  })), /*#__PURE__*/React.createElement("button", {
    style: iconBtn,
    title: "Notifications",
    onMouseEnter: e => {
      e.currentTarget.style.background = '#4A4A4A';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = '#303030';
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icons/NotificationIcon.svg",
    width: 18,
    height: 18,
    alt: "",
    style: {
      filter: 'invert(0.92)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      background: '#9474FF',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#F8F7FF',
      fontWeight: 550,
      fontSize: 13,
      cursor: 'pointer'
    }
  }, "SR"));
};
const iconBtn = {
  all: 'unset',
  cursor: 'pointer',
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#303030'
};
window.Topbar = Topbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/polaris-docs/DocsShell.jsx
try { (() => {
/* eslint-disable */
const NAV = [{
  group: 'Getting started',
  items: [{
    id: 'introduction',
    label: 'Introduction'
  }, {
    id: 'getting-started',
    label: 'For developers'
  }, {
    id: 'design-resources',
    label: 'For designers'
  }]
}, {
  group: 'Foundations',
  items: [{
    id: 'principles',
    label: 'Design principles'
  }, {
    id: 'accessibility',
    label: 'Accessibility'
  }, {
    id: 'illustrations',
    label: 'Illustrations'
  }]
}, {
  group: 'Components',
  items: [{
    id: 'button',
    label: 'Button'
  }, {
    id: 'card',
    label: 'Card'
  }, {
    id: 'badge',
    label: 'Badge'
  }, {
    id: 'index-table',
    label: 'IndexTable'
  }, {
    id: 'modal',
    label: 'Modal'
  }, {
    id: 'page',
    label: 'Page'
  }, {
    id: 'text-field',
    label: 'TextField'
  }, {
    id: 'select',
    label: 'Select'
  }, {
    id: 'toast',
    label: 'Toast'
  }, {
    id: 'banner',
    label: 'Banner'
  }]
}, {
  group: 'Tokens',
  items: [{
    id: 'color',
    label: 'Color'
  }, {
    id: 'space',
    label: 'Space'
  }, {
    id: 'shadow',
    label: 'Shadow'
  }, {
    id: 'font',
    label: 'Font'
  }, {
    id: 'motion',
    label: 'Motion'
  }]
}, {
  group: 'Patterns',
  items: [{
    id: 'date-picking',
    label: 'Date picking'
  }, {
    id: 'error-messages',
    label: 'Error messages'
  }]
}];
const SideNav = ({
  current,
  onNavigate
}) => /*#__PURE__*/React.createElement("nav", {
  style: {
    width: 240,
    flex: '0 0 240px',
    padding: '24px 16px',
    borderRight: '1px solid #EBEBEB',
    fontSize: 13,
    height: '100%',
    overflow: 'auto',
    boxSizing: 'border-box'
  }
}, NAV.map(g => /*#__PURE__*/React.createElement("div", {
  key: g.group,
  style: {
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#616161',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    padding: '0 8px 6px'
  }
}, g.group), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1
  }
}, g.items.map(item => {
  const sel = current === item.id;
  return /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => onNavigate(item.id),
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: sel ? 600 : 400,
      color: sel ? '#005BD3' : '#303030',
      background: sel ? '#F0F2FF' : 'transparent'
    }
  }, item.label);
})))));
const TopNav = () => /*#__PURE__*/React.createElement("header", {
  style: {
    height: 56,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    borderBottom: '1px solid #EBEBEB',
    background: '#fff',
    gap: 24
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/shopify-logomark.svg",
  width: 22,
  height: 26,
  alt: ""
}), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 16,
    fontWeight: 650
  }
}, "Polaris"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 11,
    color: '#616161',
    background: '#F1F1F1',
    padding: '2px 6px',
    borderRadius: 8,
    fontWeight: 500
  }
}, "v13")), /*#__PURE__*/React.createElement("nav", {
  style: {
    display: 'flex',
    gap: 16,
    fontSize: 13,
    color: '#303030'
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#303030',
    fontWeight: 500
  }
}, "Getting started"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#303030',
    fontWeight: 500
  }
}, "Foundations"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#005BD3',
    fontWeight: 500
  }
}, "Components"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#303030',
    fontWeight: 500
  }
}, "Tokens"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#303030',
    fontWeight: 500
  }
}, "Icons")), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: 200,
    height: 32,
    padding: '0 10px',
    border: '1px solid #E3E3E3',
    borderRadius: 8,
    background: '#FDFDFD',
    color: '#616161',
    fontSize: 12
  }
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/icons/SearchIcon.svg",
  width: 14,
  height: 14,
  alt: "",
  style: {
    opacity: 0.6
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    flex: 1
  }
}, "Search"), /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: 11,
    color: '#8A8A8A'
  }
}, "\u2318K")));
const TocRail = ({
  items
}) => /*#__PURE__*/React.createElement("aside", {
  style: {
    width: 200,
    flex: '0 0 200px',
    padding: '32px 16px',
    borderLeft: '1px solid #EBEBEB',
    fontSize: 12,
    lineHeight: '20px',
    color: '#616161'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontWeight: 600,
    color: '#303030',
    marginBottom: 8,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  }
}, "On this page"), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    padding: '4px 0',
    paddingLeft: it.depth === 2 ? 12 : 0,
    color: i === 0 ? '#005BD3' : '#616161',
    borderLeft: i === 0 ? '2px solid #005BD3' : '2px solid transparent',
    marginLeft: -16,
    paddingLeft: i === 0 ? 14 : 16,
    fontWeight: i === 0 ? 600 : 400
  }
}, it.label)));
const DocsShell = ({
  current,
  onNavigate,
  children,
  toc
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    color: '#303030',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
  }
}, /*#__PURE__*/React.createElement(TopNav, null), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    display: 'flex',
    minHeight: 0
  }
}, /*#__PURE__*/React.createElement(SideNav, {
  current: current,
  onNavigate: onNavigate
}), /*#__PURE__*/React.createElement("main", {
  style: {
    flex: 1,
    overflow: 'auto',
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    minHeight: '100%'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    padding: '40px 56px',
    maxWidth: 760,
    minWidth: 0
  }
}, children), toc && /*#__PURE__*/React.createElement(TocRail, {
  items: toc
})))));
window.DocsShell = DocsShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/polaris-docs/DocsShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/polaris-docs/Pages.jsx
try { (() => {
/* eslint-disable */
const CodeBlock = ({
  code,
  lang = 'tsx'
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    background: '#1A1A1A',
    color: '#E3E3E3',
    borderRadius: 8,
    padding: '16px 16px',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontSize: 12,
    lineHeight: '20px',
    overflow: 'auto',
    border: '1px solid #303030'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: 600,
    padding: '2px 6px',
    background: '#303030',
    borderRadius: 4
  }
}, lang), /*#__PURE__*/React.createElement("pre", {
  style: {
    margin: 0,
    whiteSpace: 'pre'
  }
}, code));
const DocsHome = ({
  onNavigate
}) => {
  const cards = [{
    title: 'Foundations',
    desc: 'Color, type, space, motion — the visual rules behind every Polaris component.',
    cta: 'Read foundations',
    icon: 'BookIcon'
  }, {
    title: 'Components',
    desc: '~80 React components covering everything from buttons to data tables.',
    cta: 'Browse components',
    icon: 'AppsIcon'
  }, {
    title: 'Tokens',
    desc: 'Every CSS variable in @shopify/polaris-tokens, organized by domain.',
    cta: 'View tokens',
    icon: 'CodeIcon'
  }, {
    title: 'Icons',
    desc: '~480 hand-drawn icons at 20×20, MIT-licensed and free to copy.',
    cta: 'Open icon library',
    icon: 'StarIcon'
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#616161',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8
    }
  }, "Polaris React \xB7 v13"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 40,
      lineHeight: '44px',
      fontWeight: 650,
      letterSpacing: '-0.02em',
      margin: '0 0 12px'
    }
  }, "Build merchant experiences for Shopify"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: '24px',
      color: '#616161',
      margin: 0,
      maxWidth: 580
    }
  }, "Polaris is the design system that powers the Shopify Admin. Use these guidelines, components, and tools to build apps and surfaces that feel native to Shopify.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, cards.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.title,
    onClick: () => onNavigate('button'),
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: 16,
      borderRadius: 12,
      border: '1px solid #E3E3E3',
      background: '#fff',
      boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
      transition: 'background 150ms cubic-bezier(.25,.1,.25,1)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = '#FAFAFA';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = '#fff';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: '#F1F1F1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `../../assets/icons/${c.icon}.svg`,
    width: 18,
    height: 18,
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 650,
      marginBottom: 4
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#616161',
      lineHeight: '20px',
      marginBottom: 8
    }
  }, c.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#005BD3',
      fontWeight: 500
    }
  }, c.cta, " \u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      padding: 16,
      background: '#F8F7FF',
      border: '1px solid #E4DEFF',
      borderRadius: 12,
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icons/MagicIcon.svg",
    width: 18,
    height: 18,
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: '#5700D1',
      marginBottom: 2
    }
  }, "Now released: Polaris Web Components"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#5700D1'
    }
  }, "Use Polaris in any framework via standard custom elements.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: '#5700D1'
    }
  }, "Read the announcement \u2192")));
};
const ComponentPage = () => {
  const buttonExample = `import {Button} from '@shopify/polaris';

export function Demo() {
  return <Button variant="primary">Save</Button>;
}`;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#616161',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: '#005BD3'
    }
  }, "Components"), " / ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: '#005BD3'
    }
  }, "Actions")), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 32,
      fontWeight: 650,
      margin: '0 0 8px',
      letterSpacing: '-0.01em'
    },
    id: "top"
  }, "Button"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: '24px',
      color: '#616161',
      margin: '0 0 8px'
    }
  }, "Buttons are used primarily for actions, such as \"Save\" in an Add product page or \"Pay now\" at checkout. Pick the variant by importance."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      margin: '8px 0 24px'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 12,
      color: '#005BD3'
    }
  }, "Examples"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#616161'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 12,
      color: '#005BD3'
    }
  }, "Props"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#616161'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 12,
      color: '#005BD3'
    }
  }, "Accessibility"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#616161'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 12,
      color: '#005BD3'
    }
  }, "View source")), /*#__PURE__*/React.createElement("h2", {
    id: "examples",
    style: {
      fontSize: 20,
      fontWeight: 650,
      margin: '24px 0 12px',
      letterSpacing: '-0.01em'
    }
  }, "Examples"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 12,
      border: '1px solid #E3E3E3',
      overflow: 'hidden',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 32,
      background: '#FAFAFA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: '1px solid #E3E3E3'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      background: '#303030',
      color: '#fff',
      border: '1px solid #303030',
      borderRadius: 8,
      height: 32,
      padding: '0 12px',
      fontSize: 13,
      fontWeight: 600,
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 0 rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.16)',
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, "Save")), /*#__PURE__*/React.createElement(CodeBlock, {
    code: buttonExample
  })), /*#__PURE__*/React.createElement("h2", {
    id: "props",
    style: {
      fontSize: 20,
      fontWeight: 650,
      margin: '24px 0 12px',
      letterSpacing: '-0.01em'
    }
  }, "Props"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13,
      fontFamily: 'ui-monospace, Menlo, monospace'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#FAFAFA'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Prop"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Type"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Description"))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("b", null, "variant")), /*#__PURE__*/React.createElement("td", {
    style: td
  }, "'default' | 'primary' | 'tertiary' | 'plain'"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'Inter, sans-serif'
    }
  }, "Visual style")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("b", null, "size")), /*#__PURE__*/React.createElement("td", {
    style: td
  }, "'micro' | 'slim' | 'medium' | 'large'"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'Inter, sans-serif'
    }
  }, "Button size")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("b", null, "tone")), /*#__PURE__*/React.createElement("td", {
    style: td
  }, "'critical' | 'success'"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'Inter, sans-serif'
    }
  }, "Sets a meaningful color")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("b", null, "disabled")), /*#__PURE__*/React.createElement("td", {
    style: td
  }, "boolean"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'Inter, sans-serif'
    }
  }, "Disables the button")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("b", null, "loading")), /*#__PURE__*/React.createElement("td", {
    style: td
  }, "boolean"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'Inter, sans-serif'
    }
  }, "Replaces label with spinner")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("b", null, "onClick")), /*#__PURE__*/React.createElement("td", {
    style: td
  }, "() => void"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'Inter, sans-serif'
    }
  }, "Click handler")))));
};
const th = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: '#616161',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  borderBottom: '1px solid #E3E3E3',
  fontFamily: 'Inter, sans-serif'
};
const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #EBEBEB',
  verticalAlign: 'top'
};
const TOC_BUTTON = [{
  label: 'Button',
  depth: 1
}, {
  label: 'Examples',
  depth: 2
}, {
  label: 'Props',
  depth: 2
}, {
  label: 'Accessibility',
  depth: 2
}];
window.DocsHome = DocsHome;
window.ComponentPage = ComponentPage;
window.CodeBlock = CodeBlock;
window.TOC_BUTTON = TOC_BUTTON;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/polaris-docs/Pages.jsx", error: String((e && e.message) || e) }); }

})();
