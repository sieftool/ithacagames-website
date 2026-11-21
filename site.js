/* Ithaca Games: shared behaviour for every page. */
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  /* A short fingerprint of the posts on show. It changes whenever a post is added, removed or edited. */
  function newsStamp(posts) {
    var s = JSON.stringify(posts.map(function (p) {
      return [p.date, p.title, p.text, p.link, p.linkLabel, p.image];
    }));
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return posts.length + '-' + h.toString(36);
  }

  /* News: one card per post, newest first. A post without a picture shows the studio mark.
     news.html already holds the cards as plain HTML, so they can be read without this script.
     While that copy matches news.js it is left alone; once news.js changes, the cards are redrawn from it. */
  function renderNews() {
    var list = document.getElementById('posts');
    if (!list) return;
    if (!window.ITHACA_NEWS && list.children.length) return;   // news.js did not load: keep the copy
    var posts = (window.ITHACA_NEWS || []).slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    var limit = parseInt(list.getAttribute('data-limit'), 10);
    if (limit) posts = posts.slice(0, limit);
    var stamp = newsStamp(posts);
    if (list.children.length && list.getAttribute('data-stamp') === stamp) return;
    list.textContent = '';
    list.setAttribute('data-stamp', stamp);
    var fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

    if (!posts.length) list.appendChild(el('li', 'post empty', 'No news yet. Check back soon.'));

    posts.forEach(function (p) {
      var li = el('li', 'post');

      var media = el('div', 'post-media');
      if (p.image) {
        var img = el('img');
        img.src = p.image;
        img.alt = '';
        img.loading = 'lazy';
        media.appendChild(img);
      }
      li.appendChild(media);

      var body = el('div', 'post-body');
      var day = new Date(p.date + 'T00:00:00Z');
      var time = el('time', '', isNaN(day) ? p.date : fmt.format(day));
      time.setAttribute('datetime', p.date);
      body.appendChild(time);
      body.appendChild(el('h3', '', p.title));
      String(p.text || '').split(/\n\s*\n/).forEach(function (para) {
        if (para.trim()) body.appendChild(el('p', '', para.trim()));
      });
      if (p.link) {
        var a = el('a', 'more', p.linkLabel || 'Read more');
        a.href = p.link;
        a.rel = 'noopener';
        body.appendChild(a);
      }
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  var framed = true;
  try { framed = window.self !== window.top; } catch (e) {}

  /* Trailer: on the live site the video plays in place; anywhere it cannot, the link opens YouTube. */
  function setUpTrailer() {
    var trailer = document.querySelector('.trailer-link');
    if (!trailer || framed || !/^https?:$/.test(location.protocol)) return;
    trailer.addEventListener('click', function (ev) {
      ev.preventDefault();
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + trailer.getAttribute('data-video') + '?autoplay=1&rel=0';
      frame.title = 'Assertion: The Three Kingdoms trailer';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      trailer.parentNode.replaceChild(frame, trailer);
    });
  }

  /* Touch screens have no hover. There, whatever sits on the middle of the screen is lifted the way a
     pointer would lift it, and a finished tap pops the button, icon, link or card that was tapped.
     The looks are in styles.css (.is-focus, .is-pop); this only adds and removes those two classes. */
  var refreshMotion = (function () {
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    if (!mq('(hover:none),(pointer:coarse)') || mq('(prefers-reduced-motion:reduce)')) return null;
    if (!window.requestAnimationFrame || !document.documentElement.closest) return null;

    var CARDS = '.post:not(.empty),.paths li,.part .shot,.kingdom,.boxshot img';
    var FOCUS = CARDS + ',.trailer-link';
    var TAP = '.btn,.follow a,.site-footer li a.with-ico,.site-nav a:not(.btn),' + CARDS;

    var waiting = false;
    function request() {
      if (waiting) return;
      waiting = true;
      window.requestAnimationFrame(frame);
    }
    function frame() {
      waiting = false;
      var head = document.querySelector('.site-header');
      var top = head ? Math.max(0, head.getBoundingClientRect().bottom) : 0;
      var mid = (top + window.innerHeight) / 2;   // the middle of what shows below the header
      var items = Array.prototype.slice.call(document.querySelectorAll(FOCUS));
      var rects = items.map(function (n) { return n.getBoundingClientRect(); });
      items.forEach(function (n, i) {
        var r = rects[i];
        if (!r.width && !r.height) return;
        var has = n.classList.contains('is-focus');
        /* a lifted card sits a few pixels higher than at rest, so it gets that much slack before it lets go */
        var hit = r.top <= mid && r.bottom + (has ? 8 : 0) >= mid;
        if (hit !== has) n.classList.toggle('is-focus', hit);
      });
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('load', request);

    /* a tap, not a scroll: the finger comes up close to where it went down, and soon */
    var down = null;
    document.addEventListener('pointerdown', function (ev) {
      down = ev.pointerType === 'mouse' ? null : { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: Date.now() };
    }, { passive: true });
    document.addEventListener('pointercancel', function () { down = null; }, { passive: true });
    document.addEventListener('pointerup', function (ev) {
      var d = down;
      down = null;
      if (!d || d.id !== ev.pointerId) return;
      if (Math.abs(ev.clientX - d.x) > 12 || Math.abs(ev.clientY - d.y) > 12 || Date.now() - d.t > 700) return;
      var n = ev.target && ev.target.closest ? ev.target.closest(TAP) : null;
      if (!n) return;
      n.classList.remove('is-pop');
      void n.offsetWidth;   // restart the pop if it was still running
      n.classList.add('is-pop');
    }, { passive: true });
    document.addEventListener('animationend', function (ev) {
      if (String(ev.animationName).indexOf('tap-') !== 0) return;
      var n = ev.target.closest ? ev.target.closest('.is-pop') : null;
      if (n) n.classList.remove('is-pop');
    });

    return request;
  })();

  function init() {
    renderNews();
    setUpTrailer();
    if (refreshMotion) refreshMotion();
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }
  init();

  /* When the site is shown inside a preview frame, moving between pages by a normal
     link may be blocked, so the next page is fetched and swapped in. On the live site
     this block does nothing and every link is an ordinary page load. */
  if (framed && window.fetch && window.DOMParser) {
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!/^[a-z0-9-]+\.html(#[\w-]*)?$/i.test(href)) return;
      ev.preventDefault();
      var parts = href.split('#');
      fetch(parts[0]).then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.text();
      }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        ['.site-header', 'main', '.site-footer'].forEach(function (sel) {
          var from = doc.querySelector(sel), to = document.querySelector(sel);
          if (from && to) to.innerHTML = from.innerHTML;
        });
        document.title = doc.title;
        init();
        var target = parts[1] ? document.getElementById(parts[1]) : null;
        if (target) target.scrollIntoView();
        else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }).catch(function () { location.href = href; });
    });
  }
})();
