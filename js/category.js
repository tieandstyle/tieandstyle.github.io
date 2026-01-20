(function() {
  const CART_KEY = 'whshop_cart_v1';
  let store = null;
  let categories = [];
  let subcategories = [];
  let products = [];
  let currentCategory = null;
  let currentSubcategory = null;
  let priceFilters = [];
  let inStockOnly = false;

  function money(n) {
    return `₹${n.toFixed(2)}`;
  }

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const cart = loadCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartBadge').textContent = count;
  }

  function addToCart(sku, title, price, image) {
    const cart = loadCart();
    const existing = cart.find(item => item.sku === sku);
    
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ sku, title, price, image, quantity: 1 });
    }
    
    saveCart(cart);
    showNotification('✅ Added to cart!');
  }

  function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'fixed top-20 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), 2000);
  }

  window.openCart = function() {
    document.getElementById('cartDrawer').style.transform = 'translateX(0)';
    document.getElementById('cartOverlay').classList.add('open');
    renderCartDrawer();
  };

  window.closeCart = function() {
    document.getElementById('cartDrawer').style.transform = 'translateX(100%)';
    document.getElementById('cartOverlay').classList.remove('open');
  };

  function renderCartDrawer() {
    const cart = loadCart();
    const cartContent = document.getElementById('cartContent');
    
    if (cart.length === 0) {
      cartContent.innerHTML = '<div class="text-center py-12 text-gray-500">Your cart is empty</div>';
      return;
    }

    const totals = calculateTotals(cart);
    
    cartContent.innerHTML = `
      <div class="space-y-4">
        ${cart.map(item => `
          <div class="flex gap-4 p-4 border border-primary/20 rounded-lg">
            <div class="w-20 h-20 bg-gray-200 rounded-lg bg-cover bg-center" style="background-image: url('${item.image || ''}')"></div>
            <div class="flex-1">
              <h3 class="font-bold">${item.title}</h3>
              <p class="text-primary text-sm">${money(item.price)}</p>
              <div class="flex items-center gap-2 mt-2">
                <button class="w-8 h-8 border border-primary/30 rounded hover:bg-primary/20" onclick="updateCartQty('${item.sku}', -1)">-</button>
                <span class="px-3">${item.quantity}</span>
                <button class="w-8 h-8 border border-primary/30 rounded hover:bg-primary/20" onclick="updateCartQty('${item.sku}', 1)">+</button>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold">${money(item.price * item.quantity)}</p>
              <button class="text-xs text-red-500 hover:underline mt-2" onclick="removeFromCart('${item.sku}')">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="mt-6 border-t-2 border-primary/20 pt-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span>Subtotal</span>
          <span class="font-semibold">${money(totals.subtotal)}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span>Shipping</span>
          <span class="font-semibold">${money(totals.shipping)}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span>Tax (5%)</span>
          <span class="font-semibold">${money(totals.tax)}</span>
        </div>
        <div class="flex justify-between font-bold text-lg border-t border-primary/20 pt-2">
          <span>Total</span>
          <span>${money(totals.total)}</span>
        </div>
      </div>
      
      <div class="mt-6 space-y-3">
        <button class="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition" onclick="window.location.href='cart.html'">
          Proceed to Checkout
        </button>
        <button class="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition" onclick="closeCart()">
          Continue Shopping
        </button>
      </div>
    `;
  }

  function calculateTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 500 ? 0 : 60;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  }

  window.updateCartQty = function(sku, delta) {
    const cart = loadCart();
    const item = cart.find(i => i.sku === sku);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(sku);
      return;
    }
    
    saveCart(cart);
    renderCartDrawer();
  };

  window.removeFromCart = function(sku) {
    let cart = loadCart();
    cart = cart.filter(item => item.sku !== sku);
    saveCart(cart);
    renderCartDrawer();
  };

  async function loadStore() {
    try {
      const response = await fetch('data/store.json', { cache: 'no-cache' });
      store = await response.json();
      
      document.getElementById('storeName').textContent = store.name;
      document.getElementById('footerStoreName').textContent = store.name;
      document.getElementById('pageTitle').textContent = `${currentCategory?.name || 'Category'} - ${store.name}`;
      
      // Set logo
      if (store.logo) {
        const logoEl = document.getElementById('storeLogo');
        if (logoEl) {
          logoEl.src = store.logo;
        }
      }
    } catch (error) {
      console.error('Error loading store:', error);
    }
  }

  async function loadCategories() {
    try {
      // Try Firestore first
      try {
        const { getCategories, getSubcategories } = await import('./firebase-config.js');
        const [catResult, subcatResult] = await Promise.all([
          getCategories(),
          getSubcategories()
        ]);
        
        if (catResult.success && catResult.categories.length > 0) {
          categories = catResult.categories;
          console.log('✅ Categories loaded from Firestore:', categories.length);
        } else {
          throw new Error('Firestore categories empty');
        }
        
        if (subcatResult.success) {
          subcategories = subcatResult.subcategories;
          console.log('✅ Subcategories loaded from Firestore:', subcategories.length);
        }
      } catch (firestoreError) {
        console.log('⚠️ Firestore unavailable, falling back to JSON:', firestoreError.message);
        // Fallback to JSON
        const response = await fetch('data/categories.json', { cache: 'no-cache' });
        categories = await response.json();
        
        const subcatResponse = await fetch('data/subcategories.json', { cache: 'no-cache' });
        subcategories = await subcatResponse.json();
        console.log('✅ Categories loaded from JSON fallback');
      }
      
      // Get category from URL
      const params = new URLSearchParams(window.location.search);
      const categorySlug = params.get('category');
      const subcategorySlug = params.get('subcategory');
      
      if (categorySlug) {
        currentCategory = categories.find(c => c.slug === categorySlug);
        if (currentCategory) {
          document.getElementById('categoryTitle').textContent = currentCategory.name;
          
          // Load subcategories for this category
          const categorySubcats = subcategories.filter(sc => sc.parentCategoryId === currentCategory.id && sc.active);
          if (categorySubcats.length > 0) {
            renderSubcategoryFilters(categorySubcats);
          }
          
          // Check if a subcategory is selected
          if (subcategorySlug) {
            currentSubcategory = subcategories.find(sc => sc.slug === subcategorySlug);
          }
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  function renderSubcategoryFilters(subcategories) {
    const filterSection = document.getElementById('subcategoryFilter');
    const filterList = document.getElementById('subcategoryFilterList');
    
    filterSection.style.display = 'block';
    
    filterList.innerHTML = subcategories.map(subcat => `
      <label class="flex items-center gap-2 cursor-pointer group">
        <input type="radio" name="subcategory" class="rounded-full border-stone-300 dark:border-stone-700 text-primary focus:ring-primary" 
               value="${subcat.id}" 
               ${currentSubcategory?.id === subcat.id ? 'checked' : ''} 
               onchange="filterBySubcategory('${subcat.slug}')">
        <span class="text-sm text-stone-900 dark:text-stone-100 group-hover:text-primary transition">${subcat.name}</span>
      </label>
    `).join('');
    
    // Update active filters display
    updateActiveFiltersDisplay();
  }

  window.filterBySubcategory = function(subcategorySlug) {
    const params = new URLSearchParams(window.location.search);
    params.set('subcategory', subcategorySlug);
    window.location.search = params.toString();
  };

  window.clearSubcategoryFilter = function() {
    const params = new URLSearchParams(window.location.search);
    params.delete('subcategory');
    window.location.search = params.toString();
  };

  function updateActiveFiltersDisplay() {
    const activeFiltersSection = document.getElementById('activeFiltersSection');
    const activeFiltersList = document.getElementById('activeFiltersList');
    const filters = [];
    
    // Add subcategory filter if active
    if (currentSubcategory) {
      filters.push({
        type: 'subcategory',
        label: currentSubcategory.name,
        action: 'clearSubcategoryFilter()'
      });
    }
    
    // Add price filters
    priceFilters.forEach(range => {
      const [min, max] = range.split('-').map(Number);
      let label = '';
      if (max === 999) {
        label = `₹${min}+`;
      } else {
        label = `₹${min} - ₹${max}`;
      }
      filters.push({
        type: 'price',
        label: label,
        value: range,
        action: `removePriceFilter('${range}')`
      });
    });
    
    // Add stock filter
    if (inStockOnly) {
      filters.push({
        type: 'stock',
        label: 'In Stock',
        action: 'removeStockFilter()'
      });
    }
    
    if (filters.length === 0) {
      activeFiltersSection.classList.add('hidden');
      return;
    }
    
    activeFiltersSection.classList.remove('hidden');
    activeFiltersList.innerHTML = filters.map(filter => `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
        ${filter.label}
        <button class="ml-1 hover:text-primary/70" onclick="${filter.action}">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
          </svg>
        </button>
      </span>
    `).join('');
  }

  window.removePriceFilter = function(range) {
    const checkbox = document.querySelector(`input[type="checkbox"][value="${range}"]`);
    if (checkbox) {
      checkbox.checked = false;
    }
    priceFilters = priceFilters.filter(f => f !== range);
    updateActiveFiltersDisplay();
    renderProducts();
  };

  window.removeStockFilter = function() {
    const availFilter = document.getElementById('availabilityFilter');
    if (availFilter) {
      availFilter.value = 'all';
    }
    inStockOnly = false;
    updateActiveFiltersDisplay();
    renderProducts();
  };

  window.toggleMobileFilters = function() {
    const panel = document.getElementById('filterPanel');
    const icon = document.getElementById('filterToggleIcon');
    
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      icon.style.transform = 'rotate(180deg)';
    } else {
      panel.classList.add('hidden');
      icon.style.transform = 'rotate(0deg)';
    }
  };

  window.applyFilters = function() {
    // Get price filters
    const priceCheckboxes = document.querySelectorAll('input[type="checkbox"][value*="-"]');
    priceFilters = Array.from(priceCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    // Get stock filter from select
    const availFilter = document.getElementById('availabilityFilter');
    if (availFilter) {
      if (availFilter.value === 'instock') {
        inStockOnly = true;
      } else {
        inStockOnly = false;
      }
    }
    
    updateActiveFiltersDisplay();
    renderProducts();
  };

  window.clearAllFilters = function() {
    // Clear price filters
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Clear subcategory
    document.querySelectorAll('input[name="subcategory"]').forEach(radio => radio.checked = false);
    
    // Clear availability filter
    const availFilter = document.getElementById('availabilityFilter');
    if (availFilter) {
      availFilter.value = 'all';
    }
    
    priceFilters = [];
    inStockOnly = false;
    currentSubcategory = null;
    
    // Remove subcategory from URL
    const params = new URLSearchParams(window.location.search);
    params.delete('subcategory');
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    
    updateActiveFiltersDisplay();
    renderProducts();
  };

  async function loadProducts() {
    try {
      // Try Firestore first
      try {
        const { getProducts } = await import('./firebase-config.js');
        const result = await getProducts(500);
        
        if (result.success && result.products.length > 0) {
          products = result.products;
          console.log('✅ Products loaded from Firestore:', products.length);
          renderProducts();
          return;
        }
        throw new Error('Firestore products empty');
      } catch (firestoreError) {
        console.log('⚠️ Firestore unavailable, falling back to JSON:', firestoreError.message);
        // Fallback to JSON
        const response = await fetch('data/products.json', { cache: 'no-cache' });
        products = await response.json();
        console.log('✅ Products loaded from JSON fallback:', products.length);
        renderProducts();
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  function renderProducts() {
    const grid = document.getElementById('productGrid');
    let filtered = products.filter(p => p.available !== false);
    
    // Filter by category
    if (currentCategory) {
      filtered = filtered.filter(p => (p.categoryIds || []).includes(currentCategory.id));
    }
    
    // Filter by subcategory
    if (currentSubcategory) {
      filtered = filtered.filter(p => p.subcategoryId === currentSubcategory.id);
    }
    
    // Filter by price range
    if (priceFilters.length > 0) {
      filtered = filtered.filter(p => {
        return priceFilters.some(range => {
          const [min, max] = range.split('-').map(Number);
          return p.price >= min && p.price <= max;
        });
      });
    }
    
    // Filter by stock
    if (inStockOnly) {
      filtered = filtered.filter(p => p.stock > 0);
    }
    
    // Sort products
    const sortValue = document.getElementById('sortSelect').value;
    if (sortValue === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortValue === 'name') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    // Update product count and breadcrumb
    const countText = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
    document.getElementById('productCount').textContent = countText;
    if (currentCategory) {
      document.getElementById('breadcrumbCategory').textContent = currentCategory.name;
    }
    
    // Update active filters display
    updateActiveFiltersDisplay();
    
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-center text-stone-500 py-12">No products found matching your filters.</div>';
      return;
    }
    
    grid.innerHTML = filtered.map(product => `
      <div class="group relative flex flex-col h-full">
        <div class="aspect-square w-full overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800 relative cursor-pointer" onclick="window.location.href='product.html?slug=${product.slug}'">
          <img alt="${product.title}" 
               class="h-full w-full object-cover object-center group-hover:opacity-80 transition-opacity" 
               src="${product.images?.[0] || 'https://via.placeholder.com/400?text=' + encodeURIComponent(product.title)}"/>
          ${product.stock <= 0 ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center"><span class="text-white font-bold text-sm">Out of Stock</span></div>' : ''}
        </div>
        <div class="mt-4 flex flex-col flex-grow">
          <div class="flex justify-between items-start gap-2">
            <h3 class="text-sm text-stone-800 dark:text-stone-200 cursor-pointer hover:text-primary line-clamp-2 flex-grow min-h-[2.5rem]" onclick="window.location.href='product.html?slug=${product.slug}'">
              ${product.title}
            </h3>
            <p class="text-sm font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">${money(product.price)}</p>
          </div>
          ${product.subcategory ? `<p class="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-1">${product.subcategory}</p>` : ''}
          <button class="mt-auto w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary/90 transition" onclick="event.stopPropagation(); addToCart('${product.sku}', '${product.title}', ${product.price}, '${product.images?.[0] || ''}')">
            Add to Cart
          </button>
        </div>
      </div>
    `).join('');
  }

  // Event listeners
  document.getElementById('cartButton').addEventListener('click', openCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('sortSelect').addEventListener('change', renderProducts);

  // Export functions globally
  window.addToCart = addToCart;

  window.openSearch = function() {
    const modal = document.getElementById('searchModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('searchInput').focus();
  };

  window.closeSearch = function() {
    const modal = document.getElementById('searchModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '<div class="text-center py-12 text-black/40 dark:text-white/40">Start typing to search products...</div>';
  };

  window.handleSearch = function() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
      resultsDiv.innerHTML = '<div class="text-center py-12 text-black/40 dark:text-white/40">Start typing to search products...</div>';
      return;
    }
    
    const results = products.filter(p => 
      p.available !== false && (
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.shortDescription?.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        p.sku.toLowerCase().includes(query)
      )
    ).slice(0, 10);
    
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="text-center py-12 text-black/40 dark:text-white/40">No products found</div>';
      return;
    }
    
    resultsDiv.innerHTML = `
      <div class="space-y-3">
        ${results.map(product => `
          <div class="flex gap-4 p-3 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors" onclick="window.location.href='product.html?slug=${product.slug}'">
            <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              <img src="${product.images?.[0] || 'https://via.placeholder.com/100'}" alt="${product.title}" class="w-full h-full object-cover"/>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-black dark:text-white truncate">${product.title}</h3>
              <p class="text-sm text-black/60 dark:text-white/60 truncate">${product.shortDescription || ''}</p>
              <p class="text-primary font-bold mt-1">${money(product.price)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  // Initialize
  async function init() {
    updateCartBadge();
    await loadCategories();
    await loadStore();
    await loadProducts();
  }

  init();
})();
