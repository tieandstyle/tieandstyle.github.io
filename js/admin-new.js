// Admin Panel JavaScript
import {
  auth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllSubcategories,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getStoreConfig,
  updateStoreConfig,
  getAllNews,
  addNews,
  updateNews,
  deleteNews,
  getDocs,
  collection,
  db,
  query,
  orderBy,
  where,
  updateDoc,
  doc
} from './firebase-config.js';

// State
let products = [];
let categories = [];
let subcategories = [];
let orders = [];
let news = [];
let storeConfig = {};
let currentTab = 'dashboard';

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');

// Auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    loadAllData();
  } else {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
  }
});

window.handleLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    document.getElementById('loginError').textContent = error.message;
    document.getElementById('loginError').classList.remove('hidden');
  }
};

window.handleLogout = async function() {
  await signOut(auth);
};

// Load all data
async function loadAllData() {
  await Promise.all([
    loadProducts(),
    loadCategories(),
    loadSubcategories(),
    loadOrders(),
    loadNews(),
    loadStoreConfig()
  ]);
  updateDashboardStats();
}

// Tab switching
window.switchTab = function(tab) {
  currentTab = tab;
  
  // Hide all views
  document.getElementById('dashboardView').classList.add('hidden');
  document.getElementById('productsView').classList.add('hidden');
  document.getElementById('categoriesView').classList.add('hidden');
  document.getElementById('ordersView').classList.add('hidden');
  document.getElementById('storeView').classList.add('hidden');
  document.getElementById('newsView').classList.add('hidden');
  
  // Remove tab-active from all tabs
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('tab-active'));
  
  // Show selected view and activate tab
  document.getElementById(`${tab}View`).classList.remove('hidden');
  document.getElementById(`${tab}Tab`).classList.add('tab-active');
};

// ============ PRODUCTS ============

async function loadProducts() {
  const result = await getAllProducts();
  if (result.success) {
    products = result.products;
    renderProducts();
  }
}

function renderProducts() {
  const tbody = document.getElementById('productsTableBody');
  const searchTerm = document.getElementById('productSearch')?.value?.toLowerCase() || '';
  
  const filtered = products.filter(p => 
    p.title?.toLowerCase().includes(searchTerm) || 
    p.sku?.toLowerCase().includes(searchTerm)
  );
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No products found</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(p => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
      <td class="px-4 py-3"><img src="${p.images?.[0] || ''}" class="w-12 h-12 object-cover rounded" onerror="this.src='image/placeholder.jpg'"/></td>
      <td class="px-4 py-3 font-medium">${p.title || ''}</td>
      <td class="px-4 py-3 text-sm text-gray-500">${p.sku || ''}</td>
      <td class="px-4 py-3">₹${p.price || 0}</td>
      <td class="px-4 py-3">${p.stock ?? 0}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-1 text-xs rounded-full ${p.available !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
          ${p.available !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="px-4 py-3">
        <button onclick="editProduct('${p.id}')" class="text-blue-600 hover:underline text-sm mr-2">Edit</button>
        <button onclick="confirmDeleteProduct('${p.id}')" class="text-red-600 hover:underline text-sm">Delete</button>
      </td>
    </tr>
  `).join('');
}

window.filterProducts = function() {
  renderProducts();
};

window.openProductModal = function(productId = null) {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productModalTitle').textContent = 'Add Product';
  
  // Auto-generate SKU for new product
  if (typeof generateSkuString === 'function') {
    document.getElementById('productSku').value = generateSkuString();
  }
  
  // Hide subcategory by default
  document.getElementById('subcategoryWrapper').classList.add('hidden');
  document.getElementById('productSubcategory').innerHTML = '<option value="">Select subcategory</option>';
  
  // Populate category dropdown
  const catSelect = document.getElementById('productCategory');
  catSelect.innerHTML = '<option value="">Select category</option>' + 
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  if (productId) {
    const p = products.find(x => x.id === productId);
    if (p) {
      document.getElementById('productModalTitle').textContent = 'Edit Product';
      document.getElementById('productId').value = p.id;
      document.getElementById('productTitle').value = p.title || '';
      document.getElementById('productSku').value = p.sku || '';
      document.getElementById('productPrice').value = p.price || '';
      document.getElementById('productComparePrice').value = p.compareAtPrice || '';
      document.getElementById('productStock').value = p.stock ?? 0;
      document.getElementById('productCategory').value = p.categoryIds?.[0] || '';
      
      // Show subcategory if product has one
      if (p.categoryIds?.[0]) {
        populateSubcategories(p.categoryIds[0]);
        if (p.subcategoryId) {
          document.getElementById('productSubcategory').value = p.subcategoryId;
        }
      }
      
      document.getElementById('productShortDesc').value = p.shortDescription || '';
      document.getElementById('productDescription').value = p.description || '';
      document.getElementById('productImages').value = (p.images || []).join(', ');
      document.getElementById('productSizes').value = (p.sizes || []).join(', ');
      document.getElementById('productTags').value = (p.tags || []).join(', ');
      document.getElementById('productAvailable').checked = p.available !== false;
      
      // Update image preview for existing product
      setTimeout(() => updateImagePreview('productImages'), 100);
    }
  }
  
  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('productModal').classList.add('flex');
};

// Handle category change to show subcategories
window.onCategoryChange = function() {
  const categoryId = document.getElementById('productCategory').value;
  populateSubcategories(categoryId);
};

function populateSubcategories(categoryId) {
  const wrapper = document.getElementById('subcategoryWrapper');
  const subcatSelect = document.getElementById('productSubcategory');
  
  if (!categoryId) {
    wrapper.classList.add('hidden');
    subcatSelect.innerHTML = '<option value="">Select subcategory</option>';
    return;
  }
  
  // Filter subcategories for this category
  const filteredSubs = subcategories.filter(s => s.parentCategoryId === categoryId && s.active !== false);
  
  if (filteredSubs.length > 0) {
    wrapper.classList.remove('hidden');
    subcatSelect.innerHTML = '<option value="">Select subcategory</option>' + 
      filteredSubs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  } else {
    wrapper.classList.add('hidden');
    subcatSelect.innerHTML = '<option value="">No subcategories</option>';
  }
}

window.closeProductModal = function() {
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('productModal').classList.remove('flex');
};

window.editProduct = function(id) {
  openProductModal(id);
};

window.confirmDeleteProduct = async function(id) {
  if (confirm('Are you sure you want to delete this product?')) {
    const result = await deleteProduct(id);
    if (result.success) {
      await loadProducts();
      updateDashboardStats();
    } else {
      alert('Error: ' + result.error);
    }
  }
};

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const productId = document.getElementById('productId').value;
  const categoryId = document.getElementById('productCategory').value;
  
  const productData = {
    title: document.getElementById('productTitle').value,
    sku: document.getElementById('productSku').value,
    price: parseFloat(document.getElementById('productPrice').value) || 0,
    compareAtPrice: parseFloat(document.getElementById('productComparePrice').value) || null,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    categoryIds: categoryId ? [categoryId] : [],
    subcategoryId: document.getElementById('productSubcategory').value || null,
    shortDescription: document.getElementById('productShortDesc').value,
    description: document.getElementById('productDescription').value,
    images: document.getElementById('productImages').value.split(',').map(s => s.trim()).filter(Boolean),
    sizes: document.getElementById('productSizes').value.split(',').map(s => s.trim()).filter(Boolean),
    tags: document.getElementById('productTags').value.split(',').map(s => s.trim()).filter(Boolean),
    available: document.getElementById('productAvailable').checked,
    currency: 'INR'
  };
  
  let result;
  if (productId) {
    result = await updateProduct(productId, productData);
  } else {
    result = await addProduct(productData);
  }
  
  if (result.success) {
    closeProductModal();
    await loadProducts();
    updateDashboardStats();
  } else {
    alert('Error: ' + result.error);
  }
});

// ============ CATEGORIES ============

async function loadCategories() {
  const result = await getAllCategories();
  if (result.success) {
    categories = result.categories;
    renderCategories();
  }
}

function renderCategories() {
  const list = document.getElementById('categoriesList');
  
  if (categories.length === 0) {
    list.innerHTML = '<div class="p-4 text-gray-500">No categories</div>';
    return;
  }
  
  list.innerHTML = categories.map(c => `
    <div class="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
      <div class="flex items-center gap-3">
        <img src="${c.image || ''}" class="w-10 h-10 rounded object-cover" onerror="this.src='image/placeholder.jpg'"/>
        <div>
          <div class="font-medium">${c.name}</div>
          <div class="text-xs text-gray-500">${c.slug || ''}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-1 text-xs rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
          ${c.active ? 'Active' : 'Inactive'}
        </span>
        <button onclick="editCategory('${c.id}')" class="text-blue-600 hover:underline text-sm">Edit</button>
        <button onclick="confirmDeleteCategory('${c.id}')" class="text-red-600 hover:underline text-sm">Delete</button>
      </div>
    </div>
  `).join('');
}

window.openCategoryModal = function(categoryId = null) {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  
  if (categoryId) {
    const c = categories.find(x => x.id === categoryId);
    if (c) {
      document.getElementById('categoryModalTitle').textContent = 'Edit Category';
      document.getElementById('categoryId').value = c.id;
      document.getElementById('categoryName').value = c.name || '';
      document.getElementById('categoryDescription').value = c.description || '';
      document.getElementById('categoryImage').value = c.image || '';
      document.getElementById('categoryOrder').value = c.order || 0;
      document.getElementById('categoryActive').checked = c.active !== false;
    }
  }
  
  document.getElementById('categoryModal').classList.remove('hidden');
  document.getElementById('categoryModal').classList.add('flex');
};

window.closeCategoryModal = function() {
  document.getElementById('categoryModal').classList.add('hidden');
  document.getElementById('categoryModal').classList.remove('flex');
};

window.editCategory = function(id) {
  openCategoryModal(id);
};

window.confirmDeleteCategory = async function(id) {
  if (confirm('Are you sure you want to delete this category?')) {
    const result = await deleteCategory(id);
    if (result.success) {
      await loadCategories();
      updateDashboardStats();
    } else {
      alert('Error: ' + result.error);
    }
  }
};

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const categoryId = document.getElementById('categoryId').value;
  
  const categoryData = {
    name: document.getElementById('categoryName').value,
    description: document.getElementById('categoryDescription').value,
    image: document.getElementById('categoryImage').value,
    order: parseInt(document.getElementById('categoryOrder').value) || 0,
    active: document.getElementById('categoryActive').checked
  };
  
  let result;
  if (categoryId) {
    result = await updateCategory(categoryId, categoryData);
  } else {
    result = await addCategory(categoryData);
  }
  
  if (result.success) {
    closeCategoryModal();
    await loadCategories();
    updateDashboardStats();
  } else {
    alert('Error: ' + result.error);
  }
});

// ============ SUBCATEGORIES ============

async function loadSubcategories() {
  const result = await getAllSubcategories();
  if (result.success) {
    subcategories = result.subcategories;
    renderSubcategories();
  }
}

function renderSubcategories() {
  const list = document.getElementById('subcategoriesList');
  
  if (subcategories.length === 0) {
    list.innerHTML = '<div class="p-4 text-gray-500">No subcategories</div>';
    return;
  }
  
  list.innerHTML = subcategories.map(s => {
    const parent = categories.find(c => c.id === s.parentCategoryId);
    return `
      <div class="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
        <div>
          <div class="font-medium">${s.name}</div>
          <div class="text-xs text-gray-500">Parent: ${parent?.name || 'Unknown'}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 text-xs rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            ${s.active ? 'Active' : 'Inactive'}
          </span>
          <button onclick="editSubcategory('${s.id}')" class="text-blue-600 hover:underline text-sm">Edit</button>
          <button onclick="confirmDeleteSubcategory('${s.id}')" class="text-red-600 hover:underline text-sm">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.openSubcategoryModal = function(subcategoryId = null) {
  document.getElementById('subcategoryForm').reset();
  document.getElementById('subcategoryId').value = '';
  document.getElementById('subcategoryModalTitle').textContent = 'Add Subcategory';
  
  // Populate parent dropdown
  const parentSelect = document.getElementById('subcategoryParent');
  parentSelect.innerHTML = '<option value="">Select parent</option>' + 
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  if (subcategoryId) {
    const s = subcategories.find(x => x.id === subcategoryId);
    if (s) {
      document.getElementById('subcategoryModalTitle').textContent = 'Edit Subcategory';
      document.getElementById('subcategoryId').value = s.id;
      document.getElementById('subcategoryName').value = s.name || '';
      document.getElementById('subcategoryParent').value = s.parentCategoryId || '';
      document.getElementById('subcategoryDescription').value = s.description || '';
      document.getElementById('subcategoryOrder').value = s.order || 0;
      document.getElementById('subcategoryActive').checked = s.active !== false;
    }
  }
  
  document.getElementById('subcategoryModal').classList.remove('hidden');
  document.getElementById('subcategoryModal').classList.add('flex');
};

window.closeSubcategoryModal = function() {
  document.getElementById('subcategoryModal').classList.add('hidden');
  document.getElementById('subcategoryModal').classList.remove('flex');
};

window.editSubcategory = function(id) {
  openSubcategoryModal(id);
};

window.confirmDeleteSubcategory = async function(id) {
  if (confirm('Are you sure you want to delete this subcategory?')) {
    const result = await deleteSubcategory(id);
    if (result.success) {
      await loadSubcategories();
    } else {
      alert('Error: ' + result.error);
    }
  }
};

document.getElementById('subcategoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const subcategoryId = document.getElementById('subcategoryId').value;
  
  const subcategoryData = {
    name: document.getElementById('subcategoryName').value,
    parentCategoryId: document.getElementById('subcategoryParent').value,
    description: document.getElementById('subcategoryDescription').value,
    order: parseInt(document.getElementById('subcategoryOrder').value) || 0,
    active: document.getElementById('subcategoryActive').checked
  };
  
  let result;
  if (subcategoryId) {
    result = await updateSubcategory(subcategoryId, subcategoryData);
  } else {
    result = await addSubcategory(subcategoryData);
  }
  
  if (result.success) {
    closeSubcategoryModal();
    await loadSubcategories();
  } else {
    alert('Error: ' + result.error);
  }
});

// ============ ORDERS ============

async function loadOrders() {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    renderOrders();
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
  
  let filtered = orders;
  if (statusFilter !== 'all') {
    filtered = orders.filter(o => o.status === statusFilter);
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No orders found</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.slice(0, 50).map(o => {
    const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : 'N/A';
    const itemCount = o.items?.length || 0;
    const total = o.totals?.grandTotal || o.totals?.total || 0;
    
    return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
        <td class="px-4 py-3 font-mono text-sm">${o.id.substring(0, 8)}...</td>
        <td class="px-4 py-3">${o.customer?.name || 'N/A'}</td>
        <td class="px-4 py-3">${itemCount} items</td>
        <td class="px-4 py-3 font-medium">₹${total}</td>
        <td class="px-4 py-3">
          <select onchange="updateOrderStatus('${o.id}', this.value)" class="text-xs border rounded px-2 py-1">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>📝 Pending</option>
            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>⚙️ Processing</option>
            <option value="packed" ${o.status === 'packed' ? 'selected' : ''}>📦 Packed</option>
            <option value="dispatched" ${o.status === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
            <option value="in-transit" ${o.status === 'in-transit' ? 'selected' : ''}>🛣️ In Transit</option>
            <option value="out-for-delivery" ${o.status === 'out-for-delivery' ? 'selected' : ''}>🏃 Out for Delivery</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          </select>
        </td>
        <td class="px-4 py-3 text-sm text-gray-500">${date}</td>
        <td class="px-4 py-3">
          <button onclick="viewOrder('${o.id}')" class="text-blue-600 hover:underline text-sm">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterOrders = function() {
  renderOrders();
};

window.updateOrderStatus = async function(orderId, newStatus) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { 
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    await loadOrders();
    updateDashboardStats();
  } catch (error) {
    alert('Error updating status: ' + error.message);
  }
};

window.viewOrder = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  
  const content = document.getElementById('orderModalContent');
  const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A';
  
  // Build full address
  const customer = order.customer || {};
  const addressParts = [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.state,
    customer.postalCode,
    customer.country
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ') || 'N/A';
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-bold mb-3 text-lg border-b pb-2">Customer Details</h4>
          <div class="space-y-2">
            <p><span class="font-medium text-gray-600">Name:</span> ${customer.name || 'N/A'}</p>
            <p><span class="font-medium text-gray-600">Phone:</span> ${customer.phoneE164 || customer.phone || 'N/A'}</p>
            <p><span class="font-medium text-gray-600">Email:</span> ${customer.email || 'N/A'}</p>
            <div>
              <span class="font-medium text-gray-600">Address:</span>
              <p class="text-sm text-gray-700 mt-1">${fullAddress}</p>
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-bold mb-3 text-lg border-b pb-2">Order Info</h4>
          <div class="space-y-2">
            <p><span class="font-medium text-gray-600">Order ID:</span> <span class="font-mono text-sm">${order.id}</span></p>
            <p><span class="font-medium text-gray-600">Status:</span> <span class="font-medium">${order.status || 'pending'}</span></p>
            <p><span class="font-medium text-gray-600">Date:</span> ${date}</p>
            <p><span class="font-medium text-gray-600">Payment:</span> ${order.paymentStatus || 'pending'}</p>
            ${order.paymentMethod ? `<p><span class="font-medium text-gray-600">Payment Method:</span> ${order.paymentMethod}</p>` : ''}
            ${order.razorpayPaymentId ? `<p><span class="font-medium text-gray-600">Razorpay ID:</span> <span class="font-mono text-xs">${order.razorpayPaymentId}</span></p>` : ''}
          </div>
        </div>
      </div>
      <div>
        <h4 class="font-bold mb-3 text-lg border-b pb-2">Items</h4>
        <div class="border rounded-lg divide-y">
          ${(order.items || []).map(item => `
            <div class="p-3 flex items-center gap-4">
              <img src="${item.image || item.images?.[0] || 'image/placeholder.jpg'}" 
                   alt="${item.title}" 
                   class="w-16 h-16 object-cover rounded-lg border"
                   onerror="this.src='image/placeholder.jpg'"/>
              <div class="flex-1">
                <p class="font-medium">${item.title}</p>
                ${item.size ? `<p class="text-sm text-gray-500">Size: ${item.size}</p>` : ''}
                <p class="text-sm text-gray-500">Qty: ${item.quantity} × ₹${item.price}</p>
              </div>
              <span class="font-medium text-lg">₹${item.price * item.quantity}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="border-t pt-4">
        <div class="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹${order.totals?.grandTotal || order.totals?.total || 0}</span>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('orderModal').classList.remove('hidden');
  document.getElementById('orderModal').classList.add('flex');
};

window.closeOrderModal = function() {
  document.getElementById('orderModal').classList.add('hidden');
  document.getElementById('orderModal').classList.remove('flex');
};

// ============ STORE SETTINGS ============

async function loadStoreConfig() {
  const result = await getStoreConfig();
  if (result.success) {
    storeConfig = result.store;
    populateStoreForm();
  }
}

function populateStoreForm() {
  document.getElementById('storeName').value = storeConfig.name || '';
  document.getElementById('storeDescription').value = storeConfig.description || '';
  document.getElementById('storeLogo').value = storeConfig.logo || '';
  document.getElementById('storeBanner').value = storeConfig.bannerImage || '';
  document.getElementById('storePhone').value = storeConfig.contact?.phoneE164 || '';
  document.getElementById('storeEmail').value = storeConfig.contact?.email || '';
  document.getElementById('storeUpiId').value = storeConfig.payments?.gpayUpiId || '';
  document.getElementById('storeQr').value = storeConfig.payments?.gpayQrImage || '';
  
  // Delivery settings
  document.getElementById('storeFreeShipping').value = storeConfig.pricing?.freeShippingMin || 999;
  document.getElementById('storeShippingPolicy').value = storeConfig.delivery?.shippingPolicy || '';
  
  // Abroad settings
  const abroad = storeConfig.abroad || {};
  document.getElementById('abroadEnabled').checked = abroad.enabled === true;
  document.getElementById('abroadBaseCharge').value = abroad.baseCharge || '';
  document.getElementById('abroadPerKg').value = abroad.perKgRate || '';
  document.getElementById('abroadDays').value = abroad.estimatedDays || '';
  document.getElementById('abroadCountries').value = (abroad.countries || []).join(', ');
  
  // Razorpay settings
  const razorpay = storeConfig.razorpay || {};
  document.getElementById('razorpayKeyId').value = razorpay.keyId || '';
  document.getElementById('razorpayWorkerUrl').value = razorpay.workerUrl || '';
  
  // Cloudinary settings
  const cloudinary = storeConfig.cloudinary || {};
  document.getElementById('cloudinaryCloudName').value = cloudinary.cloudName || '';
  document.getElementById('cloudinaryUploadPreset').value = cloudinary.uploadPreset || '';
  
  // Render delivery rates table
  renderDeliveryRates();
}

function renderDeliveryRates() {
  const tbody = document.getElementById('deliveryRatesTable');
  const rates = storeConfig.delivery?.rates || [];
  
  if (rates.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="px-3 py-4 text-center text-gray-500">No delivery rates configured</td></tr>';
    return;
  }
  
  tbody.innerHTML = rates.map((r, index) => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
      <td class="px-3 py-2">${r.state}</td>
      <td class="px-3 py-2 text-gray-500">${r.region || ''}</td>
      <td class="px-3 py-2 font-medium">₹${r.charge_inr}</td>
      <td class="px-3 py-2">
        <button type="button" onclick="editDeliveryRate(${index})" class="text-blue-600 hover:underline text-xs mr-2">Edit</button>
        <button type="button" onclick="deleteDeliveryRate(${index})" class="text-red-600 hover:underline text-xs">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Delivery Rate Modal
window.openDeliveryRateModal = function(index = null) {
  document.getElementById('deliveryRateForm').reset();
  document.getElementById('deliveryRateIndex').value = '';
  document.getElementById('deliveryRateModalTitle').textContent = 'Add Delivery Rate';
  
  if (index !== null && index !== '') {
    const rates = storeConfig.delivery?.rates || [];
    const rate = rates[index];
    if (rate) {
      document.getElementById('deliveryRateModalTitle').textContent = 'Edit Delivery Rate';
      document.getElementById('deliveryRateIndex').value = index;
      document.getElementById('deliveryState').value = rate.state;
      document.getElementById('deliveryRegion').value = rate.region || 'South India';
      document.getElementById('deliveryCharge').value = rate.charge_inr;
    }
  }
  
  document.getElementById('deliveryRateModal').classList.remove('hidden');
  document.getElementById('deliveryRateModal').classList.add('flex');
};

window.closeDeliveryRateModal = function() {
  document.getElementById('deliveryRateModal').classList.add('hidden');
  document.getElementById('deliveryRateModal').classList.remove('flex');
};

window.editDeliveryRate = function(index) {
  openDeliveryRateModal(index);
};

window.deleteDeliveryRate = async function(index) {
  if (!confirm('Delete this delivery rate?')) return;
  
  const rates = [...(storeConfig.delivery?.rates || [])];
  rates.splice(index, 1);
  
  const result = await updateStoreConfig({
    delivery: {
      ...storeConfig.delivery,
      rates
    }
  });
  
  if (result.success) {
    storeConfig.delivery = storeConfig.delivery || {};
    storeConfig.delivery.rates = rates;
    renderDeliveryRates();
  } else {
    alert('Error: ' + result.error);
  }
};

document.getElementById('deliveryRateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const indexVal = document.getElementById('deliveryRateIndex').value;
  const newRate = {
    state: document.getElementById('deliveryState').value,
    region: document.getElementById('deliveryRegion').value,
    charge_inr: parseFloat(document.getElementById('deliveryCharge').value) || 0
  };
  
  const rates = [...(storeConfig.delivery?.rates || [])];
  
  if (indexVal !== '' && indexVal !== null) {
    rates[parseInt(indexVal)] = newRate;
  } else {
    rates.push(newRate);
  }
  
  const result = await updateStoreConfig({
    delivery: {
      ...storeConfig.delivery,
      rates
    }
  });
  
  if (result.success) {
    storeConfig.delivery = storeConfig.delivery || {};
    storeConfig.delivery.rates = rates;
    renderDeliveryRates();
    closeDeliveryRateModal();
  } else {
    alert('Error: ' + result.error);
  }
});

document.getElementById('storeSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const abroadCountriesVal = document.getElementById('abroadCountries').value;
  
  const updates = {
    name: document.getElementById('storeName').value,
    description: document.getElementById('storeDescription').value,
    logo: document.getElementById('storeLogo').value,
    bannerImage: document.getElementById('storeBanner').value,
    contact: {
      phoneE164: document.getElementById('storePhone').value,
      email: document.getElementById('storeEmail').value
    },
    payments: {
      gpayUpiId: document.getElementById('storeUpiId').value,
      gpayQrImage: document.getElementById('storeQr').value
    },
    pricing: {
      ...storeConfig.pricing,
      freeShippingMin: parseFloat(document.getElementById('storeFreeShipping').value) || 999
    },
    delivery: {
      ...storeConfig.delivery,
      shippingPolicy: document.getElementById('storeShippingPolicy').value
    },
    abroad: {
      enabled: document.getElementById('abroadEnabled').checked,
      baseCharge: parseFloat(document.getElementById('abroadBaseCharge').value) || 0,
      perKgRate: parseFloat(document.getElementById('abroadPerKg').value) || 0,
      estimatedDays: document.getElementById('abroadDays').value,
      countries: abroadCountriesVal.split(',').map(s => s.trim()).filter(Boolean)
    },
    razorpay: {
      keyId: document.getElementById('razorpayKeyId').value.trim(),
      workerUrl: document.getElementById('razorpayWorkerUrl').value.trim()
    },
    cloudinary: {
      cloudName: document.getElementById('cloudinaryCloudName').value.trim(),
      uploadPreset: document.getElementById('cloudinaryUploadPreset').value.trim()
    }
  };
  
  const result = await updateStoreConfig(updates);
  if (result.success) {
    alert('✅ Store settings saved!');
    await loadStoreConfig();
  } else {
    alert('Error: ' + result.error);
  }
});

// ============ NEWS ============

async function loadNews() {
  const result = await getAllNews();
  if (result.success) {
    news = result.news;
    renderNews();
  }
}

function renderNews() {
  const list = document.getElementById('newsList');
  
  if (news.length === 0) {
    list.innerHTML = '<div class="bg-white dark:bg-background-dark border rounded-lg p-6 text-center text-gray-500">No news items</div>';
    return;
  }
  
  list.innerHTML = news.map(n => `
    <div class="bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start justify-between">
      <div class="flex gap-4">
        ${n.media?.[0] ? `<img src="${n.media[0]}" class="w-20 h-20 object-cover rounded"/>` : ''}
        <div>
          <h4 class="font-bold">${n.title}</h4>
          <p class="text-sm text-gray-500 line-clamp-2">${n.content || ''}</p>
          <span class="text-xs ${n.active ? 'text-green-600' : 'text-red-600'}">${n.active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="editNews('${n.id}')" class="text-blue-600 hover:underline text-sm">Edit</button>
        <button onclick="confirmDeleteNews('${n.id}')" class="text-red-600 hover:underline text-sm">Delete</button>
      </div>
    </div>
  `).join('');
}

window.openNewsModal = function(newsId = null) {
  document.getElementById('newsForm').reset();
  document.getElementById('newsId').value = '';
  document.getElementById('newsModalTitle').textContent = 'Add News';
  
  if (newsId) {
    const n = news.find(x => x.id === newsId);
    if (n) {
      document.getElementById('newsModalTitle').textContent = 'Edit News';
      document.getElementById('newsId').value = n.id;
      document.getElementById('newsTitle').value = n.title || '';
      document.getElementById('newsContent').value = n.content || '';
      document.getElementById('newsImage').value = n.media?.[0] || '';
      document.getElementById('newsActive').checked = n.active !== false;
    }
  }
  
  document.getElementById('newsModal').classList.remove('hidden');
  document.getElementById('newsModal').classList.add('flex');
};

window.closeNewsModal = function() {
  document.getElementById('newsModal').classList.add('hidden');
  document.getElementById('newsModal').classList.remove('flex');
};

window.editNews = function(id) {
  openNewsModal(id);
};

window.confirmDeleteNews = async function(id) {
  if (confirm('Are you sure you want to delete this news item?')) {
    const result = await deleteNews(id);
    if (result.success) {
      await loadNews();
    } else {
      alert('Error: ' + result.error);
    }
  }
};

document.getElementById('newsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newsId = document.getElementById('newsId').value;
  const imageUrl = document.getElementById('newsImage').value;
  
  const newsData = {
    title: document.getElementById('newsTitle').value,
    content: document.getElementById('newsContent').value,
    media: imageUrl ? [imageUrl] : [],
    active: document.getElementById('newsActive').checked
  };
  
  let result;
  if (newsId) {
    result = await updateNews(newsId, newsData);
  } else {
    result = await addNews(newsData);
  }
  
  if (result.success) {
    closeNewsModal();
    await loadNews();
  } else {
    alert('Error: ' + result.error);
  }
});

// ============ DASHBOARD STATS ============

function updateDashboardStats() {
  document.getElementById('totalProducts').textContent = products.length;
  document.getElementById('totalOrders').textContent = orders.length;
  document.getElementById('totalCategories').textContent = categories.length;
  document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'pending').length;
  
  // Recent orders
  const recentList = document.getElementById('recentOrdersList');
  const recent = orders.slice(0, 5);
  
  if (recent.length === 0) {
    recentList.innerHTML = '<p class="text-gray-500">No orders yet</p>';
    return;
  }
  
  recentList.innerHTML = recent.map(o => {
    const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : 'N/A';
    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <span class="font-medium">${o.customer?.name || 'Guest'}</span>
          <span class="text-sm text-gray-500 ml-2">₹${o.totals?.grandTotal || 0}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">${o.status || 'pending'}</span>
          <span class="text-xs text-gray-500">${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============ CLOUDINARY IMAGE UPLOAD ============

// Open Cloudinary upload widget
window.openImageUpload = function(inputId, multiple = false) {
  const cloudName = storeConfig.cloudinary?.cloudName;
  const uploadPreset = storeConfig.cloudinary?.uploadPreset;
  
  if (!cloudName || !uploadPreset) {
    alert('⚠️ Please configure Cloudinary settings first!\n\nGo to Store Settings → Cloudinary Image Hosting and enter your Cloud Name and Upload Preset.');
    return;
  }
  
  const widget = cloudinary.createUploadWidget(
    {
      cloudName: cloudName,
      uploadPreset: uploadPreset,
      sources: ['local', 'url'], // Removed camera for cleaner UI
      showPoweredBy: false, // Attempt to hide branding
      clientAllowedFormats: ["png", "gif", "jpeg", "jpg", "webp"], // Restrict files
      multiple: multiple,
      maxFiles: multiple ? 10 : 1,
      maxFileSize: 10000000, // 10MB
      resourceType: 'image',
      cropping: false,
      showAdvancedOptions: false,
      showCompletedButton: true,
      singleUploadAutoClose: !multiple,
      styles: {
        palette: {
          window: "#FFFFFF",
          windowBorder: "#90A0B3",
          tabIcon: "#df20df",
          menuIcons: "#5A616A",
          textDark: "#000000",
          textLight: "#FFFFFF",
          link: "#df20df",
          action: "#df20df",
          inactiveTabIcon: "#0E2F5A",
          error: "#F44235",
          inProgress: "#df20df",
          complete: "#20B832",
          sourceBg: "#E4EBF1"
        }
      }
    },
    (error, result) => {
      if (!error && result && result.event === 'success') {
        const url = result.info.secure_url;
        const inputEl = document.getElementById(inputId);
        
        if (multiple) {
          // For multiple images, append to existing URLs
          const existingUrls = inputEl.value.split(',').map(s => s.trim()).filter(Boolean);
          existingUrls.push(url);
          inputEl.value = existingUrls.join(', ');
        } else {
          // For single image, replace
          inputEl.value = url;
        }
        
        // Update preview
        updateImagePreview(inputId);
      }
      
      if (result && result.event === 'close') {
        widget.destroy();
      }
    }
  );
  
  widget.open();
};

// Update image preview based on input value
window.updateImagePreview = function(inputId) {
  const inputEl = document.getElementById(inputId);
  const previewEl = document.getElementById(inputId + 'Preview');
  
  if (!previewEl) return;
  
  const urls = inputEl.value.split(',').map(s => s.trim()).filter(Boolean);
  
  if (urls.length === 0) {
    previewEl.innerHTML = '';
    return;
  }
  
  previewEl.innerHTML = urls.map((url, index) => `
    <div class="image-preview">
      <img src="${url}" alt="Preview ${index + 1}" class="w-16 h-16 object-cover rounded-lg border" onerror="this.src='image/placeholder.jpg'"/>
      <button type="button" onclick="removeImage('${inputId}', ${index})" class="remove-btn" title="Remove">×</button>
    </div>
  `).join('');
};

// Remove image from preview
window.removeImage = function(inputId, index) {
  const inputEl = document.getElementById(inputId);
  const urls = inputEl.value.split(',').map(s => s.trim()).filter(Boolean);
  
  urls.splice(index, 1);
  inputEl.value = urls.join(', ');
  
  updateImagePreview(inputId);
};

// ============ UTILS ============

function generateSkuString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TS-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

window.generateNewSku = function() {
  document.getElementById('productSku').value = generateSkuString();
};
