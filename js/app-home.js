(function() {
  const CART_KEY = 'whshop_cart_v1';
  let store = null;
  let categories = [];
  let products = [];
  let filterCat = null;

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
    
    // Show feedback
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
        <div class="flex justify-between font-bold text-lg">
          <span>Subtotal</span>
          <span>${money(totals.subtotal)}</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Shipping will be calculated at checkout based on your state</p>
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
    // Shipping will be calculated at checkout based on selected state
    // No tax or shipping shown in cart drawer
    return { subtotal };
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
    
    if (!query || query.length < 2) {
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
    
    // Show loading state
    resultsDiv.innerHTML = `
      <div class="text-center py-12">
        <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-black/60 dark:text-white/60">Searching...</p>
      </div>
    `;
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      performSearch(query, resultsDiv);
    }, 300);
  };
  
  function performSearch(query, resultsDiv) {
    // Smart search with relevance scoring
    const results = products
      .filter(p => p.available !== false)
      .map(product => {
        let score = 0;
        const title = product.title.toLowerCase();
        const desc = (product.description || '').toLowerCase();
        const shortDesc = (product.shortDescription || '').toLowerCase();
        const sku = product.sku.toLowerCase();
        const tags = (product.tags || []).map(t => t.toLowerCase());
        
        // Exact match gets highest score
        if (title === query) score += 100;
        else if (title.includes(query)) score += 50;
        else if (title.split(' ').some(word => word.startsWith(query))) score += 30;
        
        if (shortDesc.includes(query)) score += 20;
        if (desc.includes(query)) score += 10;
        if (sku.includes(query)) score += 15;
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
          <p class="mt-2 text-sm text-black/40 dark:text-white/40">Try different keywords or browse categories</p>
        </div>
      `;
      return;
    }
    
    resultsDiv.innerHTML = `
      <div class="mb-4 px-1">
        <p class="text-sm text-black/60 dark:text-white/60">
          Found <span class="font-bold text-primary">${results.length}</span> result${results.length !== 1 ? 's' : ''} for "<span class="font-semibold">${query}</span>"
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${results.map(product => `
          <div class="group flex gap-3 p-3 bg-white dark:bg-gray-800 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/30" onclick="window.location.href='product.html?slug=${product.slug}'">
            <div class="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              <img src="${product.images?.[0] || 'image/placeholder.jpg'}" 
                   alt="${product.title}" 
                   class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                   onerror="this.src='image/placeholder.jpg'"/>
            </div>
            <div class="flex-1 min-w-0 flex flex-col">
              <h3 class="font-semibold text-black dark:text-white line-clamp-2 text-sm group-hover:text-primary transition-colors">${product.title}</h3>
              <p class="text-xs text-black/50 dark:text-white/50 line-clamp-1 mt-1">${product.shortDescription || product.sku}</p>
              <div class="mt-auto flex items-center justify-between">
                <p class="text-primary font-bold text-base">${money(product.price)}</p>
                ${product.stock > 0 ? '<span class="text-xs text-green-600 dark:text-green-400 font-medium">In Stock</span>' : '<span class="text-xs text-red-600 dark:text-red-400 font-medium">Out of Stock</span>'}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  async function loadStore() {
    try {
      const response = await fetch('data/store.json', { cache: 'no-cache' });
      store = await response.json();
      
      document.getElementById('storeName').textContent = store.name;
      document.getElementById('pageTitle').textContent = store.name;
      document.getElementById('heroTitle').textContent = store.name || '';
      document.getElementById('heroDesc').textContent = store.description || '';
      document.getElementById('footerStoreName').textContent = store.name;
      
      // Set logo
      if (store.logo) {
        const logoEl = document.getElementById('storeLogo');
        if (logoEl) {
          logoEl.src = store.logo;
        }
      }
      
      if (store.bannerImage) {
        document.getElementById('heroBanner').src = store.bannerImage;
      }
      
      if (store.contact?.phoneE164) {
        const whatsappUrl = `https://wa.me/${store.contact.phoneE164.replace(/[^\d]/g, '')}?text=Hi, I have a question`;
        document.getElementById('whatsappFooter').href = whatsappUrl;
      }
    } catch (error) {
      console.error('Error loading store:', error);
    }
  }

  async function loadCategories() {
    try {
      const response = await fetch('data/categories.json', { cache: 'no-cache' });
      categories = await response.json();
      
      const nav = document.getElementById('navCategories');
      const grid = document.getElementById('categoryGrid');
      
      // Nav links
      categories.filter(c => c.active && !c.parentId).slice(0, 5).forEach(cat => {
        const link = document.createElement('a');
        link.className = 'text-sm font-medium text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white cursor-pointer';
        link.textContent = cat.name;
        link.onclick = () => window.location.href = `category.html?category=${cat.slug}`;
        nav.appendChild(link);
      });
      
      // Horizontal scrollable category list with circular images
      const activeCategories = categories.filter(c => c.active && !c.parentId);
      
      grid.className = 'flex gap-6 overflow-x-auto pb-4 scrollbar-hide';
      grid.style.scrollBehavior = 'smooth';
      
      activeCategories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'flex-shrink-0 text-center cursor-pointer group';
        div.onclick = () => window.location.href = `category.html?category=${cat.slug}`;
        div.style.width = '110px';
        div.innerHTML = `
          <div class="w-[110px] h-[110px] rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-3 ring-2 ring-transparent group-hover:ring-primary transition-all duration-300">
            <img alt="${cat.name}" 
                 class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" 
                 src="${cat.image || 'https://via.placeholder.com/200?text=' + encodeURIComponent(cat.name)}"
                 onerror="this.src='image/placeholder.jpg'"/>
          </div>
          <h3 class="text-sm font-semibold text-black dark:text-white group-hover:text-primary transition-colors line-clamp-2">${cat.name}</h3>
        `;
        grid.appendChild(div);
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  function filterByCategory(catId) {
    filterCat = catId;
    renderProducts();
    document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
  }

  async function loadProducts() {
    try {
      const response = await fetch('data/products.json', { cache: 'no-cache' });
      products = await response.json();
      renderProducts();
      renderRecommended();
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  function renderProducts() {
    const grid = document.getElementById('productGrid');
    let filtered = products.filter(p => p.available !== false);
    
    if (filterCat) {
      filtered = filtered.filter(p => (p.categoryIds || []).includes(filterCat));
    }
    
    grid.innerHTML = filtered.slice(0, 8).map(product => `
      <div class="group flex flex-col h-full">
        <div class="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 mb-4 cursor-pointer" onclick="window.location.href='product.html?slug=${product.slug}'">
          <img alt="${product.title}" class="h-full w-full object-cover object-center group-hover:opacity-75 transition" src="${product.images?.[0] || ''}"/>
        </div>
        <div class="flex flex-col flex-grow">
          <h3 class="text-base font-semibold text-black dark:text-white cursor-pointer hover:text-primary line-clamp-2 min-h-[3rem]" onclick="window.location.href='product.html?slug=${product.slug}'">${product.title}</h3>
          <p class="mt-1 text-sm text-primary font-bold">${money(product.price)}</p>
          <button class="mt-auto w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary/90 transition" onclick="addToCart('${product.sku}', '${product.title}', ${product.price}, '${product.images?.[0] || ''}')">
            Add to Cart
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderRecommended() {
    const grid = document.getElementById('recommendedGrid');
    const recommended = products.filter(p => p.available !== false).slice(0, 4);
    
    grid.innerHTML = recommended.map(product => `
      <div class="group flex flex-col h-full">
        <div class="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 mb-4 cursor-pointer" onclick="window.location.href='product.html?slug=${product.slug}'">
          <img alt="${product.title}" class="h-full w-full object-cover object-center group-hover:opacity-75 transition" src="${product.images?.[0] || ''}"/>
        </div>
        <div class="flex flex-col flex-grow">
          <h3 class="text-base font-semibold text-black dark:text-white cursor-pointer hover:text-primary line-clamp-2 min-h-[3rem]" onclick="window.location.href='product.html?slug=${product.slug}'">${product.title}</h3>
          <p class="mt-1 text-sm text-primary font-bold">${money(product.price)}</p>
          <button class="mt-auto w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary/90 transition" onclick="addToCart('${product.sku}', '${product.title}', ${product.price}, '${product.images?.[0] || ''}')">
            Add to Cart
          </button>
        </div>
      </div>
    `).join('');
  }

  async function loadNews() {
    try {
      const response = await fetch('data/news.json', { cache: 'no-cache' });
      const news = await response.json();
      
      const activeNews = news.filter(n => n.active);
      if (activeNews.length > 0) {
        const promo = activeNews[0];
        document.getElementById('promoSection').style.display = 'block';
        document.getElementById('promoTitle').textContent = promo.title;
        document.getElementById('promoDesc').textContent = promo.content || '';
        
        if (promo.media?.[0]) {
          document.getElementById('promoImageContainer').innerHTML = `
            <img alt="${promo.title}" class="rounded-lg shadow-lg" src="${promo.media[0]}"/>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading news:', error);
    }
  }

  // Event listeners
  document.getElementById('cartButton').addEventListener('click', openCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Export addToCart globally
  window.addToCart = addToCart;

  // Initialize
  async function init() {
    updateCartBadge();
    await loadStore();
    await loadCategories();
    await loadProducts();
    await loadNews();
  }

  init();
})();
