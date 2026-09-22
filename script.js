function setLang(lang) {
  document.body.className = 'lang-' + lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-fr').classList.toggle('active', lang === 'fr');
}

/* floating CTA — show when hero is out of view, hide near final CTA section */
(function () {
  var fab = document.getElementById('fab');
  var hero = document.querySelector('.hero');
  var finalCta = document.querySelector('.final-cta');
  var heroVisible = true;
  var nearEnd = false;

  function update() {
    if (!heroVisible && !nearEnd) { fab.classList.add('visible'); }
    else { fab.classList.remove('visible'); }
  }

  if (hero) {
    var heroObs = new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      update();
    }, { threshold: 0 });
    heroObs.observe(hero);
  }

  if (finalCta) {
    var ctaObs = new IntersectionObserver(function (entries) {
      nearEnd = entries[0].isIntersecting;
      update();
    }, { threshold: 0.1 });
    ctaObs.observe(finalCta);
  }
})();

async function copyText(text, btn) {
  const original = btn.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = (document.documentElement.lang === 'ar') ? 'تم النسخ' : 'Copié';
  } catch (e) {
    btn.textContent = (document.documentElement.lang === 'ar') ? 'انسخ يدوياً' : 'Copie manuelle';
  }
  setTimeout(() => { btn.textContent = original; }, 1800);
}
