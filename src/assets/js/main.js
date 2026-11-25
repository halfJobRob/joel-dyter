// Joel Dyter Cabinet Maker: small progressive enhancements. The site works without this file.
(function () {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const demoHosts = ["github.io", "localhost", "127.0.0.1"];
  const isDemo = demoHosts.some((h) => location.hostname.includes(h));

  // Header shadow on scroll
  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Mobile nav
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    });
  }
  $$("[data-sub-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest(".has-sub");
      const open = !li.classList.contains("is-open");
      li.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", (e) => {
    $$(".has-sub.is-open").forEach((li) => {
      if (!li.contains(e.target) && window.innerWidth >= 1000) {
        li.classList.remove("is-open");
        $("[data-sub-toggle]", li).setAttribute("aria-expanded", "false");
      }
    });
  });

  // Reviews marquee: duplicate the list so the loop is seamless
  $$("[data-marquee]").forEach((m) => {
    if (reduceMotion) return;
    const track = $(".marquee__track", m);
    const items = $$(":scope > li", track);
    items.forEach((li) => {
      const clone = li.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
    // Roughly 45px per second, so long and short lists feel the same
    requestAnimationFrame(() => {
      const seconds = Math.max(30, track.scrollWidth / 2 / 45);
      m.style.setProperty("--marquee-duration", seconds + "s");
      m.classList.add("is-animated");
    });
    m.addEventListener("touchstart", () => m.classList.add("is-paused"), { passive: true });
    m.addEventListener("touchend", () => setTimeout(() => m.classList.remove("is-paused"), 2500));
  });

  // Lightbox: each [data-gallery] (or the page) is a set
  const box = $("[data-lightbox]");
  if (box && typeof box.showModal === "function") {
    const img = $("[data-lightbox-img]", box);
    const cap = $("[data-lightbox-caption]", box);
    const count = $("[data-lightbox-count]", box);
    let set = [];
    let index = 0;

    const show = (i) => {
      index = (i + set.length) % set.length;
      const a = set[index];
      img.src = a.href;
      img.alt = a.querySelector("img")?.alt || "";
      cap.textContent = a.dataset.caption || img.alt;
      count.textContent = set.length > 1 ? `${index + 1} / ${set.length}` : "";
      $$(".lightbox__prev, .lightbox__next", box).forEach((b) => (b.hidden = set.length < 2));
    };

    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-lightbox-item]");
      if (!a) return;
      e.preventDefault();
      const group = a.closest("[data-gallery]") || document;
      set = $$("[data-lightbox-item]", group);
      show(set.indexOf(a));
      box.showModal();
    });
    $("[data-lightbox-close]", box).addEventListener("click", () => box.close());
    $("[data-lightbox-prev]", box).addEventListener("click", () => show(index - 1));
    $("[data-lightbox-next]", box).addEventListener("click", () => show(index + 1));
    box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    let startX = null;
    box.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
    box.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
    box.addEventListener("close", () => { img.removeAttribute("src"); });
  }

  // Drawing vs finished compare slider
  $$("[data-compare]").forEach((c) => {
    const range = $("[data-compare-range]", c);
    const set = () => c.style.setProperty("--pos", range.value + "%");
    range.addEventListener("input", set);
    set();
  });

  // Project filters
  const filters = $("[data-filters]");
  const list = $("[data-filter-list]");
  if (filters && list) {
    filters.hidden = false;
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      const f = btn.dataset.filter;
      $$("[data-filter]", filters).forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      $$(":scope > li", list).forEach((li) => (li.hidden = f !== "all" && li.dataset.category !== f));
    });
  }

  // Enquiry form
  const form = $("[data-enquiry-form]");
  if (form) {
    const status = $("[data-status]", form);
    const submit = $("[data-submit]", form);
    const fileInput = $("[data-file-input]", form);
    const fileHint = $("[data-file-hint]", form);
    const started = $("[data-started]", form);
    if (started) started.value = String(Math.floor(Date.now() / 1000));

    const MAX_FILES = 5;
    const MAX_TOTAL = 20 * 1024 * 1024;
    // Phone photos are shrunk in the browser before sending: a 10MB photo becomes
    // roughly 0.5–1MB at 2000px, which is plenty for Joel to see the room, keeps the
    // email small, and drops hidden photo data such as GPS location.
    const MAX_SIDE = 2000;
    const JPEG_QUALITY = 0.82;
    let prepared = null; // files to send, once shrunk
    let preparing = null; // promise while shrinking is in progress

    const shrink = async (file) => {
      if (!/^image\//.test(file.type) || file.type === "image/gif" || file.size < 600 * 1024) return file;
      try {
        let src;
        try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
        catch (e) {
          src = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });
        }
        const w = src.width, h = src.height;
        const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
        if (src.close) src.close();
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        if (!blob || blob.size >= file.size) return file;
        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
      } catch (e) {
        return file; // the browser can't read this format (e.g. HEIC outside Safari): send it as it is
      }
    };

    const sizeText = (n) => (n / 1048576).toFixed(1) + "MB";
    const checkFiles = () => {
      if (!fileInput) return true;
      const files = prepared || Array.from(fileInput.files);
      const total = files.reduce((n, f) => n + f.size, 0);
      if (files.length > MAX_FILES) { fileHint.textContent = `Please choose up to ${MAX_FILES} files.`; return false; }
      if (total > MAX_TOTAL) { fileHint.textContent = "Those files are over 20MB in total. Try fewer or smaller photos, or send them on WhatsApp."; return false; }
      fileHint.textContent = files.length ? `${files.length} file${files.length > 1 ? "s" : ""} attached (${sizeText(total)})` : "";
      return true;
    };

    fileInput?.addEventListener("change", () => {
      const files = Array.from(fileInput.files);
      prepared = null;
      if (files.length > MAX_FILES) { checkFiles(); return; }
      if (!files.length) { fileHint.textContent = ""; return; }
      fileHint.textContent = "Preparing photos…";
      const run = Promise.all(files.map(shrink)).then((out) => {
        if (preparing !== run) return; // a newer selection replaced this one
        prepared = out;
        preparing = null;
        checkFiles();
      });
      preparing = run;
    });

    const setStatus = (msg, kind) => {
      status.textContent = msg;
      status.className = "form__status" + (kind ? " is-" + kind : "");
    };

    const buildData = () => {
      const data = new FormData(form);
      if (fileInput && prepared) {
        data.delete(fileInput.name);
        prepared.forEach((f) => data.append(fileInput.name, f, f.name));
      }
      return data;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (preparing) { setStatus("Preparing photos…"); await preparing; setStatus(""); }
      if (!checkFiles()) return;
      if (isDemo) {
        setStatus("This is a preview, so the form isn't connected yet. On the live site this will email Joel. For now, please use WhatsApp or email.", "error");
        return;
      }
      submit.disabled = true;
      setStatus("Sending…");
      try {
        const res = await fetch(form.action, { method: "POST", body: buildData(), headers: { Accept: "application/json" } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const thanks = new URL("../thank-you/", location.href);
          location.href = thanks.href;
          return;
        }
        setStatus(data.error || "Sorry, something went wrong. Please try again, or WhatsApp or email Joel directly.", "error");
      } catch (err) {
        setStatus("Sorry, the message couldn't be sent. Please check your connection, or WhatsApp or email Joel directly.", "error");
      }
      submit.disabled = false;
    });
  }

  // Preview banner on the GitHub Pages demo
  if (location.hostname.endsWith("github.io")) {
    const b = document.createElement("div");
    b.className = "demo-banner";
    b.textContent = "Preview site: work in progress. Prices and some details are still to be confirmed.";
    document.body.prepend(b);
  }

  // Analytics only after consent
  const consent = $("[data-consent]");
  if (consent && window.GA_ID) {
    let choice = null;
    try { choice = localStorage.getItem("jd-consent"); } catch (e) {}
    const loadGA = () => {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(window.GA_ID);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", window.GA_ID, { anonymize_ip: true });
    };
    const save = (v) => { try { localStorage.setItem("jd-consent", v); } catch (e) {} consent.hidden = true; };
    if (choice === "yes") loadGA();
    else if (choice !== "no") consent.hidden = false;
    $("[data-consent-accept]", consent).addEventListener("click", () => { save("yes"); loadGA(); });
    $("[data-consent-decline]", consent).addEventListener("click", () => save("no"));
  }
})();
