/* ==========================================================================
   Landing page behavior (vanilla JavaScript, no dependencies)
   --------------------------------------------------------------------------
   1. Configuration (form endpoint lives here)
   2. Helpers
   3. Header, mobile menu and smooth scrolling
   4. Earnings calculator
   5. FAQ accordion
   6. Application form (validation + submission)
   7. Reveal animations and back to top
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- 1. Configuration ---------- */
  var CONFIG = {
    // Set this to your form handler URL to connect the form, for example:
    //   formEndpoint: 'https://example.com/api/applications'
    // While it is an empty string the form stays in demo mode: it validates
    // input but never sends or stores anything.
    formEndpoint: ''
  };

  /* ---------- 2. Helpers ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $all(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  var usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

  /* ---------- 3. Header, mobile menu, smooth scrolling ---------- */
  function initHeader() {
    var header = $('.site-header');
    if (!header) return;

    var toggle = $('.menu-toggle', header);
    var nav = $('#site-nav');

    function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function setMenu(open) {
      if (!toggle || !nav) return;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    }

    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        setMenu(toggle.getAttribute('aria-expanded') !== 'true');
      });

      // Close with Escape and return focus to the button
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setMenu(false);
          toggle.focus();
        }
      });

      // Close when tapping outside the header
      document.addEventListener('click', function (event) {
        if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) {
          setMenu(false);
        }
      });

      // Reset when the layout switches back to desktop
      window.matchMedia('(min-width: 901px)').addEventListener('change', function (mq) {
        if (mq.matches) setMenu(false);
      });
    }

    // Smooth scrolling for every in page link
    $all('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var hash = link.getAttribute('href');
        if (!hash || hash === '#') return;
        var target = document.getElementById(hash.slice(1));
        if (!target) return;

        event.preventDefault();
        setMenu(false);

        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });

        // Move keyboard focus to the destination without causing a second scroll
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });

        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', hash);
        }
      });
    });
  }

  /* ---------- 4. Earnings calculator ---------- */
  function initCalculator() {
    var hours = $('#calc-hours');
    var rate = $('#calc-rate');
    if (!hours || !rate) return;

    var hoursOut = $('#calc-hours-out');
    var rateOut = $('#calc-rate-out');
    var weeklyEl = $('#calc-weekly');
    var monthlyEl = $('#calc-monthly');

    function paintFill(input) {
      var min = Number(input.min);
      var max = Number(input.max);
      var pct = ((Number(input.value) - min) / (max - min)) * 100;
      input.style.setProperty('--fill', pct + '%');
    }

    function bump(el) {
      if (reduceMotion) return;
      el.classList.remove('is-bump');
      void el.offsetWidth; // restart the animation
      el.classList.add('is-bump');
    }

    function update() {
      var h = Number(hours.value);
      var r = Number(rate.value);

      // Weekly Gross Earnings = Hours x Hourly Pay
      var weekly = h * r;
      // Monthly Gross Earnings = Weekly Gross Earnings x 52 / 12
      var monthly = (weekly * 52) / 12;

      hoursOut.textContent = h + ' hours';
      rateOut.textContent = usd.format(r) + ' / hour';
      weeklyEl.textContent = usd.format(weekly);
      monthlyEl.textContent = usd.format(monthly);

      hours.setAttribute('aria-valuetext', h + ' hours per week');
      rate.setAttribute('aria-valuetext', usd.format(r) + ' per hour');

      paintFill(hours);
      paintFill(rate);
    }

    function onInput(event) {
      update();
      bump(weeklyEl);
      bump(monthlyEl);
    }

    hours.addEventListener('input', onInput);
    rate.addEventListener('input', onInput);
    update();
  }

  /* ---------- 5. FAQ accordion ---------- */
  function initFaq() {
    var list = $('[data-faq]');
    if (!list) return;

    var buttons = $all('.faq__btn', list);

    function setOpen(button, open) {
      var item = button.closest('.faq__item');
      button.setAttribute('aria-expanded', String(open));
      item.classList.toggle('is-open', open);
    }

    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () {
        setOpen(button, button.getAttribute('aria-expanded') !== 'true');
      });

      // Arrow keys, Home and End move between questions
      button.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowDown') next = buttons[(index + 1) % buttons.length];
        else if (event.key === 'ArrowUp') next = buttons[(index - 1 + buttons.length) % buttons.length];
        else if (event.key === 'Home') next = buttons[0];
        else if (event.key === 'End') next = buttons[buttons.length - 1];
        if (next) {
          event.preventDefault();
          next.focus();
        }
      });
    });
  }

  /* ---------- 6. Application form ---------- */

  // Pure validators: each returns an error message, or an empty string when valid.
  function validateName(value) {
    var name = value.trim();
    if (!name) return 'Please enter your full name.';
    if (!/^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'\u2019-]*$/.test(name) || name.length < 3) {
      return 'Please enter your name using letters only.';
    }
    if (name.split(/\s+/).length < 2) return 'Please enter your first and last name.';
    return '';
  }

  function validateEmail(value) {
    var email = value.trim();
    if (!email) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) || /\.\./.test(email) || email.length > 254) {
      return 'Please enter a valid email address, like name@example.com.';
    }
    return '';
  }

  // Returns the 10 digit U.S. number from whatever the visitor typed, or ''.
  function usPhoneDigits(value) {
    var digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    return digits.length === 10 ? digits : '';
  }

  function validatePhone(value) {
    if (!value.trim()) return 'Please enter your mobile phone number.';
    var digits = usPhoneDigits(value);
    // NANP rule: area code and exchange cannot start with 0 or 1
    if (!digits || !/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) {
      return 'Please enter a valid 10 digit U.S. phone number, like (555) 234-5678.';
    }
    return '';
  }

  function formatPhone(value) {
    var digits = value.replace(/\D/g, '');
    if (digits.length > 10 && digits.charAt(0) === '1') digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length < 4) return '(' + digits;
    if (digits.length < 7) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  /**
   * Sends the application to your backend.
   *
   * To connect the form, set CONFIG.formEndpoint at the top of this file.
   * The endpoint receives a JSON POST like:
   *   { "fullName": "...", "email": "...", "phone": "+15552345678", "consent": true, "page": "/" }
   * It should answer with any 2xx status on success.
   *
   * Applicant details are only held in memory for this request. They are never
   * written to localStorage, sessionStorage, cookies, or the URL.
   *
   * @param {Object} payload
   * @returns {Promise<{demo: boolean}>}
   */
  function submitApplication(payload) {
    if (!CONFIG.formEndpoint) {
      // Demo mode: pretend to wait, then report clearly that nothing was sent.
      return new Promise(function (resolve) {
        window.setTimeout(function () { resolve({ demo: true }); }, 700);
      });
    }

    return window.fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin'
    }).then(function (response) {
      if (!response.ok) throw new Error('Request failed with status ' + response.status);
      return { demo: false };
    });
  }

  function initForm() {
    var form = $('#application-form');
    if (!form) return;

    var status = $('#form-status');
    var submitBtn = $('#submit-btn');
    var label = $('.btn__label', submitBtn);
    var defaultLabel = label.textContent;

    var fields = {
      name:    { input: $('#full-name'), error: $('#full-name-error'), check: function (f) { return validateName(f.input.value); } },
      email:   { input: $('#email'),     error: $('#email-error'),     check: function (f) { return validateEmail(f.input.value); } },
      phone:   { input: $('#phone'),     error: $('#phone-error'),     check: function (f) { return validatePhone(f.input.value); } },
      consent: { input: $('#consent'),   error: $('#consent-error'),   check: function (f) { return f.input.checked ? '' : 'Please check the box so we know we can contact you.'; } }
    };

    function showError(field, message) {
      field.error.textContent = message;
      field.error.hidden = !message;
      if (message) field.input.setAttribute('aria-invalid', 'true');
      else field.input.removeAttribute('aria-invalid');
    }

    function validateField(field) {
      var message = field.check(field);
      showError(field, message);
      return !message;
    }

    function showStatus(type, message) {
      status.className = 'form__status form__status--' + type;
      status.textContent = message;
      status.hidden = false;
    }

    function setLoading(loading) {
      submitBtn.classList.toggle('is-loading', loading);
      submitBtn.disabled = loading;
      submitBtn.setAttribute('aria-busy', String(loading));
      label.textContent = loading ? 'Submitting\u2026' : defaultLabel;
    }

    Object.keys(fields).forEach(function (key) {
      var field = fields[key];
      var eventName = key === 'consent' ? 'change' : 'blur';

      // Validate when leaving a field, then re-check live once an error is showing
      field.input.addEventListener(eventName, function () { validateField(field); });
      field.input.addEventListener('input', function () {
        if (field.input.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    // Friendly (555) 123-4567 formatting while typing (skipped while deleting)
    fields.phone.input.addEventListener('input', function (event) {
      if (event.inputType && event.inputType.indexOf('delete') === 0) return;
      fields.phone.input.value = formatPhone(fields.phone.input.value);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.hidden = true;

      // Bots tend to fill the hidden honeypot field. Quietly do nothing.
      if ($('#website').value) return;

      var firstInvalid = null;
      Object.keys(fields).forEach(function (key) {
        if (!validateField(fields[key]) && !firstInvalid) firstInvalid = fields[key].input;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        showStatus('error', 'Please fix the highlighted fields and try again.');
        return;
      }

      var payload = {
        fullName: fields.name.input.value.trim(),
        email: fields.email.input.value.trim(),
        phone: '+1' + usPhoneDigits(fields.phone.input.value),
        consent: true,
        page: window.location.pathname
      };

      setLoading(true);

      submitApplication(payload)
        .then(function (result) {
          if (result.demo) {
            // Not a real submission. Keep the entries so the form can be tested.
            showStatus('demo', 'Thanks. Your details look complete, but this form is not connected yet, so nothing was sent.');
          } else {
            window.location.href = 'thank-you/';
          }
        })
        .catch(function () {
          showStatus('error', 'Sorry, something went wrong and your application was not sent. Please try again in a moment.');
        })
        .then(function () { setLoading(false); });
    });
  }

  /* ---------- 7. Reveal animations and back to top ---------- */
  function initReveal() {
    var items = $all('.reveal');
    if (!items.length) return;

    // Stagger siblings inside [data-stagger] containers
    $all('[data-stagger]').forEach(function (group) {
      $all('.reveal', group).forEach(function (el, i) {
        el.style.setProperty('--reveal-delay', (i * 0.09).toFixed(2) + 's');
      });
    });

    function finish(el) {
      // Once shown, drop the reveal styles so hover effects and transitions behave normally
      window.setTimeout(function () {
        el.classList.remove('reveal', 'is-visible');
        el.style.removeProperty('--reveal-delay');
      }, 1200);
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); finish(el); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
        finish(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  function initBackToTop() {
    var button = $('.to-top');
    if (!button) return;

    var visible = false;
    function onScroll() {
      var show = window.scrollY > 900;
      if (show === visible) return;
      visible = show;
      if (show) {
        button.hidden = false;
        window.requestAnimationFrame(function () { button.classList.add('is-visible'); });
      } else {
        button.classList.remove('is-visible');
        window.setTimeout(function () { if (!visible) button.hidden = true; }, 250);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      var top = document.getElementById('top');
      if (top) { top.setAttribute('tabindex', '-1'); top.focus({ preventScroll: true }); }
    });
  }

  /* ---------- 8. Story filters and show more ---------- */
  function initStories() {
    var grid = document.getElementById('gGrid');
    var moreBtn = document.getElementById('moreBtn');
    if (!grid || !moreBtn) return;

    var cards = $all('.gcard', grid);
    var chips = $all('#stories .chip');
    var filter = 'all';
    var open = false;

    function render() {
      cards.forEach(function (card) {
        var stars = Number(card.getAttribute('data-s'));
        var match = filter === 'all' || (filter === 'low' ? stars <= 3 : stars === Number(filter));
        card.hidden = !match;
        card.classList.toggle('show', open || filter !== 'all');
      });
      moreBtn.parentElement.hidden = filter !== 'all';
      moreBtn.textContent = open ? 'Show fewer reviews' : 'Show more reviews';
      moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (item) { item.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        filter = chip.getAttribute('data-f');
        render();
      });
    });

    moreBtn.addEventListener('click', function () {
      open = !open;
      render();
      if (!open) grid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    render();
  }

  /* ---------- Start ---------- */
  initHeader();
  initCalculator();
  initFaq();
  initForm();
  initReveal();
  initBackToTop();
  initStories();
})();
