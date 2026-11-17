// dapplebyte.com/key/ — turns a stream server URL and key into a QR code for Relaypad.
// Everything happens in this tab: no network requests, no storage, no analytics.
// The QR payload is relaypad://live-key?s=<server>&k=<key>, each value encodeURIComponent'd;
// either parameter is left out when its field is empty (the app splits a full URL in `s`).
(function () {
  'use strict';

  var data = JSON.parse(document.getElementById('key-strings').textContent);
  var LOCALES = data.locales;
  var STRINGS = data.strings;

  var server = document.getElementById('key-server');
  var key = document.getElementById('key-key');
  var toggle = document.getElementById('key-toggle');
  var clearBtn = document.getElementById('key-clear');
  var serverError = document.getElementById('key-server-error');
  var keyError = document.getElementById('key-key-error');
  var frame = document.getElementById('key-qr');
  var status = document.getElementById('key-qr-status');
  var langSelect = document.getElementById('key-lang');
  var step2 = document.getElementById('key-step2');

  var lang = 'en';
  var keyVisible = false;

  function s(name) {
    var dict = STRINGS[lang] || STRINGS.en;
    return dict[name] || STRINGS.en[name] || '';
  }

  // ---- language -------------------------------------------------------------------------------

  function matchLocale(tag) {
    if (!tag) return null;
    var t = String(tag).toLowerCase().replace(/_/g, '-');
    var base = t.split('-')[0];
    if (base === 'zh') {
      if (/-hans/.test(t)) return 'zh-CN';
      if (/-(hant|tw|hk|mo)/.test(t)) return 'zh-TW';
      return 'zh-CN';
    }
    if (base === 'pt') return 'pt-BR';
    if (base === 'in') base = 'id';
    var i;
    for (i = 0; i < LOCALES.length; i++) if (LOCALES[i].lang.toLowerCase() === t) return LOCALES[i].lang;
    for (i = 0; i < LOCALES.length; i++) if (LOCALES[i].lang.toLowerCase().split('-')[0] === base) return LOCALES[i].lang;
    return null;
  }

  function preferredLocale() {
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < prefs.length; i++) {
      var m = matchLocale(prefs[i]);
      if (m) return m;
    }
    return 'en';
  }

  function applyLanguage(next) {
    lang = STRINGS[next] ? next : 'en';
    var meta = LOCALES.filter(function (l) { return l.lang === lang; })[0] || LOCALES[0];
    var root = document.documentElement;
    root.lang = meta.lang;
    root.dir = meta.dir;
    document.title = s('title') + ' · Relaypad · DappleByte';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = s(nodes[i].getAttribute('data-i18n'));
    var attrs = document.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrs.length; j++) {
      var pairs = attrs[j].getAttribute('data-i18n-attr').split(',');
      for (var p = 0; p < pairs.length; p++) {
        var kv = pairs[p].split(':');
        attrs[j].setAttribute(kv[0], s(kv[1]));
      }
    }
    // Step 2 names the app's button: "{button}" becomes <strong>, built without innerHTML.
    var parts = s('step2').split('{button}');
    while (step2.firstChild) step2.removeChild(step2.firstChild);
    step2.appendChild(document.createTextNode(parts[0]));
    var strong = document.createElement('strong');
    strong.textContent = s('scanButton');
    step2.appendChild(strong);
    step2.appendChild(document.createTextNode(parts.slice(1).join('')));
    langSelect.value = lang;
    renderToggle();
    update();
  }

  // ---- validation and payload -----------------------------------------------------------------

  var SCHEME = /^rtmps?:\/\//i;

  /** True while `v` could still grow into "rtmp://" or "rtmps://". */
  function isSchemePrefix(v) {
    var l = v.toLowerCase();
    return 'rtmp://'.indexOf(l) === 0 || 'rtmps://'.indexOf(l) === 0;
  }

  function encode(v) {
    try {
      return encodeURIComponent(v);
    } catch (e) {
      return null; // lone surrogate
    }
  }

  /**
   * Reads both fields and returns { payload, serverErr, keyErr, message }.
   * `payload` is null when there is nothing valid to encode yet.
   */
  function evaluate() {
    var sv = server.value.trim();
    var kv = key.value.trim();
    var res = { payload: null, serverErr: null, keyErr: null, message: 'qrEmpty' };
    var serverOk = false;
    var serverHasKey = false;

    if (sv) {
      if (/\s/.test(sv)) {
        res.serverErr = 'errServerSpaces';
      } else if (!SCHEME.test(sv)) {
        // Still typing the scheme: no error until the field loses focus.
        if (!(isSchemePrefix(sv) && document.activeElement === server)) res.serverErr = 'errServerScheme';
      } else {
        var rest = sv.replace(SCHEME, '');
        var segs = rest.split('/');
        if (!segs[0]) {
          if (!(rest === '' && document.activeElement === server)) res.serverErr = 'errServerScheme';
        } else {
          serverOk = true;
          // rtmp(s)://host/app/KEY: at least an app segment and a non-empty last segment.
          serverHasKey = segs.length >= 3 && segs[1] !== '' && segs[segs.length - 1] !== '';
        }
      }
    }
    if (kv && /\s/.test(kv)) res.keyErr = 'errKeySpaces';

    if (res.serverErr || res.keyErr) {
      res.message = null;
      return res;
    }

    var es = sv ? encode(sv) : '';
    var ek = kv ? encode(kv) : '';
    if (es === null) res.serverErr = 'errInvalid';
    if (ek === null) res.keyErr = 'errInvalid';
    if (res.serverErr || res.keyErr) {
      res.message = null;
      return res;
    }

    if (kv) {
      if (sv && !serverOk) return res; // scheme still being typed
      res.payload = 'relaypad://live-key?' + (sv ? 's=' + es + '&' : '') + 'k=' + ek;
    } else if (serverOk && serverHasKey) {
      res.payload = 'relaypad://live-key?s=' + es;
    } else if (sv) {
      res.message = 'qrNeedKey';
    }
    return res;
  }

  // ---- rendering ------------------------------------------------------------------------------

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var QUIET = 4; // modules of white around the code, as the spec asks

  /** Returns an <svg> for the payload, or throws when it does not fit in a QR code. */
  function buildSvg(payload) {
    var qr = qrcode(0, 'M');
    qr.addData(payload, 'Byte');
    qr.make();
    var n = qr.getModuleCount();
    var size = n + QUIET * 2;
    var d = '';
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) { c++; continue; }
        var start = c;
        while (c < n && qr.isDark(r, c)) c++;
        d += 'M' + (start + QUIET) + ' ' + (r + QUIET) + 'h' + (c - start) + 'v1h-' + (c - start) + 'z';
      }
    }
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    bg.setAttribute('fill', '#ffffff');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', '#000000');
    svg.appendChild(bg);
    svg.appendChild(path);
    return svg;
  }

  function showError(el, input, name) {
    if (name) {
      el.textContent = s(name);
      el.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      el.textContent = '';
      el.hidden = true;
      input.removeAttribute('aria-invalid');
    }
  }

  function clearQr() {
    while (frame.firstChild) frame.removeChild(frame.firstChild);
    frame.classList.remove('is-ready');
    frame.removeAttribute('role');
    frame.removeAttribute('aria-label');
  }

  function update() {
    var res = evaluate();
    showError(serverError, server, res.serverErr);
    showError(keyError, key, res.keyErr);
    clearQr();
    status.classList.remove('is-ready');
    if (res.payload) {
      var svg = null;
      try {
        svg = buildSvg(res.payload);
      } catch (e) {
        svg = null;
      }
      res.payload = null; // do not keep the key around longer than needed
      if (svg) {
        frame.appendChild(svg);
        frame.classList.add('is-ready');
        frame.setAttribute('role', 'img');
        frame.setAttribute('aria-label', s('qrAlt'));
        status.textContent = s('qrReady');
        status.classList.add('is-ready');
        return;
      }
      status.textContent = s('errTooLong');
      return;
    }
    var empty = document.createElement('p');
    empty.className = 'qr-empty';
    empty.textContent = s('qrEmpty');
    frame.appendChild(empty);
    status.textContent = res.message ? s(res.message) : '';
  }

  function renderToggle() {
    key.type = keyVisible ? 'text' : 'password';
    toggle.textContent = s(keyVisible ? 'hide' : 'show');
    toggle.setAttribute('aria-label', s(keyVisible ? 'hideLabel' : 'showLabel'));
  }

  function clearAll() {
    server.value = '';
    key.value = '';
    keyVisible = false;
    renderToggle();
    update();
  }

  // ---- wiring ---------------------------------------------------------------------------------

  server.addEventListener('input', update);
  key.addEventListener('input', update);
  server.addEventListener('blur', update);
  server.addEventListener('focus', update);
  toggle.addEventListener('click', function () {
    keyVisible = !keyVisible;
    renderToggle();
  });
  clearBtn.addEventListener('click', function () {
    clearAll();
    server.focus();
  });
  langSelect.addEventListener('change', function () {
    applyLanguage(langSelect.value);
  });
  // Leaving the page (closing, navigating, going to the bfcache) wipes both fields and the code.
  window.addEventListener('pagehide', clearAll);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) clearAll();
  });

  // A reload may have restored typed values; start clean every time.
  server.value = '';
  key.value = '';
  applyLanguage(preferredLocale());
})();
