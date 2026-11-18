/* Ithaca Games: shared behaviour for every page. */
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function renderNews() {
    var list = document.getElementById('posts');
    if (!list || list.children.length) return;
    var posts = (window.ITHACA_NEWS || []).slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    var limit = parseInt(list.getAttribute('data-limit'), 10);
    if (limit) posts = posts.slice(0, limit);
    var fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

    if (!posts.length) list.appendChild(el('li', 'post empty', 'No news yet. Check back soon.'));

    posts.forEach(function (p) {
      var li = el('li', 'post');
      var day = new Date(p.date + 'T00:00:00Z');
      var time = el('time', '', isNaN(day) ? p.date : fmt.format(day));
      time.setAttribute('datetime', p.date);
      li.appendChild(time);

      var body = el('div');
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

      if (p.image) {
        var img = el('img');
        img.src = p.image;
        img.alt = '';
        img.loading = 'lazy';
        img.width = 168;
        img.height = 168;
        li.appendChild(img);
      }
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

  function init() {
    renderNews();
    setUpTrailer();
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
