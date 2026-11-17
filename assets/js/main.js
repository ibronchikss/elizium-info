
(function () {
  "use strict";

  var SERVER_IP = "vanillatech.site";
  var STATUS_URL = "https://api.mcsrvstat.us/3/" + SERVER_IP;
  var STATUS_REFRESH_MS = 5 * 60 * 1000;

  function norm(text) {
    return (text || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    siteHeader.classList.add("is-scrolled");
  }

  var rootEl = document.documentElement;
  if (rootEl.classList.contains("first-visit")) {
    var revealHeader = function () {
      rootEl.classList.remove("first-visit");
      try { localStorage.setItem("astrum-nav-seen", "1"); } catch (err) {  }
      window.removeEventListener("scroll", onFirstScroll);
      window.removeEventListener("keydown", revealHeader);
      window.removeEventListener("focusin", revealHeader);
    };
    var onFirstScroll = function () {
      if ((window.pageYOffset || rootEl.scrollTop || 0) > 40) revealHeader();
    };
    window.addEventListener("scroll", onFirstScroll, { passive: true });
    window.addEventListener("keydown", revealHeader);
    window.addEventListener("focusin", revealHeader);
    onFirstScroll();

    if (rootEl.scrollHeight <= window.innerHeight + 40) revealHeader();
  }

  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".main-nav");
  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    });
    var closeMenu = function () {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    };
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !nav.contains(e.target) && !menuButton.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        closeMenu();
        menuButton.focus();
      }
    });
  }

  var themeButton = document.querySelector(".theme-toggle");
  if (themeButton) {
    var htmlRoot = document.documentElement;
    var currentTheme = function () {
      return htmlRoot.getAttribute("data-theme") === "light" ? "light" : "dark";
    };
    var syncThemeButton = function () {
      var light = currentTheme() === "light";
      themeButton.setAttribute("aria-pressed", light ? "true" : "false");
      themeButton.title = light ? "Включить тёмную тему" : "Включить светлую тему";
    };
    var animTimer = null;
    themeButton.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      htmlRoot.classList.add("theme-anim");
      htmlRoot.setAttribute("data-theme", next);
      try { localStorage.setItem("astrum-theme", next); } catch (err) {  }
      syncThemeButton();
      clearTimeout(animTimer);
      animTimer = setTimeout(function () { htmlRoot.classList.remove("theme-anim"); }, 450);
    });
    syncThemeButton();
  }

  var playButton = document.querySelector(".hero-actions .button.primary");
  var startSection = document.getElementById("start");
  if (playButton && startSection) {
    playButton.addEventListener("click", function () {
      startSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  var addressButton = document.querySelector("[data-copy-ip]");
  if (addressButton) {
    var label = addressButton.querySelector("small");
    var originalLabel = label ? label.textContent : "";
    var resetTimer = null;

    var showCopied = function (text) {
      if (!label) return;
      label.textContent = text;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        label.textContent = originalLabel;
      }, 1800);
    };

    var fallbackCopy = function () {
      var area = document.createElement("textarea");
      area.value = SERVER_IP;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      return ok;
    };

    addressButton.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(SERVER_IP).then(
          function () { showCopied("СКОПИРОВАНО"); },
          function () { showCopied(fallbackCopy() ? "СКОПИРОВАНО" : "НЕ УДАЛОСЬ"); }
        );
      } else {
        showCopied(fallbackCopy() ? "СКОПИРОВАНО" : "НЕ УДАЛОСЬ");
      }
    });
  }

  var dot = document.querySelector(".server-status-dot");
  var counter = document.querySelector(".server-online");

  var onlineNum = document.querySelector("[data-online-num]");

  function setStatus(state, text, num) {
    if (dot) dot.className = "server-status-dot is-" + state;
    if (counter) counter.textContent = text;
    if (onlineNum) onlineNum.textContent = num;
  }

  function loadStatus() {
    fetch(STATUS_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        if (data && data.online) {
          var players = data.players && typeof data.players.online === "number" ? data.players.online : 0;
          setStatus("online", players === 1 ? "игрок онлайн" : "игроков онлайн", players);
        } else {
          setStatus("unavailable", "сервер оффлайн", "0");
        }
      })
      .catch(function () {
        setStatus("unavailable", "статус недоступен", "—");
      });
  }

  if (dot && counter) {
    loadStatus();
    setInterval(loadStatus, STATUS_REFRESH_MS);
  }

  var faqSection = document.querySelector(".faq");
  if (faqSection) {
    var showFaq = function () { faqSection.classList.add("faq-in"); };
    var reduceFaq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceFaq || !("IntersectionObserver" in window)) {
      showFaq();
    } else {
      faqSection.classList.add("faq-ready");
      var faqObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          showFaq();
          faqObserver.disconnect();
        }
      }, { threshold: 0.2 });
      faqObserver.observe(faqSection);
    }
  }

  var rulesInput = document.querySelector(".rules-search input");
  var rulesContent = document.querySelector(".rules-content");
  if (rulesInput && rulesContent) {
    var articles = Array.prototype.slice.call(rulesContent.querySelectorAll("article"));
    var rulesHighlights = document.querySelector(".rule-highlights");
    var punishButtons = Array.prototype.slice.call(document.querySelectorAll(".rule-filter"));
    var punishReset = document.querySelector(".rule-filter-reset");
    var punishCount = document.querySelector(".rule-filter-count");
    var activePunish = "";
    var tocLinks = {};
    Array.prototype.forEach.call(document.querySelectorAll(".rules-toc a"), function (link) {
      tocLinks[link.getAttribute("href").slice(1)] = link;
    });
    var emptyRules = el("p", "empty", "По вашему запросу ничего не найдено.");
    emptyRules.hidden = true;
    rulesContent.insertBefore(emptyRules, rulesContent.querySelector(".info-panel"));

    var applyRules = function () {
      var query = norm(rulesInput.value);
      var shown = 0;
      var matched = 0;
      var filtering = !!query || !!activePunish;
      if (rulesHighlights) rulesHighlights.hidden = filtering;
      articles.forEach(function (article) {
        var units = Array.prototype.slice.call(article.querySelectorAll("[data-item]"));
        var titleHit = !!query && norm(article.querySelector("h2").textContent).indexOf(query) !== -1;
        var any = false;
        units.forEach(function (unit) {
          var textHit = !query || titleHit || norm(unit.textContent).indexOf(query) !== -1;
          var punishHit = !activePunish || !!unit.querySelector(".rule-chip." + activePunish);
          var hit = textHit && punishHit;
          unit.hidden = !hit;
          if (hit) { any = true; matched += 1; }
        });

        var visible = !filtering || any;
        article.hidden = !visible;
        if (tocLinks[article.id]) tocLinks[article.id].hidden = !visible;
        if (visible) shown += 1;
      });

      var billsHead = rulesContent.querySelector(".bills-head");
      if (billsHead) billsHead.hidden = filtering && !rulesContent.querySelector("article.bill:not([hidden])");
      emptyRules.hidden = shown !== 0;
      punishButtons.forEach(function (button) {
        var on = button.getAttribute("data-punish") === activePunish;
        button.classList.toggle("is-active", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (punishReset) punishReset.hidden = !activePunish;
      if (punishCount) {
        punishCount.hidden = !activePunish;
        punishCount.textContent = activePunish ? "Найдено правил: " + matched : "";
      }
    };

    rulesInput.addEventListener("input", applyRules);
    punishButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-punish");
        activePunish = activePunish === value ? "" : value;
        applyRules();
      });
    });
    if (punishReset) {
      punishReset.addEventListener("click", function () {
        activePunish = "";
        applyRules();
      });
    }

    var spyTick = false;
    var spyUpdate = function () {
      spyTick = false;
      var line = 260;
      var current = null;
      var atBottom = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 4;
      var visible = articles.filter(function (article) { return !article.hidden; });
      visible.forEach(function (article) {
        if (article.getBoundingClientRect().top <= line) current = article;
      });
      if (atBottom && visible.length) current = visible[visible.length - 1];
      Object.keys(tocLinks).forEach(function (id) {
        tocLinks[id].classList.toggle("is-active", !!current && id === current.id);
      });
    };
    window.addEventListener("scroll", function () {
      if (!spyTick) { spyTick = true; window.requestAnimationFrame(spyUpdate); }
    }, { passive: true });
    window.addEventListener("resize", spyUpdate);
    spyUpdate();
  }

  var shopGrid = document.querySelector(".product-grid");
  if (shopGrid) {
    var STORE_URL = "https://shop.astrums.pro/";
    var cards = Array.prototype.slice.call(shopGrid.querySelectorAll(".product-card"));
    var shopInput = document.querySelector(".shop-toolbar .search input");
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".shop-tab"));
    var emptyShop = el("p", "empty", "Ничего не найдено.");
    emptyShop.hidden = true;
    shopGrid.parentNode.insertBefore(emptyShop, shopGrid.nextSibling);

    var haystack = {};
    cards.forEach(function (card) {
      var tpl = document.getElementById("product-" + card.getAttribute("data-product"));
      haystack[card.getAttribute("data-product")] = norm(card.textContent + " " + (tpl ? tpl.content.textContent : ""));
    });

    var activeFilter = "all";
    var applyShopFilters = function () {
      var query = norm(shopInput ? shopInput.value : "");
      var shown = 0;
      cards.forEach(function (card) {
        var inCategory = activeFilter === "all" || card.getAttribute("data-category") === activeFilter;
        var matches = !query || haystack[card.getAttribute("data-product")].indexOf(query) !== -1;
        card.hidden = !(inCategory && matches);
        if (inCategory && matches) shown += 1;
      });
      emptyShop.hidden = shown !== 0;
    };

    if (shopInput) shopInput.addEventListener("input", applyShopFilters);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activeFilter = tab.getAttribute("data-filter");
        tabs.forEach(function (other) {
          var on = other === tab;
          other.classList.toggle("is-active", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
        applyShopFilters();
      });
    });

    var modalRoot = null;
    var modalOpener = null;

    var closeModal = function () {
      if (!modalRoot) return;
      document.body.removeChild(modalRoot);
      modalRoot = null;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onModalKey);
      if (modalOpener) modalOpener.focus();
    };

    var onModalKey = function (e) {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "Tab" && modalRoot) {
        var items = modalRoot.querySelectorAll("button, a[href]");
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    var openModal = function (card) {
      var template = document.getElementById("product-" + card.getAttribute("data-product"));
      var cardImage = card.querySelector(".product-art img");
      var priceText = card.getAttribute("data-price");

      var backdrop = el("div", "modal-backdrop");
      var modal = el("div", "modal is-product");
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");

      var close = el("button", "modal-close", "✕");
      close.type = "button";
      close.setAttribute("aria-label", "Закрыть");

      var head = el("div", "modal-head");
      if (cardImage) {
        var thumb = el("span", "modal-thumb");
        var thumbImage = el("img");
        thumbImage.src = cardImage.getAttribute("src");
        thumbImage.alt = "";
        thumb.appendChild(thumbImage);
        head.appendChild(thumb);
      }
      var titleBox = el("div");
      var title = el("h2", "", card.querySelector(".product-name").textContent);
      title.id = "product-modal-title";
      modal.setAttribute("aria-labelledby", title.id);
      titleBox.appendChild(el("span", "eyebrow", card.querySelector(".product-type").textContent));
      titleBox.appendChild(title);
      head.appendChild(titleBox);

      var price = el("div", "modal-price" + (priceText ? "" : " is-muted"), priceText || "Цена — в магазине");

      var body = el("div", "modal-body");
      if (template) body.appendChild(template.content.cloneNode(true));

      var note = el("p", "subtle-note", "Оплата и выдача — в магазине shop.astrums.pro");
      var cta = el("a", "button primary", "Купить в магазине");
      cta.href = STORE_URL;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";

      modal.appendChild(close);
      modal.appendChild(head);
      modal.appendChild(price);
      modal.appendChild(body);
      modal.appendChild(note);
      modal.appendChild(cta);
      backdrop.appendChild(modal);

      backdrop.addEventListener("mousedown", function (e) {
        if (e.target === backdrop) closeModal();
      });
      close.addEventListener("click", closeModal);

      modalOpener = card;
      modalRoot = backdrop;
      document.body.appendChild(backdrop);
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onModalKey);
      close.focus();
    };

    cards.forEach(function (card) {
      card.addEventListener("click", function () { openModal(card); });
    });
  }

  var phoneQuery = window.matchMedia("(max-width: 760px)");
  var tocBlocks = Array.prototype.slice.call(document.querySelectorAll(".rules-toc"));
  var setToc = function (toc, collapsed) {
    toc.classList.toggle("toc-collapsed", collapsed);
    var head = toc.querySelector(".eyebrow");
    if (head) head.setAttribute("aria-expanded", collapsed ? "false" : "true");
  };
  tocBlocks.forEach(function (toc) {
    var head = toc.querySelector(".eyebrow");
    if (!head) return;
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");
    var toggle = function () {
      if (phoneQuery.matches) setToc(toc, !toc.classList.contains("toc-collapsed"));
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
    toc.addEventListener("click", function (e) {
      if (phoneQuery.matches && e.target.closest("a")) setToc(toc, true);
    });
  });
  var syncToc = function () {
    tocBlocks.forEach(function (toc) { setToc(toc, phoneQuery.matches); });
  };
  syncToc();
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", syncToc);
  else if (phoneQuery.addListener) phoneQuery.addListener(syncToc);

  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Наверх");
  toTop.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"></path></svg>';
  document.body.appendChild(toTop);
  var topTicking = false;
  var updateToTop = function () {
    topTicking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    toTop.classList.toggle("is-visible", y > 700);
  };
  window.addEventListener("scroll", function () {
    if (!topTicking) { topTicking = true; window.requestAnimationFrame(updateToTop); }
  }, { passive: true });
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  updateToTop();
})();

(function () {
  var input = document.getElementById("qa-search");
  if (!input) return;
  var items = Array.prototype.slice.call(document.querySelectorAll(".qa-item"));
  var groups = Array.prototype.slice.call(document.querySelectorAll(".qa-group"));
  var empty = document.getElementById("qa-empty");
  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (item) {
      var match = !q || item.textContent.toLowerCase().indexOf(q) !== -1;
      item.hidden = !match;
      if (match) shown++;
      if (q && match) item.open = true;
    });
    groups.forEach(function (g) {
      g.hidden = !g.querySelector(".qa-item:not([hidden])");
    });
    if (empty) empty.hidden = shown > 0;
  });
})();

(function () {
  var box = document.querySelector("[data-video]");
  if (!box) return;
  var id = box.getAttribute("data-video");
  var poster = box.querySelector(".hz-poster");
  if (poster) {
    var tried = 0;
    var onFail = function () {
      tried++;
      if (tried === 1) poster.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
      else poster.style.display = "none";
    };
    poster.addEventListener("error", onFail);
    if (poster.complete && poster.naturalWidth === 0) onFail();
    poster.addEventListener("load", function () {
      if (poster.naturalWidth <= 120) onFail();
    });
  }
  box.addEventListener("click", function (e) {
    e.preventDefault();
    var frame = document.createElement("iframe");
    frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1";
    frame.title = "Видео о сервере";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.className = "hz-frame";
    box.replaceWith(frame);
  });
})();

(function () {
  var cards = document.querySelectorAll(".hq-card");
  Array.prototype.forEach.call(cards, function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
})();
