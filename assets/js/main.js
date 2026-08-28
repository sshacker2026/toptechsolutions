/* =========================================================================
   TOP TECH SOLUTIONS — shared behaviour
   Theme + language preferences are saved to localStorage so they carry over
   when the person moves between pages (each page is a full navigation, not
   a single-page app, so this is the only way persistence works). Reading
   and writing is wrapped in try/catch and quietly falls back to
   this-page-only behaviour if storage is unavailable (private browsing,
   a sandboxed preview, etc).
   ========================================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var THEME_KEY = "tts-theme";
  var LANG_KEY = "tts-lang";

  function readStored(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStored(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignore — falls back to in-memory only */ }
  }

  /* ---------------- Theme toggle ---------------- */
  var themeToggle = document.getElementById("themeToggle");
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeToggle) themeToggle.setAttribute("aria-pressed", theme === "dark");
  }
  // A tiny inline script in <head> already applies any saved theme before first
  // paint (to avoid a flash of the wrong theme); this keeps the toggle's own
  // state and the persisted value in sync for browsers where that ran.
  var storedTheme = readStored(THEME_KEY);
  if (storedTheme === "dark" || storedTheme === "light") setTheme(storedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(current);
      writeStored(THEME_KEY, current);
    });
  }

  /* ---------------- Language toggle ---------------- */
  var langToggle = document.getElementById("langToggle");
  var langOptions = document.querySelectorAll(".lang-option");

  function applyLanguage(lang) {
    root.setAttribute("lang", lang);
    document.body.classList.toggle("lang-hi", lang === "hi");

    document.querySelectorAll("[data-en]").forEach(function (el) {
      var text = lang === "hi" ? el.getAttribute("data-hi") : el.getAttribute("data-en");
      if (text !== null) el.textContent = text;
    });

    document.querySelectorAll("[data-en-placeholder]").forEach(function (el) {
      var text = lang === "hi" ? el.getAttribute("data-hi-placeholder") : el.getAttribute("data-en-placeholder");
      if (text !== null) el.setAttribute("placeholder", text);
    });

    document.querySelectorAll("[data-en-aria]").forEach(function (el) {
      var text = lang === "hi" ? el.getAttribute("data-hi-aria") : el.getAttribute("data-en-aria");
      if (text !== null) el.setAttribute("aria-label", text);
    });

    langOptions.forEach(function (opt) {
      opt.classList.toggle("active", opt.getAttribute("data-lang") === lang);
    });
  }

  var storedLang = readStored(LANG_KEY);
  if (storedLang === "hi") applyLanguage("hi");

  if (langToggle) {
    langToggle.addEventListener("click", function () {
      var current = root.getAttribute("lang") === "hi" ? "en" : "hi";
      applyLanguage(current);
      writeStored(LANG_KEY, current);
    });
  }

  /* ---------------- Mobile nav ---------------- */
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mainNav.querySelectorAll(".nav-link, .nav-cta-mobile a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------------- Logo lightbox ----------------
     The header mark opens the full logo instead of navigating; the wordmark
     next to it still links home, so the usual "logo goes home" route stays. */
  var logoZoom = document.getElementById("logoZoom");
  var logoModal = document.getElementById("logoModal");
  if (logoZoom && logoModal) {
    var logoClose = document.getElementById("logoModalClose");
    var lastFocused = null;

    var openLogo = function () {
      lastFocused = document.activeElement;
      logoModal.hidden = false;
      document.body.style.overflow = "hidden";
      if (logoClose) logoClose.focus();
    };
    var closeLogo = function () {
      if (logoModal.hidden) return;
      logoModal.hidden = true;
      document.body.style.overflow = "";
      // A mouse click leaves focus on <body> in some browsers, so fall back to
      // the logo itself rather than dropping focus to the top of the page.
      var target = lastFocused && lastFocused !== document.body ? lastFocused : logoZoom;
      if (target && target.focus) target.focus();
    };

    logoZoom.addEventListener("click", openLogo);
    if (logoClose) logoClose.addEventListener("click", closeLogo);
    // Backdrop only — clicks on the panel itself must not close it.
    logoModal.addEventListener("click", function (e) {
      if (e.target === logoModal) closeLogo();
    });
    document.addEventListener("keydown", function (e) {
      if (logoModal.hidden) return;
      if (e.key === "Escape" || e.key === "Esc") closeLogo();
      // Close is the only focusable control in the dialog, so holding focus
      // on it is a complete trap.
      if (e.key === "Tab") e.preventDefault();
    });
  }

  /* ---------------- Header scroll shadow ---------------- */
  var header = document.getElementById("siteHeader");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Reveal on scroll ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------------- Testimonial carousel ---------------- */
  var track = document.querySelector(".testimonial-track");
  if (track) {
    var slides = track.querySelectorAll(".testimonial-slide");
    var dotsWrap = document.querySelector(".testimonial-dots");
    var prevBtn = document.querySelector(".tcarousel-btn.prev");
    var nextBtn = document.querySelector(".tcarousel-btn.next");
    var index = 0;
    var autoplayId;

    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.className = "tdot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to testimonial " + (i + 1));
      dot.addEventListener("click", function () { goTo(i); });
      if (dotsWrap) dotsWrap.appendChild(dot);
    });

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      if (dotsWrap) {
        dotsWrap.querySelectorAll(".tdot").forEach(function (d, di) {
          d.classList.toggle("active", di === index);
        });
      }
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1); restart(); });

    function restart() {
      clearInterval(autoplayId);
      if (!reduceMotion) autoplayId = setInterval(function () { goTo(index + 1); }, 6000);
    }
    restart();

    var viewport = document.querySelector(".testimonial-viewport");
    if (viewport) {
      viewport.addEventListener("mouseenter", function () { clearInterval(autoplayId); });
      viewport.addEventListener("mouseleave", restart);
    }
  }

  /* ---------------- Portfolio filter ---------------- */
  var filterTabs = document.querySelectorAll(".filter-tab");
  var projectItems = document.querySelectorAll(".project-item");
  if (filterTabs.length && projectItems.length) {
    filterTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        filterTabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var filter = tab.getAttribute("data-filter");
        projectItems.forEach(function (item) {
          var match = filter === "all" || item.getAttribute("data-category") === filter;
          item.classList.toggle("hidden", !match);
        });
      });
    });
  }

  /* ---------------- Contact form validation ---------------- */
  var form = document.getElementById("contactForm");
  if (form) {
    var successBox = document.getElementById("formSuccess");
    var errorBox = document.getElementById("formError");
    var submitBtn = form.querySelector("button[type='submit']");

    function showBanner(box) {
      if (!box) return;
      if (successBox) successBox.classList.remove("show");
      if (errorBox) errorBox.classList.remove("show");
      box.classList.add("show");
      box.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[data-required]").forEach(function (field) {
        var wrap = field.closest(".field");
        var ok = field.type === "checkbox" ? field.checked : field.value.trim().length > 0;
        if (field.type === "email" && ok) {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
        }
        if (wrap) wrap.classList.toggle("error", !ok);
        if (!ok) valid = false;
      });
      if (!valid) return;

      // The success banner must only appear once Web3Forms confirms delivery —
      // showing it optimistically would tell people we received an enquiry we
      // never actually got.
      var isHindi = root.getAttribute("lang") === "hi";
      var restoreLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.setAttribute("aria-busy", "true");
        submitBtn.textContent = isHindi ? "भेजा जा रहा है…" : "Sending…";
      }

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: new FormData(form)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.success) {
            form.reset();
            showBanner(successBox);
            setTimeout(function () { if (successBox) successBox.classList.remove("show"); }, 8000);
          } else {
            showBanner(errorBox);
          }
        })
        .catch(function () { showBanner(errorBox); })
        .finally(function () {
          if (submitBtn) {
            submitBtn.removeAttribute("aria-busy");
            // Re-read the label from data-* so a language switch mid-send still
            // restores the right text.
            var attr = root.getAttribute("lang") === "hi" ? "data-hi" : "data-en";
            submitBtn.textContent = submitBtn.getAttribute(attr) || restoreLabel;
          }
        });
    });
  }

  /* ---------------- Footer year ---------------- */
  document.querySelectorAll(".current-year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------- Newsletter (footer) fake submit ---------------- */
  var newsletterForms = document.querySelectorAll(".newsletter-form");
  newsletterForms.forEach(function (nf) {
    nf.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = nf.querySelector("button");
      var input = nf.querySelector("input");
      if (input && input.value.trim()) {
        var lang = root.getAttribute("lang");
        var original = btn.textContent;
        btn.textContent = lang === "hi" ? "हो गया!" : "Done!";
        input.value = "";
        setTimeout(function () { btn.textContent = original; }, 2200);
      }
    });
  });
})();
