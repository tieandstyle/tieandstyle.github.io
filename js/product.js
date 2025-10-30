(function() {
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.log('❌ Service Worker registration failed', err));
  }

  const CART_KEY = 'whshop_cart_v1';
  let store = null;
  let categories = [];
  let products = [];
  let currentProduct = null;
  let currentQuantity = 1;
  let selectedColor = null;

  function money(n) {
    return `₹${n.toFixed(2)}`;
  }

  function getColorHex(colorName) {
    const colorMap = {
      'red': '#EF4444',
      'blue': '#3B82F6',
      'green': '#10B981',
      'yellow': '#F59E0B',
      'pink': '#EC4899',
      'purple': '#A855F7',
      'black': '#1F2937',
      'white': '#F9FAFB',
      'gray': '#6B7280',
      'grey': '#6B7280',
      'brown': '#92400E',
      'orange': '#F97316',
      'beige': '#D4B896',
      'navy': '#1E3A8A',
      'maroon': '#7F1D1D',
      'gold': '#F59E0B',
      'silver': '#D1D5DB',
      'cream': '#FEF3C7',
      'olive': '#84CC16',
      'teal': '#14B8A6',
      'coral': '#FB7185',
      'mint': '#6EE7B7',
      'lavender': '#C4B5FD',
      'peach': '#FDBA74',
      'burgundy': '#991B1B',
      'turquoise': '#06B6D4'
    };
    
    return colorMap[colorName.toLowerCase()] || '#9CA3AF';
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

  function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-primary' : 'bg-red-500';
    notif.className = `fixed top-20 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce`;
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

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartContent.innerHTML = `
      <div class="space-y-4">
        ${cart.map(item => `
          <div class="flex gap-4 p-4 border border-primary/20 rounded-lg ${item.isAbroadOrder ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700' : ''}">
            <div class="w-20 h-20 bg-gray-200 rounded-lg bg-cover bg-center" style="background-image: url('${item.image || ''}')"></div>
            <div class="flex-1">
              <h3 class="font-bold flex items-center gap-2">
                ${item.isAbroadOrder ? '<span class="text-blue-600" title="International Order">🌍</span>' : ''}
                ${item.title}
              </h3>
              ${item.color ? `<p class="text-xs text-gray-600">Color: ${item.color}</p>` : ''}
              ${item.isAbroadOrder ? '<p class="text-xs text-blue-600 font-semibold">International Order</p>' : ''}
              <p class="text-primary text-sm">${money(item.price)}</p>
              <div class="flex items-center gap-2 mt-2">
                <button class="w-8 h-8 border border-primary/30 rounded hover:bg-primary/20" onclick="updateCartQty('${item.sku}', -1)">-</button>
                <span class="px-3">${item.quantity}</span>
                <button class="w-8 h-8 border border-primary/30 rounded hover:bg-primary/20" onclick="updateCartQty('${item.sku}', 1)">+</button>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold">${money(item.price * item.quantity)}</p>
              <button class="text-red-500 text-sm mt-2" onclick="removeFromCart('${item.sku}')">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="mt-6 pt-6 border-t-2 border-primary/20">
        <div class="flex justify-between text-lg font-bold mb-4">
          <span>Subtotal:</span>
          <span class="text-primary">${money(subtotal)}</span>
        </div>
        <button class="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition" onclick="window.location.href='checkout.html'">
          Proceed to Checkout
        </button>
      </div>
    `;
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

  window.updateQuantity = function(delta) {
    currentQuantity = Math.max(1, currentQuantity + delta);
    document.getElementById('quantity').value = currentQuantity;
  };

  window.selectColor = function(color) {
    selectedColor = color;
    
    // Update color buttons
    document.querySelectorAll('.color-option').forEach(btn => {
      if (btn.dataset.color === color) {
        btn.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      } else {
        btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }
    });
  };

  window.handleAddToCart = function() {
    if (!currentProduct) return;
    
    // Check if color is required but not selected
    if (currentProduct.colors && currentProduct.colors.length > 0 && !selectedColor) {
      showNotification('⚠️ Please select a color', 'error');
      return;
    }
    
    const cart = loadCart();
    const cartItemKey = selectedColor ? `${currentProduct.sku}-${selectedColor}` : currentProduct.sku;
    const existing = cart.find(item => item.sku === cartItemKey);
    
    if (existing) {
      existing.quantity += currentQuantity;
    } else {
      cart.push({
        sku: cartItemKey,
        title: currentProduct.title + (selectedColor ? ` (${selectedColor})` : ''),
        price: currentProduct.price,
        image: currentProduct.images?.[0] || '',
        quantity: currentQuantity,
        color: selectedColor
      });
    }
    
    saveCart(cart);
    showNotification(`✅ Added ${currentQuantity} item(s) to cart!`);
    
    // Reset quantity and color
    currentQuantity = 1;
    document.getElementById('quantity').value = 1;
    selectedColor = null;
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
    });
  };

  window.toggleWishlist = function() {
    const icon = document.getElementById('wishlistIcon');
    const isFilled = icon.getAttribute('fill') === 'currentColor';
    
    if (isFilled) {
      icon.setAttribute('fill', 'none');
      showNotification('❤️ Removed from wishlist');
    } else {
      icon.setAttribute('fill', 'currentColor');
      showNotification('❤️ Added to wishlist');
    }
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

  function changeMainImage(imageUrl, index) {
    document.getElementById('mainImage').src = imageUrl;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
      if (i === index) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }

  async function loadStore() {
    try {
      const response = await fetch('data/store.json', { cache: 'no-cache' });
      store = await response.json();
      
      document.getElementById('storeName').textContent = store.name;
      document.getElementById('footerStoreName').textContent = store.name;
      
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
      categories.filter(c => c.active && !c.parentId).slice(0, 5).forEach(cat => {
        const link = document.createElement('a');
        link.className = 'text-sm font-medium text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white cursor-pointer';
        link.textContent = cat.name;
        link.onclick = () => window.location.href = `category.html?category=${cat.slug}`;
        nav.appendChild(link);
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch('data/products.json', { cache: 'no-cache' });
      products = await response.json();
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  function getProductFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const sku = params.get('sku');
    
    if (slug) {
      return products.find(p => p.slug === slug);
    } else if (sku) {
      return products.find(p => p.sku === sku);
    }
    return null;
  }

  function renderProductDetails() {
    const product = getProductFromUrl();
    
    if (!product) {
      document.querySelector('main').innerHTML = `
        <div class="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 class="text-3xl font-bold text-black dark:text-white mb-4">Product Not Found</h1>
          <p class="text-black/60 dark:text-white/60 mb-8">The product you're looking for doesn't exist.</p>
          <a href="index.html" class="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-primary/90 inline-block">
            Back to Home
          </a>
        </div>
      `;
      return;
    }
    
    currentProduct = product;
    
    // Update page title
    document.getElementById('pageTitle').textContent = `${product.title} - ${store?.name || 'My Shop'}`;
    
    // Main image
    document.getElementById('mainImage').src = product.images?.[0] || 'https://via.placeholder.com/600';
    document.getElementById('mainImage').alt = product.title;
    
    // Thumbnails
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    if (product.images && product.images.length > 1) {
      thumbnailContainer.innerHTML = product.images.map((img, index) => `
        <div class="aspect-square overflow-hidden rounded-lg bg-gray-200 cursor-pointer thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', ${index})">
          <img alt="Thumbnail ${index + 1}" class="h-full w-full object-cover object-center" src="${img}"/>
        </div>
      `).join('');
      window.changeMainImage = changeMainImage;
    } else {
      thumbnailContainer.style.display = 'none';
    }
    
    // Product info
    document.getElementById('productTitle').textContent = product.title;
    document.getElementById('productSku').textContent = `SKU: ${product.sku}`;
    document.getElementById('productPrice').textContent = money(product.price);
    
    // Compare price and discount
    if (product.compareAtPrice && product.compareAtPrice > product.price) {
      document.getElementById('productComparePrice').textContent = money(product.compareAtPrice);
      const discount = Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
      document.getElementById('productDiscount').textContent = `Save ${discount}%`;
    } else {
      document.getElementById('productComparePrice').style.display = 'none';
      document.getElementById('productDiscount').style.display = 'none';
    }
    
    // Stock status
    const stockStatus = document.getElementById('stockStatus');
    if (product.available === false || (product.stock !== undefined && product.stock <= 0)) {
      stockStatus.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
        <span class="text-sm font-medium text-red-600">Out of Stock</span>
      `;
      document.getElementById('addToCartBtn').disabled = true;
      document.getElementById('addToCartBtn').textContent = 'Out of Stock';
    } else if (product.stock !== undefined && product.stock < 10) {
      stockStatus.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
        <span class="text-sm font-medium text-orange-600">Only ${product.stock} left!</span>
      `;
    }
    
    // Descriptions
    document.getElementById('productShortDesc').textContent = product.shortDescription || '';
    document.getElementById('productDescription').textContent = product.description || product.shortDescription || 'No description available.';
    
    // Color selector
    const colorContainer = document.getElementById('colorSelectorContainer');
    const colorOptions = document.getElementById('colorOptions');
    if (product.colors && product.colors.length > 0) {
      colorContainer.style.display = 'block';
      colorOptions.innerHTML = product.colors.filter(c => c.available).map(color => {
        const colorHex = color.hex || getColorHex(color.name);
        return `
          <button 
            class="color-option w-12 h-12 rounded-full border-2 border-gray-300 hover:border-primary transition-all relative group"
            style="background-color: ${colorHex}; ${colorHex === '#FFFFFF' || colorHex === '#F9FAFB' ? 'border-color: #D1D5DB;' : ''}"
            data-color="${color.name}"
            onclick="selectColor('${color.name}')"
            title="${color.name}"
          >
            <span class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-black dark:text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ${color.name}
            </span>
          </button>
        `;
      }).join('');
    } else {
      colorContainer.style.display = 'none';
    }
    
    // Attributes
    const attributesContainer = document.getElementById('attributesContainer');
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      attributesContainer.innerHTML = `
        <h3 class="text-lg font-bold text-black dark:text-white mb-3">Product Details</h3>
        ${Object.entries(product.attributes).map(([key, value]) => `
          <div class="flex justify-between py-2 border-b border-primary/10">
            <span class="text-black/60 dark:text-white/60 capitalize">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
            <span class="font-medium text-black dark:text-white">${value}</span>
          </div>
        `).join('')}
      `;
    }
    
    // Tags
    const tagsContainer = document.getElementById('tagsContainer');
    if (product.tags && product.tags.length > 0) {
      tagsContainer.innerHTML = `
        <h3 class="text-sm font-medium text-black/60 dark:text-white/60 mb-3">Tags:</h3>
        <div class="flex flex-wrap gap-2">
          ${product.tags.map(tag => `
            <span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">#${tag}</span>
          `).join('')}
        </div>
      `;
    }
    
    // Breadcrumb
    const category = categories.find(c => product.categoryIds?.includes(c.id));
    if (category) {
      const breadcrumbCat = document.getElementById('breadcrumbCategory');
      breadcrumbCat.textContent = category.name;
      breadcrumbCat.href = `category.html?category=${category.slug}`;
    }
    document.getElementById('breadcrumbProduct').textContent = product.title;
    
    // Load related products
    renderRelatedProducts();
  }

  function renderRelatedProducts() {
    const relatedGrid = document.getElementById('relatedProducts');
    
    // Get related products from same category
    let related = products.filter(p => 
      p.id !== currentProduct.id && 
      p.available !== false &&
      p.categoryIds?.some(catId => currentProduct.categoryIds?.includes(catId))
    );
    
    // If not enough, add more products
    if (related.length < 4) {
      related = [...related, ...products.filter(p => 
        p.id !== currentProduct.id && 
        p.available !== false &&
        !related.includes(p)
      )];
    }
    
    related = related.slice(0, 4);
    
    relatedGrid.innerHTML = related.map(product => `
      <div class="group cursor-pointer" onclick="window.location.href='product.html?slug=${product.slug}'">
        <div class="aspect-square w-full overflow-hidden rounded-lg bg-gray-200 mb-4">
          <img alt="${product.title}" class="h-full w-full object-cover object-center group-hover:opacity-75 transition" src="${product.images?.[0] || 'https://via.placeholder.com/400'}"/>
        </div>
        <h3 class="text-base font-semibold text-black dark:text-white">${product.title}</h3>
        <p class="mt-1 text-sm text-primary font-bold">${money(product.price)}</p>
      </div>
    `).join('');
  }

  // Handle Abroad Order
  window.handleAbroadOrder = function() {
    if (!currentProduct) return;
    
    // Check if color is required and selected
    if (currentProduct.colors && currentProduct.colors.length > 0 && !selectedColor) {
      showNotification('⚠️ Please select a color before ordering from abroad', 'error');
      return;
    }
    
    const cart = loadCart();
    const cartItemKey = selectedColor ? `${currentProduct.sku}-${selectedColor}-abroad` : `${currentProduct.sku}-abroad`;
    const existing = cart.find(item => item.sku === cartItemKey);
    
    if (existing) {
      existing.quantity += currentQuantity;
    } else {
      cart.push({
        sku: cartItemKey,
        title: currentProduct.title + (selectedColor ? ` (${selectedColor})` : ''),
        price: currentProduct.price,
        image: currentProduct.images?.[0] || '',
        quantity: currentQuantity,
        color: selectedColor,
        isAbroadOrder: true // Special flag for international orders
      });
    }
    
    saveCart(cart);
    showNotification(`🌍 Added ${currentQuantity} item(s) to cart as Abroad Order!`);
    
    // Reset quantity and color
    currentQuantity = 1;
    document.getElementById('quantity').value = 1;
    selectedColor = null;
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
    });
    
    // Open cart drawer to show the added abroad item
    openCart();
  };

  // Event listeners
  document.getElementById('cartButton').addEventListener('click', openCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Initialize
  async function init() {
    updateCartBadge();
    await loadStore();
    await loadCategories();
    await loadProducts();
    renderProductDetails();
  }

  init();
})();
