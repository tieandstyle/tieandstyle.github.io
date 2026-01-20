// categories.js - Displays all categories

let allCategories = [];
let allProducts = [];

// Load store configuration
async function loadStoreConfig() {
  try {
    const response = await fetch('data/store.json', { cache: 'no-cache' });
    const config = await response.json();
    
    document.getElementById('storeName').textContent = config.name || 'My Shop';
    document.getElementById('footerStoreName').textContent = config.name || 'My Shop';
    document.getElementById('pageTitle').textContent = `Categories - ${config.name || 'My Shop'}`;
    
    // Set logo if available
    if (config.logo) {
      document.getElementById('storeLogo').src = config.logo;
    }
  } catch (error) {
    console.error('Error loading store config:', error);
  }
}

// Load all products - Try Firestore first, fallback to JSON
async function loadProducts() {
  try {
    // Try Firestore first
    const { getProducts } = await import('./firebase-config.js');
    const result = await getProducts(500);
    
    if (result.success && result.products.length > 0) {
      allProducts = result.products;
      console.log('✅ Products loaded from Firestore:', allProducts.length);
      return;
    }
    throw new Error('Firestore empty or failed');
  } catch (firestoreError) {
    console.log('⚠️ Firestore unavailable, falling back to JSON:', firestoreError.message);
    // Fallback to JSON
    try {
      const response = await fetch('data/products.json', { cache: 'no-cache' });
      allProducts = await response.json();
      console.log('✅ Products loaded from JSON fallback:', allProducts.length);
    } catch (jsonError) {
      console.error('Error loading products from JSON:', jsonError);
      allProducts = [];
    }
  }
}

// Count products per category
function countProductsInCategory(categoryId) {
  return allProducts.filter(product => 
    product.categoryIds && product.categoryIds.includes(categoryId) && product.available
  ).length;
}

// Load all categories - Try Firestore first, fallback to JSON
async function loadCategories() {
  try {
    // Load products first to count them
    await loadProducts();
    
    let categoriesData = [];
    
    // Try Firestore first
    try {
      const { getCategories } = await import('./firebase-config.js');
      const result = await getCategories();
      
      if (result.success && result.categories.length > 0) {
        categoriesData = result.categories;
        console.log('✅ Categories loaded from Firestore:', categoriesData.length);
      } else {
        throw new Error('Firestore empty or failed');
      }
    } catch (firestoreError) {
      console.log('⚠️ Firestore unavailable for categories, falling back to JSON:', firestoreError.message);
      // Fallback to JSON
      const response = await fetch('data/categories.json', { cache: 'no-cache' });
      categoriesData = await response.json();
      console.log('✅ Categories loaded from JSON fallback:', categoriesData.length);
    }
    
    allCategories = categoriesData
      .filter(cat => cat.active)
      .map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || 'image/placeholder.jpg',
        productCount: countProductsInCategory(category.id),
        order: category.order || 0
      }))
      .sort((a, b) => a.order - b.order);
    
    renderCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    showError('Failed to load categories. Please refresh the page.');
  }
}


// Render categories
function renderCategories() {
  const categoryGrid = document.getElementById('categoryGrid');
  
  if (allCategories.length === 0) {
    categoryGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500">No categories available.</p>
      </div>
    `;
    return;
  }
  
  categoryGrid.innerHTML = allCategories.map(category => `
    <div class="category-card group cursor-pointer" onclick="goToCategory('${category.id}', '${category.name}')">
      <div class="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
        <div class="aspect-square overflow-hidden">
          <img 
            src="${category.image}" 
            alt="${category.name}"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            onerror="this.src='image/placeholder.jpg'"
          />
        </div>
        <div class="p-4">
          <h3 class="text-lg font-bold text-black dark:text-white mb-1 line-clamp-1">${category.name}</h3>
          ${category.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">${category.description}</p>` : ''}
          <div class="flex items-center justify-between mt-3">
            <span class="text-sm text-primary font-semibold">${category.productCount} Products</span>
            <svg class="w-5 h-5 text-primary transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Navigate to category page
function goToCategory(categoryId, categoryName) {
  window.location.href = `category.html?category=${encodeURIComponent(categoryId)}`;
}

// Show error message
function showError(message) {
  const categoryGrid = document.getElementById('categoryGrid');
  categoryGrid.innerHTML = `
    <div class="col-span-full text-center py-12">
      <div class="text-red-500 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <p class="text-gray-600 dark:text-gray-400">${message}</p>
    </div>
  `;
}

// Cart functionality
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  }
}

function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer && overlay) {
    drawer.classList.remove('translate-x-full');
    overlay.classList.add('open');
    updateCartContent();
  }
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer && overlay) {
    drawer.classList.add('translate-x-full');
    overlay.classList.remove('open');
  }
}

function updateCartContent() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartContent = document.getElementById('cartContent');
  
  if (cart.length === 0) {
    cartContent.innerHTML = '<div class="text-center py-12 text-gray-500">Your cart is empty</div>';
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  cartContent.innerHTML = `
    <div class="space-y-4">
      ${cart.map(item => `
        <div class="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded" onerror="this.src='image/placeholder.jpg'"/>
          <div class="flex-1">
            <h4 class="font-semibold">${item.name}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400">₹${item.price.toFixed(2)}</p>
            <p class="text-sm">Qty: ${item.quantity}</p>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div class="flex justify-between font-bold text-lg mb-4">
        <span>Total:</span>
        <span>₹${total.toFixed(2)}</span>
      </div>
      <button onclick="window.location.href='cart.html'" class="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition">
        View Cart
      </button>
    </div>
  `;
}

// Search functionality
function openSearch() {
  const modal = document.getElementById('searchModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('searchInput').focus();
  }
}

function closeSearch() {
  const modal = document.getElementById('searchModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '<div class="text-center py-12 text-black/40 dark:text-white/40">Start typing to search products...</div>';
  }
}

async function handleSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const resultsDiv = document.getElementById('searchResults');
  
  if (query.length < 2) {
    resultsDiv.innerHTML = `
      <div class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-black/20 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p class="mt-4 text-black/40 dark:text-white/40">Type at least 2 characters to search...</p>
      </div>
    `;
    return;
  }
  
  resultsDiv.innerHTML = `
    <div class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-black/60 dark:text-white/60">Searching...</p>
    </div>
  `;
  
  try {
    const response = await fetch('data/products.json', { cache: 'no-cache' });
    const products = await response.json();
    
    // Smart search with scoring
    const results = products
      .filter(p => p.available !== false)
      .map(product => {
        let score = 0;
        const title = product.title.toLowerCase();
        const desc = (product.description || '').toLowerCase();
        const shortDesc = (product.shortDescription || '').toLowerCase();
        const tags = (product.tags || []).map(t => t.toLowerCase());
        
        if (title === query) score += 100;
        else if (title.includes(query)) score += 50;
        if (shortDesc.includes(query)) score += 20;
        if (desc.includes(query)) score += 10;
        if (tags.some(tag => tag.includes(query))) score += 25;
        
        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(item => item.product);
    
    if (results.length === 0) {
      resultsDiv.innerHTML = `
        <div class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-black/20 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="mt-4 text-black/60 dark:text-white/60 font-medium">No products found for "${query}"</p>
        </div>
      `;
      return;
    }
    
    resultsDiv.innerHTML = `
      <div class="mb-4">
        <p class="text-sm text-black/60 dark:text-white/60">
          Found <span class="font-bold text-primary">${results.length}</span> result${results.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${results.map(product => `
          <div class="group flex gap-3 p-3 bg-white dark:bg-gray-800 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg cursor-pointer transition-all border border-transparent hover:border-primary/30" onclick="window.location.href='product.html?id=${product.id}'">
            <div class="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              <img src="${product.images?.[0] || 'image/placeholder.jpg'}" 
                   alt="${product.title}" 
                   class="w-full h-full object-cover group-hover:scale-110 transition-transform"
                   onerror="this.src='image/placeholder.jpg'"/>
            </div>
            <div class="flex-1 min-w-0 flex flex-col">
              <h4 class="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">${product.title}</h4>
              <p class="text-xs text-black/50 dark:text-white/50 line-clamp-1 mt-1">${product.shortDescription || ''}</p>
              <div class="mt-auto flex items-center justify-between">
                <p class="text-primary font-bold">₹${product.price?.toFixed(2) || '0.00'}</p>
                ${product.stock > 0 ? '<span class="text-xs text-green-600 font-medium">In Stock</span>' : '<span class="text-xs text-red-600 font-medium">Out</span>'}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Search error:', error);
    resultsDiv.innerHTML = '<div class="text-center py-12 text-red-500">Search failed. Please try again.</div>';
  }
}

// Event listeners
document.getElementById('cartButton')?.addEventListener('click', openCart);
document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

// Make functions globally available
window.goToCategory = goToCategory;
window.openCart = openCart;
window.closeCart = closeCart;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.handleSearch = handleSearch;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadStoreConfig();
  loadCategories();
  updateCartBadge();
});
