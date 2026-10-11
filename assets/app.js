/* AirviewTR: menu, reveal, hero video, hover previews, filters, film lightbox, photo preview, WhatsApp brief. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '905013466560';
  const W = window.WORKS || [];
  const byId = Object.fromEntries(W.map(w => [w.id, w]));

  const burger = $('.burger');
  const setMenu = open => { document.body.classList.toggle('menu-open', open); burger && burger.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; };
  burger && burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.overlay a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  /* hero + section loops */
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !reduce) v.play().catch(() => {}); else v.pause(); }), { threshold: .2 });
  $$('video[data-autoplay]').forEach(v => { v.muted = true; v.playsInline = true; if (!reduce) vio.observe(v); });
  const mb = $('.mute-btn');
  mb && mb.addEventListener('click', () => { const v = $('.hero video'); v.muted = !v.muted; if (!v.muted) { v.currentTime = 0; v.play(); } mb.innerHTML = v.muted ? '<i class="ph ph-speaker-slash"></i>' : '<i class="ph ph-speaker-high"></i>'; mb.setAttribute('aria-label', v.muted ? 'Sesi aç' : 'Sesi kapat'); });

  /* work previews: hover on desktop, in view on touch */
  const touch = matchMedia('(hover: none)').matches;
  const cio = new IntersectionObserver(es => es.forEach(e => { const c = e.target, v = $('video', c); if (!v) return; if (e.isIntersecting && e.intersectionRatio > .6) { if (!v.src) v.src = v.dataset.src; v.play().then(() => c.classList.add('playing')).catch(() => {}); } else { v.pause(); c.classList.remove('playing'); } }), { threshold: [0, .6] });
  $$('.work').forEach(c => {
    const v = $('video', c); if (!v || reduce) return;
    if (touch) { cio.observe(c); return; }
    c.addEventListener('mouseenter', () => { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().then(() => c.classList.add('playing')).catch(() => {}); });
    c.addEventListener('mouseleave', () => { v.pause(); c.classList.remove('playing'); });
  });

  /* filters */
  const fb = $$('[data-filter]');
  const apply = k => { fb.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === k))); $$('.grid .work').forEach(c => c.classList.toggle('hide', k !== 'all' && !c.dataset.cat.split(' ').includes(k))); };
  fb.forEach(b => b.addEventListener('click', () => { apply(b.dataset.filter); if ($('.page-isler')) history.replaceState(null, '', b.dataset.filter === 'all' ? location.pathname : '?k=' + b.dataset.filter); }));
  const qk = new URLSearchParams(location.search).get('k');
  if (fb.length && qk && fb.some(b => b.dataset.filter === qk)) apply(qk);

  /* lightbox */
  const lb = $('.lb'); let list = [], idx = 0, back = null;
  const show = i => {
    idx = (i + list.length) % list.length; const w = byId[list[idx]], v = $('video', lb);
    lb.classList.toggle('w', w.ar === 'w');
    v.poster = 'media/' + w.id + '.webp'; v.src = 'media/' + w.id + '.mp4'; v.play().catch(() => {});
    $('.cl', lb).textContent = w.client + ' × AirviewTR'; $('h2', lb).textContent = w.title; $('.ds', lb).textContent = w.desc; $('.pr', lb).textContent = (idx + 1) + ' / ' + list.length;
  };
  const open = id => { list = $$('.work:not(.hide)').map(c => c.dataset.work).filter((x, i, a) => a.indexOf(x) === i); if (!list.includes(id)) list = [id]; back = document.activeElement; lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; show(list.indexOf(id)); $('.x', lb).focus(); };
  const close = () => { if (!lb || !lb.classList.contains('open')) return; const v = $('video', lb); v.pause(); v.removeAttribute('src'); v.load(); lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; back && back.focus(); };
  $$('.work[data-work]').forEach(c => c.addEventListener('click', () => open(c.dataset.work)));
  if (lb) {
    $('.x', lb).addEventListener('click', close);
    $('[data-prev]', lb).addEventListener('click', () => show(idx - 1));
    $('[data-next]', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
    const h = location.hash.slice(1); if (byId[h]) open(h);
  }

  /* photo preview */
  const pv = $('.pv');
  if (pv) {
    const cl = () => { pv.classList.remove('open'); pv.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
    $$('[data-photo]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const im = $('img', pv); im.src = a.getAttribute('href'); im.alt = $('img', a).alt; pv.classList.add('open'); pv.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; $('.x', pv).focus(); }));
    $('.x', pv).addEventListener('click', cl); pv.addEventListener('click', e => { if (e.target === pv) cl(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pv.classList.contains('open')) cl(); });
  }

  /* brief form -> WhatsApp */
  const form = $('form[data-brief]');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault(); let ok = true;
      $$('[required]', form).forEach(el => { const f = el.closest('.fld'); const bad = !el.value.trim() || (el.type === 'tel' && el.value.replace(/\D/g, '').length < 10); f.classList.toggle('invalid', bad); if (bad && ok) { el.focus(); ok = false; } });
      if (!ok) return;
      const v = id => ($('#' + id, form).value || '').trim();
      const need = $$('input[name=need]:checked', form).map(i => i.value);
      const text = ['Merhaba AirviewTR, bir proje için teklif almak istiyorum.', '', `Ad soyad: ${v('f-name')}`, `Firma: ${v('f-firm')}`, `Telefon: ${v('f-tel')}`, need.length ? `İhtiyaç: ${need.join(', ')}` : '', v('f-where') ? `Çekim yeri: ${v('f-where')}` : '', v('f-when') ? `Tarih: ${v('f-when')}` : '', '', v('f-msg')].filter((l, i, a) => l !== '' || (a[i - 1] && a[i - 1] !== '')).join('\n').trim();
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      const o = $('.ok', form); o.textContent = 'Talebiniz WhatsApp\'ta hazır; göndermeniz yeterli. En kısa sürede dönüş yapıyoruz.'; o.classList.add('show');
    });
    $$('input,textarea', form).forEach(el => el.addEventListener('input', () => el.closest('.fld') && el.closest('.fld').classList.remove('invalid')));
  }
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
