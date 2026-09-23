import { db } from './firebase-config.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Keep existing language functions attached to window so inline onclick works
window.setLang = function(lang) {
  document.body.className = 'lang-' + lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-fr').classList.toggle('active', lang === 'fr');
};

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

window.copyText = async function(text, btn) {
  const original = btn.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = (document.documentElement.lang === 'ar') ? 'تم النسخ' : 'Copié';
  } catch (e) {
    btn.textContent = (document.documentElement.lang === 'ar') ? 'انسخ يدوياً' : 'Copie manuelle';
  }
  setTimeout(() => { btn.textContent = original; }, 1800);
};


/* Firebase Integration - Dynamic Products & Checkout Modal */
const productsGrid = document.querySelector('.products-grid');
const selectProduct = document.getElementById('cust-product');
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');
const checkoutForm = document.getElementById('checkout-form');
let activeProducts = [];


// Load products from Firestore
async function loadDynamicProducts() {
  const q = query(collection(db, 'products'), where('active', '==', true));
  const snap = await getDocs(q);
  
  // Clear hardcoded products except the "contact us" card
  const customCard = `
    <div class="product-card" style="justify-content:center;align-items:center;text-align:center;border-style:dashed;">
      <p class="desc" data-ar>ما لقيتيش الاشتراك يلي تحبو؟ راسلنا وحنا نشوفولك.</p>
      <p class="desc" data-fr>Vous ne trouvez pas l'abonnement que vous cherchez ? Contactez-nous.</p>
      <a href="https://wa.me/213000000000" class="btn btn-ghost" target="_blank" rel="noopener noreferrer">
        <span data-ar>راسلنا</span><span data-fr>Nous écrire</span>
      </a>
    </div>
  `;
  productsGrid.innerHTML = '';
  selectProduct.innerHTML = '<option value="" disabled selected>-- اختر الاشتراك --</option>';

  snap.forEach(docSnap => {
    const p = docSnap.data();
    p.id = docSnap.id;
    activeProducts.push(p);

    // Render Card
    const imgHtml = p.imageUrl 
      ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:48px;height:48px;border-radius:13px;object-fit:cover;margin-bottom:12px;">`
      : `<div class="mono" style="background:${p.color};">${p.symbol}</div>`;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${imgHtml}
      <h3>${p.name}</h3>
      <p class="desc"><span data-ar>${p.desc_ar}</span><span data-fr>${p.desc_fr}</span></p>
      <div class="price-row" style="margin-bottom: 14px;">
        <span class="price num">${p.price} <span style="font-size:0.85rem;">DA</span></span>
        <span class="period">${p.period}</span>
      </div>
      <button class="btn btn-primary btn-block btn-order-modal" data-id="${p.id}">
        <span data-ar>اطلب الآن</span><span data-fr>Commander</span>
      </button>
    `;
    productsGrid.appendChild(card);

    // Render Option in Modal
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} - ${p.price} DA`;
    selectProduct.appendChild(opt);
  });
  
  productsGrid.insertAdjacentHTML('beforeend', customCard);
  
  // Apply language state to new elements
  setLang(document.documentElement.lang || 'ar');

  // Attach modal events to new buttons
  document.querySelectorAll('.btn-order-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      selectProduct.value = id;
      openModal();
    });
  });
}

// Redirect all existing "Order via WhatsApp" buttons to the Modal
document.querySelectorAll('a[href^="https://wa.me/"]').forEach(btn => {
  // If it's not the contact-us or footer link, hijack it to open the modal
  if(btn.classList.contains('btn-primary')) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }
});

function openModal() {
  checkoutModal.classList.add('open');
}

closeCheckout.addEventListener('click', () => {
  checkoutModal.classList.remove('open');
});

// Submit Order
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-submit-order');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري المعالجة...';

  const name = document.getElementById('cust-name').value;
  const wilaya = document.getElementById('cust-wilaya').value;
  const phone = document.getElementById('cust-phone').value;
  const productId = document.getElementById('cust-product').value;
  
  const selectedProduct = activeProducts.find(p => p.id === productId);

  try {
    // 1. Save to Firestore
    await addDoc(collection(db, 'orders'), {
      customerName: name,
      wilaya: wilaya,
      phone: phone,
      productName: selectedProduct.name,
      price: selectedProduct.price,
      status: 'pending',
      timestamp: serverTimestamp()
    });

    // 2. Redirect to WhatsApp
    const waNumber = "213000000000"; // Replace with actual number later
    const message = `مرحباً، أود طلب اشتراك:
المنتج: ${selectedProduct.name}
السعر: ${selectedProduct.price} دج
الاسم: ${name}
الولاية: ${wilaya}
رقم الهاتف: ${phone}

أرجو تأكيد الطلب لتزويدي بتفاصيل الدفع.`;

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    
    // Close modal & reset
    checkoutModal.classList.remove('open');
    checkoutForm.reset();
    
    // Redirect
    window.location.href = waUrl;

  } catch(err) {
    alert("حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'تأكيد الطلب';
  }
});

// Init
loadDynamicProducts();
