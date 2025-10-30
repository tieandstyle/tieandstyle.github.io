(function() {
  const CART_KEY = 'whshop_cart_v1';
  let store = null;
  
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
  }

  function removeItem(sku) {
    let cart = loadCart();
    cart = cart.filter(item => item.sku !== sku);
    saveCart(cart);
    renderCart();
  }

  function updateQuantity(sku, delta) {
    const cart = loadCart();
    const item = cart.find(it => it.sku === sku);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeItem(sku);
      return;
    }
    
    saveCart(cart);
    renderCart();
  }

  function calculateTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Shipping will be calculated at checkout based on selected state
    // No shipping or tax shown in cart
    
    return { subtotal };
  }

  function renderCart() {
    const cart = loadCart();
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountTop = document.getElementById('cartCountTop');
    
    cartCountTop.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cart.length === 0) {
      cartItemsEl.innerHTML = '<div class="text-center py-12 text-gray-500">Your cart is empty. <a href="index.html" class="text-primary hover:underline">Start shopping!</a></div>';
      document.getElementById('orderSummary').innerHTML = `
        <div class="flex justify-between text-sm">
          <span class="text-background-dark/60 dark:text-background-light/60">Subtotal</span>
          <span class="font-medium">₹0.00</span>
        </div>
      `;
      document.getElementById('grandTotal').textContent = '₹0.00';
      return;
    }

    cartItemsEl.innerHTML = cart.map(item => `
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-primary/20 dark:border-primary/30 rounded-lg">
        <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-20 sm:size-24 flex-shrink-0" style="background-image: url('${item.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%23ddd\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\'/%3E%3C/svg%3E'}')"></div>
        <div class="flex-1 min-w-0 w-full">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex-1">
              <h3 class="font-bold text-base sm:text-lg line-clamp-2">${item.title}</h3>
              ${item.color ? `<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Color: <span class="font-medium">${item.color}</span></p>` : ''}
            </div>
            <p class="font-bold text-lg text-primary whitespace-nowrap">${money(item.price * item.quantity)}</p>
          </div>
          <p class="text-primary text-sm mb-3">${money(item.price)} each</p>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center border border-primary/20 dark:border-primary/30 rounded">
              <button class="px-3 py-1 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" onclick="window.updateQuantity('${item.sku}', -1)">-</button>
              <span class="px-3 min-w-[2rem] text-center">${item.quantity}</span>
              <button class="px-3 py-1 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" onclick="window.updateQuantity('${item.sku}', 1)">+</button>
            </div>
            <button class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium" onclick="window.removeItem('${item.sku}')">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Remove
            </button>
          </div>
        </div>
      </div>
    `).join('');

    const totals = calculateTotals(cart);
    
    document.getElementById('orderSummary').innerHTML = `
      <div class="flex justify-between text-sm">
        <span class="text-background-dark/60 dark:text-background-light/60">Subtotal</span>
        <span class="font-medium">${money(totals.subtotal)}</span>
      </div>
    `;
    
    document.getElementById('grandTotal').textContent = money(totals.subtotal);
  }

  window.removeItem = removeItem;
  window.updateQuantity = updateQuantity;
  
  window.proceedToCheckout = function() {
    const cart = loadCart();
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    
    // Redirect to index.html with checkout mode
    window.location.href = 'index.html#checkout';
  };

  // Load store data and render cart
  async function init() {
    try {
      const response = await fetch('data/store.json', { cache: 'no-cache' });
      store = await response.json();
      document.getElementById('storeName').textContent = store.name;
    } catch (error) {
      console.error('Error loading store:', error);
    }
    renderCart();
  }

  init();
})();
