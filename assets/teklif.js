/* AirviewTR teklif sihirbazı (/teklif-al). Port of the old Next.js QuoteWizard to vanilla JS:
   8 steps, sessionStorage state, ?adim=N, prefill ?hizmet= ?sektor= ?lokasyon=, live price estimate,
   submit -> formatted WhatsApp message (mailto fallback). Config comes from window.QUOTE (built by site.py). */
(() => {
  const Q = window.QUOTE; const root = document.querySelector('[data-wizard]');
  if (!Q || !root) return;
  const $ = (s, r = root) => r.querySelector(s), $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const KEY = 'av-teklif-v2';
  const STEPS = ['service', 'sector', 'location', 'need', 'extras', 'budget', 'date', 'contact'];
  const TITLES = Q.titles;
  let st = {};
  try { st = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { st = {}; }
  const qs = new URLSearchParams(location.search);
  if (qs.get('hizmet') && Q.services.some(s => s.key === qs.get('hizmet'))) st.service = qs.get('hizmet');
  if (qs.get('sektor') && Q.sectors.some(s => s.key === qs.get('sektor'))) st.sector = qs.get('sektor');
  if (qs.get('lokasyon') && Q.regions.some(s => s.key === qs.get('lokasyon'))) st.location = qs.get('lokasyon');
  if (qs.get('paket')) st.plan = qs.get('paket');
  st.extras = Array.isArray(st.extras) ? st.extras : [];
  let step = Math.min(Math.max(parseInt(qs.get('adim') || '1', 10) || 1, 1), 8);
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const fmt = n => n.toLocaleString('tr-TR') + ' TL';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const label = (list, key) => (list.find(o => o.key === key) || {}).title || '';

  function estimate() {
    const s = Q.services.find(o => o.key === st.service);
    if (!s || !s.from) return null;
    let lo = s.from, hi = s.to || Math.round(s.from * 2.2);
    const plan = s.plans && s.plans.find(p => p.key === st.plan);
    if (plan) { lo = plan.price; hi = Math.round(plan.price * 1.35); }
    st.extras.forEach(k => { const x = Q.extras.find(e => e.key === k); if (x) { lo += x.price; hi += x.price; } });
    if (st.need === 'ikisi' && !s.drone_included) { lo += Q.drone_addon; hi += Q.drone_addon; }
    const r = Q.regions.find(o => o.key === st.location);
    const travel = st.location === 'diger' || st.location === 'coklu' ? Q.travel_far : r ? r.travel || 0 : 0;
    lo += travel; hi += travel;
    return { lo: Math.round(lo / 500) * 500, hi: Math.round(hi / 500) * 500, travel };
  }

  function opts(name, list, opt = {}) {
    return `<div class="opts${opt.c2 ? ' c2' : ''}">` + list.map(o => {
      const checked = opt.multi ? st[name].includes(o.key) : st[name] === o.key;
      return `<label class="opt"><input type="${opt.multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(o.key)}"${checked ? ' checked' : ''}>${o.tag ? `<span class="tag">${esc(o.tag)}</span>` : ''}<b>${esc(o.title)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</label>`;
    }).join('') + '</div>';
  }

  function body() {
    switch (STEPS[step - 1]) {
      case 'service': return opts('service', Q.services.map(s => ({ key: s.key, title: s.title, sub: s.from ? `${fmt(s.from)}'den başlayan` : s.sub }))).replace('</div>', '') + `<label class="opt"><input type="radio" name="service" value="emin-degil"${st.service === 'emin-degil' ? ' checked' : ''}><b>Emin değilim</b><small>Birlikte karar verelim</small></label></div>`;
      case 'sector': return opts('sector', Q.sectors.concat([{ key: 'diger', title: 'Diğer' }])) + (st.sector === 'diger' ? `<div class="fld" style="margin-top:14px"><label for="w-sectorOther">Sektörünüzü yazın</label><input id="w-sectorOther" data-k="sectorOther" value="${esc(st.sectorOther || '')}"></div>` : '');
      case 'location': return opts('location', Q.regions.map(r => ({ key: r.key, title: r.title, sub: r.sub })).concat([{ key: 'diger', title: "Türkiye'nin başka bir ili", sub: 'Seyahat planı eklenir' }, { key: 'coklu', title: 'Birden fazla lokasyon' }])) + (st.location === 'diger' ? `<div class="fld" style="margin-top:14px"><label for="w-province">İl</label><select id="w-province" data-k="province"><option value="">İl seçin</option>${Q.provinces.map(p => `<option${st.province === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></div>` : '');
      case 'need': return opts('need', Q.needs, { c2: true });
      case 'extras': {
        const s = Q.services.find(o => o.key === st.service);
        const planHtml = s && s.plans ? `<p class="help" style="margin-bottom:10px">Paket</p>` + opts('plan', s.plans.map(p => ({ key: p.key, title: p.title, sub: fmt(p.price) + "'den", tag: p.hot ? 'Önerilen' : '' }))) + `<p class="help" style="margin:22px 0 10px">Ek seçenekler (isteğe bağlı)</p>` : '';
        return planHtml + opts('extras', Q.extras.map(x => ({ key: x.key, title: x.title, sub: '+ ' + fmt(x.price) })), { multi: true, c2: true });
      }
      case 'budget': return opts('budget', Q.budgets) + `<div class="fld" style="margin-top:14px"><label for="w-budgetNote">Bütçenizle ilgili not (isteğe bağlı)</label><input id="w-budgetNote" data-k="budgetNote" value="${esc(st.budgetNote || '')}"></div>`;
      case 'date': return opts('timeline', Q.timelines) + (st.timeline === 'kesin' ? `<div class="fld" style="margin-top:14px"><label for="w-date">Hedef tarih</label><input id="w-date" type="date" data-k="date" min="${new Date().toISOString().slice(0, 10)}" value="${esc(st.date || '')}"></div>` : '') + `<p class="help" style="margin:22px 0 10px">Bizi nereden buldunuz?</p>` + opts('source', Q.sources);
      case 'contact': return `<div class="form" style="padding:0;border:0;background:none"><form onsubmit="return false" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="fld"><label for="w-name">Ad soyad *</label><input id="w-name" data-k="name" autocomplete="name" value="${esc(st.name || '')}"><span class="err">Adınızı yazın.</span></div>
        <div class="fld"><label for="w-company">Firma</label><input id="w-company" data-k="company" autocomplete="organization" value="${esc(st.company || '')}"></div>
        <div class="fld"><label for="w-phone">Telefon *</label><input id="w-phone" data-k="phone" type="tel" autocomplete="tel" placeholder="05xx xxx xx xx" value="${esc(st.phone || '')}"><span class="err">Geçerli bir telefon yazın.</span></div>
        <div class="fld"><label for="w-email">E-posta</label><input id="w-email" data-k="email" type="email" autocomplete="email" value="${esc(st.email || '')}"></div>
        <div class="fld full"><label for="w-msg">Projenizi kısaca anlatın</label><textarea id="w-msg" data-k="message" placeholder="Ne çekmek istiyorsunuz, film nerede yayınlanacak?">${esc(st.message || '')}</textarea></div>
        <label class="consent fld full"><input type="checkbox" data-k="kvkk"${st.kvkk ? ' checked' : ''}><span><a href="/kvkk" target="_blank" rel="noopener">KVKK aydınlatma metnini</a> okudum; teklif talebim için bilgilerimin işlenmesini kabul ediyorum. *</span></label>
      </form></div>`;
    }
    return '';
  }

  function summary() {
    const rows = [];
    if (st.service) rows.push(['Hizmet', st.service === 'emin-degil' ? 'Emin değilim' : label(Q.services, st.service)]);
    const s = Q.services.find(o => o.key === st.service);
    if (s && s.plans && st.plan) rows.push(['Paket', label(s.plans, st.plan)]);
    if (st.sector) rows.push(['Sektör', st.sector === 'diger' ? (st.sectorOther || 'Diğer') : label(Q.sectors, st.sector)]);
    if (st.location) rows.push(['Lokasyon', st.location === 'diger' ? (st.province || 'Başka il') : st.location === 'coklu' ? 'Birden fazla lokasyon' : label(Q.regions, st.location)]);
    if (st.need) rows.push(['Çekim', label(Q.needs, st.need)]);
    if (st.extras.length) rows.push(['Ekler', st.extras.map(k => label(Q.extras, k)).join(', ')]);
    if (st.budget) rows.push(['Bütçe', label(Q.budgets, st.budget)]);
    if (st.timeline) rows.push(['Tarih', st.timeline === 'kesin' && st.date ? st.date : label(Q.timelines, st.timeline)]);
    return rows;
  }

  function renderSummary() {
    const sum = $('.sum'); if (!sum) return;
    const rows = summary(), e = estimate();
    sum.innerHTML = `<h3>Talep özeti</h3><dl>${rows.length ? rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('') : '<div><dd style="color:var(--fog);font-weight:400">Seçimleriniz burada görünür.</dd></div>'}</dl>
      <div class="est"><span class="mono" style="color:var(--fog);font-size:11px">Tahmini bütçe</span><b>${e ? fmt(e.lo) + ' – ' + fmt(e.hi) : '—'}</b><small>${e ? 'Seçimlerinize göre ön tahmindir; KDV dahil. Kesin fiyat, keşif görüşmesinden sonra kalem kalem yazılı teklifle verilir.' : 'Hizmet seçtiğinizde ön tahmin görünür.'}${e && e.travel ? ' Seyahat payı eklendi.' : ''}</small></div>`;
  }

  function valid() {
    const k = STEPS[step - 1];
    if (k === 'service') return !!st.service;
    if (k === 'sector') return !!st.sector && (st.sector !== 'diger' || !!(st.sectorOther || '').trim());
    if (k === 'location') return !!st.location && (st.location !== 'diger' || !!st.province);
    if (k === 'need') return !!st.need;
    if (k === 'date') return !!st.timeline && (st.timeline !== 'kesin' || !!st.date);
    if (k === 'contact') {
      let ok = true;
      const nm = $('#w-name'), ph = $('#w-phone');
      const badN = !(st.name || '').trim(), badP = (st.phone || '').replace(/\D/g, '').length < 10;
      nm.closest('.fld').classList.toggle('invalid', badN); ph.closest('.fld').classList.toggle('invalid', badP);
      if (badN || badP) ok = false;
      if (!st.kvkk) ok = false;
      return ok;
    }
    return true;
  }

  function render() {
    const k = STEPS[step - 1];
    $('.bar i').style.width = (step / 8 * 100) + '%';
    $('.stepno').textContent = `Adım ${step} / 8`;
    $('.q').textContent = TITLES[k];
    $('.body').innerHTML = body();
    $('[data-back]').disabled = step === 1;
    $('[data-next]').innerHTML = step === 8 ? 'WhatsApp ile gönder <i class="ph ph-whatsapp-logo"></i>' : 'Devam et <i class="ph ph-arrow-right"></i>';
    $('[data-mail]').hidden = step !== 8;
    $('.err2').classList.remove('show');
    renderSummary();
    const u = new URL(location.href); u.searchParams.set('adim', step); history.replaceState(null, '', u);
    bind();
  }

  function bind() {
    $$('.body input[type=radio]').forEach(el => el.addEventListener('change', () => {
      st[el.name] = el.value; save();
      const k = STEPS[step - 1];
      const needsText = (k === 'sector' && el.value === 'diger') || (k === 'location' && el.value === 'diger') || (k === 'date' && el.value === 'kesin');
      if (el.name === 'service') st.plan = '';
      if (needsText || k === 'date' || k === 'extras' || k === 'budget') { render(); return; }
      renderSummary();
      setTimeout(() => go(1), 160);
    }));
    $$('.body input[type=checkbox][name=extras]').forEach(el => el.addEventListener('change', () => {
      st.extras = $$('.body input[name=extras]:checked').map(i => i.value); save(); renderSummary();
    }));
    $$('.body [data-k]').forEach(el => {
      const ev = el.type === 'checkbox' ? 'change' : el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, () => { st[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; save(); renderSummary(); const f = el.closest('.fld'); f && f.classList.remove('invalid'); });
    });
  }

  function message() {
    const e = estimate();
    const lines = ['Merhaba AirviewTR, web sitenizdeki teklif formundan yazıyorum.', ''];
    summary().forEach(([k, v]) => lines.push(`${k}: ${v}`));
    if (st.budgetNote) lines.push(`Bütçe notu: ${st.budgetNote}`);
    if (st.source) lines.push(`Bizi buldukları yer: ${label(Q.sources, st.source)}`);
    if (e) lines.push(`Sitedeki ön tahmin: ${fmt(e.lo)} – ${fmt(e.hi)}`);
    lines.push('', `Ad soyad: ${st.name || ''}`);
    if (st.company) lines.push(`Firma: ${st.company}`);
    lines.push(`Telefon: ${st.phone || ''}`);
    if (st.email) lines.push(`E-posta: ${st.email}`);
    if (st.message) lines.push('', st.message);
    return lines.join('\n');
  }

  function done(channel) {
    $('.card').innerHTML = `<div class="done"><span class="tc">REC · talep hazır</span><h2 style="margin-top:14px">Talebiniz hazır.</h2><p class="lead" style="max-width:none">${channel === 'wa' ? "WhatsApp'ta açılan mesajı göndermeniz yeterli." : 'E-posta uygulamanızda açılan taslağı göndermeniz yeterli.'} Talebinizi aynı gün yanıtlıyoruz; keşif görüşmesinde çekim planını birlikte netleştiririz.</p>
      <div class="cta-row" style="margin-top:22px"><a class="btn btn-rec" href="https://wa.me/${Q.wa}?text=${encodeURIComponent(message())}" target="_blank" rel="noopener">Mesajı tekrar aç <i class="ph ph-whatsapp-logo"></i></a><a class="btn btn-line" href="/isler">İşlere göz atın <i class="ph ph-play"></i></a></div></div>`;
    if (window.gtag) window.gtag('event', 'generate_lead', { form: 'teklif_sihirbazi', service: st.service, source: st.source });
  }

  function go(d) {
    if (d > 0 && !valid()) { $('.err2').classList.add('show'); return; }
    if (d > 0 && step === 8) {
      window.open(`https://wa.me/${Q.wa}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
      done('wa'); return;
    }
    step = Math.min(8, Math.max(1, step + d)); render();
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  $('[data-next]').addEventListener('click', () => go(1));
  $('[data-back]').addEventListener('click', () => go(-1));
  $('[data-mail]').addEventListener('click', e => {
    e.preventDefault(); if (!valid()) { $('.err2').classList.add('show'); return; }
    location.href = `mailto:${Q.mail}?subject=${encodeURIComponent('Teklif talebi: ' + (label(Q.services, st.service) || 'Video prodüksiyon'))}&body=${encodeURIComponent(message())}`;
    done('mail');
  });
  render();
})();
