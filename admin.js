import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { storage } from './firebase-config.js';

// DOM Elements
const loginSec = document.getElementById('login-section');
const dashSec = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const btnLogout = document.getElementById('btn-logout');

const productsTable = document.querySelector('#products-table tbody');
const ordersTable = document.querySelector('#orders-table tbody');

const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const btnNewProduct = document.getElementById('btn-new-product');
const btnCloseModal = document.getElementById('btn-close-modal');

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSec.style.display = 'none';
    dashSec.style.display = 'block';
    loadProducts();
    loadOrders();
  } else {
    loginSec.style.display = 'block';
    dashSec.style.display = 'none';
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    alert("فشل تسجيل الدخول: " + err.message);
  }
});

// Logout
btnLogout.addEventListener('click', () => {
  signOut(auth);
});

// Load Products
function loadProducts() {
  const q = query(collection(db, 'products'));
  onSnapshot(q, (snapshot) => {
    productsTable.innerHTML = '';
    snapshot.forEach(docSnap => {
      const p = docSnap.data();
      const imgHtml = p.imageUrl ? `<img src="${p.imageUrl}" style="width:24px;height:24px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-left:8px;">` : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${imgHtml}<strong>${p.name}</strong></td>
        <td class="num">${p.price}</td>
        <td>
          <span class="status-badge ${p.active ? 'status-active' : ''}" style="margin-left:8px;">${p.active ? 'نشط' : 'متوقف'}</span>
          <button class="btn btn-small ${p.active ? 'btn-ghost' : 'btn-primary'}" onclick="toggleProductActive('${docSnap.id}', ${p.active})">
            ${p.active ? 'إيقاف' : 'تفعيل'}
          </button>
        </td>
        <td>
          <button class="btn btn-small" onclick="editProduct('${docSnap.id}')">تعديل</button>
          <button class="btn btn-small btn-danger" onclick="deleteProduct('${docSnap.id}')">حذف</button>
        </td>
      `;
      productsTable.appendChild(tr);
    });
  });
}

// Load Orders
let allOrders = [];
let currentFilter = 'all';

const statusLabels = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد ✅',
  cancelled: 'ملغي ❌'
};

const statusClasses = {
  pending: '',
  confirmed: 'status-active',
  cancelled: 'status-cancelled'
};

function loadOrders() {
  const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snapshot) => {
    allOrders = [];
    snapshot.forEach(docSnap => {
      const o = docSnap.data();
      o._id = docSnap.id;
      allOrders.push(o);
    });
    renderOrders();
  });
}

function renderOrders() {
  ordersTable.innerHTML = '';
  const filtered = currentFilter === 'all' 
    ? allOrders 
    : allOrders.filter(o => (o.status || 'pending') === currentFilter);
  
  if (filtered.length === 0) {
    ordersTable.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">لا توجد طلبات</td></tr>';
    return;
  }

  filtered.forEach(o => {
    const date = o.timestamp ? new Date(o.timestamp.toMillis()).toLocaleString('ar-DZ') : 'الآن';
    const status = o.status || 'pending';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td><strong>${o.customerName}</strong><br><small style="color:var(--text-muted)">${o.wilaya || '-'}</small></td>
      <td>${o.productName}</td>
      <td class="num">${o.phone}</td>
      <td><span class="status-badge ${statusClasses[status] || ''}">${statusLabels[status] || status}</span></td>
      <td>
        <button class="btn btn-small" onclick="viewOrder('${o._id}')">عرض</button>
        ${status === 'pending' ? `<button class="btn btn-small" style="background:#10A37F;color:#fff;border:none;" onclick="quickConfirm('${o._id}')">تأكيد</button>` : ''}
      </td>
    `;
    ordersTable.appendChild(tr);
  });
}

// Filter orders
window.filterOrders = (filter, btn) => {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderOrders();
};

// Quick confirm from table
window.quickConfirm = async (id) => {
  await updateDoc(doc(db, 'orders', id), { status: 'confirmed' });
};

// View order details in modal
window.viewOrder = (id) => {
  const o = allOrders.find(x => x._id === id);
  if (!o) return;
  document.getElementById('order-id').value = id;
  document.getElementById('order-name').value = o.customerName;
  document.getElementById('order-wilaya').value = o.wilaya || '-';
  document.getElementById('order-phone').value = o.phone;
  document.getElementById('order-product').value = o.productName;
  document.getElementById('order-price').value = (o.price || '-') + ' دج';
  document.getElementById('order-status').value = o.status || 'pending';
  document.getElementById('order-modal').classList.add('open');
};

// Update order status (quick button)
window.updateOrderStatus = async (newStatus) => {
  const id = document.getElementById('order-id').value;
  await updateDoc(doc(db, 'orders', id), { status: newStatus });
  document.getElementById('order-modal').classList.remove('open');
};

// Save selected status from dropdown
window.saveOrderStatus = async () => {
  const id = document.getElementById('order-id').value;
  const status = document.getElementById('order-status').value;
  await updateDoc(doc(db, 'orders', id), { status: status });
  document.getElementById('order-modal').classList.remove('open');
};

// Delete order
window.deleteOrder = async () => {
  const id = document.getElementById('order-id').value;
  if (confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
    await deleteDoc(doc(db, 'orders', id));
    document.getElementById('order-modal').classList.remove('open');
  }
};

// Close order modal
window.closeOrderModal = () => {
  document.getElementById('order-modal').classList.remove('open');
};

// Modal Logic
btnNewProduct.addEventListener('click', () => {
  productForm.reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('modal-title').textContent = 'إضافة منتج';
  productModal.classList.add('open');
});

btnCloseModal.addEventListener('click', () => {
  productModal.classList.remove('open');
});

window.toggleProductActive = async (id, currentStatus) => {
  await updateDoc(doc(db, 'products', id), { active: !currentStatus });
};

window.editProduct = async (id) => {
  const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
  const d = await getDoc(doc(db, 'products', id));
  if(d.exists()) {
    const p = d.data();
    document.getElementById('prod-id').value = id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-symbol').value = p.symbol;
    document.getElementById('prod-color').value = p.color;
    document.getElementById('prod-desc-ar').value = p.desc_ar;
    document.getElementById('prod-desc-fr').value = p.desc_fr;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-period').value = p.period;
    document.getElementById('prod-active').checked = p.active;
    
    document.getElementById('prod-image').value = '';
    document.getElementById('prod-image-url').value = p.imageUrl || '';
    document.getElementById('image-preview').innerHTML = p.imageUrl ? `<img src="${p.imageUrl}" style="max-width:100px; border-radius:8px;">` : '';
    
    document.getElementById('modal-title').textContent = 'تعديل منتج';
    productModal.classList.add('open');
  }
};

window.deleteProduct = async (id) => {
  if(confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
    await deleteDoc(doc(db, 'products', id));
  }
};

// Save Product
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري الحفظ...';

  const id = document.getElementById('prod-id').value;
  let imageUrl = document.getElementById('prod-image-url').value;
  const fileInput = document.getElementById('prod-image');
  
  try {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const storageRef = ref(storage, 'products/' + Date.now() + '_' + file.name);
      await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(storageRef);
    }

    const pData = {
      name: document.getElementById('prod-name').value,
      symbol: document.getElementById('prod-symbol').value,
      color: document.getElementById('prod-color').value,
      desc_ar: document.getElementById('prod-desc-ar').value,
      desc_fr: document.getElementById('prod-desc-fr').value,
      price: Number(document.getElementById('prod-price').value),
      period: document.getElementById('prod-period').value,
      active: document.getElementById('prod-active').checked,
      imageUrl: imageUrl,
      order: Date.now() // Simple sorting fallback
    };

    if (id) {
      await updateDoc(doc(db, 'products', id), pData);
    } else {
      await addDoc(collection(db, 'products'), pData);
    }
    productModal.classList.remove('open');
  } catch(err) {
    alert("خطأ في الحفظ: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
