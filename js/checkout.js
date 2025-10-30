(function() {
  const CART_KEY = 'whshop_cart_v1';
  const PROFILE_KEY = 'whshop_profile_v1';
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

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function calculateTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Check if cart has abroad orders
    const hasAbroadOrder = cart.some(item => item.isAbroadOrder === true);
    
    let shipping = 0;
    
    if (hasAbroadOrder) {
      // For abroad orders, shipping will be determined by admin later
      shipping = 0; // Admin will add delivery charge manually
    } else {
      // Regular domestic shipping - lookup by customer's selected state
      const stateInput = document.getElementById('state');
      const customerState = stateInput ? (stateInput.value || '').trim() : '';

      const rates = store?.delivery?.rates || [];
      let matchedRate = null;
      
      if (customerState) {
        // Find exact match by state name
        matchedRate = rates.find(r => r.state && r.state.toLowerCase() === customerState.toLowerCase());
      }

      const freeShippingMin = store?.pricing?.freeShippingMin || 999;

      if (matchedRate) {
        // Use state-specific charge, but honor free shipping threshold
        shipping = subtotal >= freeShippingMin ? 0 : Number(matchedRate.charge_inr) || 0;
      } else {
        // If no state selected or no match, show 0 until state is selected
        shipping = 0;
      }
    }
    
    // Tax removed - set to 0
    const tax = 0;
    
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total, hasAbroadOrder };
  }

  function renderCart() {
    const cart = loadCart();
    const orderItems = document.getElementById('orderItems');

    if (cart.length === 0) {
      orderItems.innerHTML = `
        <div class="text-center py-8">
          <p class="text-subtle-light dark:text-subtle-dark mb-4">Your cart is empty</p>
          <button onclick="window.location.href='index.html'" class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition">
            Start Shopping
          </button>
        </div>
      `;
      return;
    }

    orderItems.innerHTML = cart.map(item => `
      <div class="flex items-center gap-4 ${item.isAbroadOrder ? 'bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-700' : ''}">
        <div class="w-20 h-20 bg-cover bg-center rounded-lg flex-shrink-0" style="background-image: url('${item.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%23ddd\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\'/%3E%3C/svg%3E'}');"></div>
        <div class="flex-grow">
          <p class="font-medium flex items-center gap-2">
            ${item.isAbroadOrder ? '<span class="text-blue-600" title="International Order">🌍</span>' : ''}
            ${item.title}
          </p>
          ${item.color ? `<p class="text-xs text-gray-600 dark:text-gray-400">Color: <span class="font-medium">${item.color}</span></p>` : ''}
          ${item.isAbroadOrder ? '<p class="text-xs text-blue-600 font-semibold">International Order</p>' : ''}
          <p class="text-sm text-subtle-light dark:text-subtle-dark">Quantity: ${item.quantity}</p>
          <p class="text-sm text-primary font-semibold mt-1">${money(item.price)} each</p>
        </div>
        <p class="font-medium">${money(item.price * item.quantity)}</p>
      </div>
    `).join('');

    const totals = calculateTotals(cart);
    document.getElementById('subtotalAmount').textContent = money(totals.subtotal);
    
    // Show abroad order notification (admin will add delivery charge later)
    if (totals.hasAbroadOrder) {
      const abroadNotification = document.getElementById('abroadDeliveryNotification');
      if (abroadNotification) {
        abroadNotification.innerHTML = `
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-4">
            <div class="flex items-start gap-3">
              <span class="text-2xl">🌍</span>
              <div class="flex-1">
                <h4 class="font-bold text-blue-900 dark:text-blue-100 mb-1">International Order</h4>
                <p class="text-sm text-blue-800 dark:text-blue-200">
                  This is an international order. Our admin will contact you to confirm the delivery charges based on your location before processing the order.
                </p>
              </div>
            </div>
          </div>
        `;
        abroadNotification.style.display = 'block';
      }
    } else {
      const abroadNotification = document.getElementById('abroadDeliveryNotification');
      if (abroadNotification) {
        abroadNotification.style.display = 'none';
      }
    }
    
    // Show shipping amount and free shipping message
    const shippingElement = document.getElementById('shippingAmount');
    const shippingRow = shippingElement?.parentElement;
    const stateInput = document.getElementById('state');
    const stateSelected = stateInput && stateInput.value;
    
    if (totals.hasAbroadOrder) {
      // Show pending delivery charge for abroad orders
      shippingElement.textContent = 'Pending';
      shippingElement.classList.add('text-blue-600', 'font-medium');
      shippingElement.classList.remove('text-green-600', 'font-bold', 'text-orange-600');
      const shippingLabel = document.querySelector('[data-shipping-label]');
      if (shippingLabel) {
        shippingLabel.textContent = 'International Delivery';
      }
      // Remove free shipping message for abroad orders
      const messageElement = shippingRow?.querySelector('.shipping-message');
      if (messageElement) {
        messageElement.remove();
      }
    } else if (!stateSelected) {
      // No state selected yet
      shippingElement.textContent = 'Select State';
      shippingElement.classList.add('text-orange-600', 'font-medium');
      shippingElement.classList.remove('text-green-600', 'font-bold', 'text-blue-600');
      const shippingLabel = document.querySelector('[data-shipping-label]');
      if (shippingLabel) {
        shippingLabel.textContent = 'Shipping';
      }
      // Show message to select state
      if (shippingRow) {
        const messageElement = shippingRow.querySelector('.shipping-message') || document.createElement('p');
        messageElement.className = 'shipping-message text-xs text-orange-600 mt-1 col-span-2';
        messageElement.textContent = '⚠️ Please select your state to calculate shipping charges';
        if (!shippingRow.querySelector('.shipping-message')) {
          shippingRow.appendChild(messageElement);
        }
      }
    } else if (totals.shipping === 0) {
      shippingElement.textContent = 'FREE';
      shippingElement.classList.add('text-green-600', 'font-bold');
      shippingElement.classList.remove('text-blue-600', 'font-medium', 'text-orange-600');
      const shippingLabel = document.querySelector('[data-shipping-label]');
      if (shippingLabel) {
        shippingLabel.textContent = 'Shipping';
      }
      // Show congrats message
      if (shippingRow) {
        const messageElement = shippingRow.querySelector('.shipping-message') || document.createElement('p');
        messageElement.className = 'shipping-message text-xs text-green-600 mt-1 col-span-2';
        messageElement.textContent = '🎉 Congratulations! You got FREE shipping!';
        if (!shippingRow.querySelector('.shipping-message')) {
          shippingRow.appendChild(messageElement);
        }
      }
    } else {
      shippingElement.textContent = money(totals.shipping);
      shippingElement.classList.remove('text-green-600', 'font-bold', 'text-blue-600', 'font-medium', 'text-orange-600');
      const shippingLabel = document.querySelector('[data-shipping-label]');
      if (shippingLabel) {
        shippingLabel.textContent = 'Shipping';
      }
      
      // Show how much more needed for free shipping
      const freeShippingMin = store?.pricing?.freeShippingMin || 999;
      const remaining = freeShippingMin - totals.subtotal;
      if (remaining > 0 && shippingRow) {
        const messageElement = shippingRow.querySelector('.shipping-message') || document.createElement('p');
        messageElement.className = 'shipping-message text-xs text-green-600 mt-1 col-span-2';
        messageElement.textContent = `Add ${money(remaining)} more for FREE shipping! 🎉`;
        if (!shippingRow.querySelector('.shipping-message')) {
          shippingRow.appendChild(messageElement);
        }
      } else {
        // Remove message if it exists
        const messageElement = shippingRow?.querySelector('.shipping-message');
        if (messageElement) {
          messageElement.remove();
        }
      }
    }
    
    // Hide tax row if tax is 0
    const taxRow = document.getElementById('taxAmount')?.parentElement;
    if (taxRow && totals.tax === 0) {
      taxRow.style.display = 'none';
    } else if (taxRow) {
      taxRow.style.display = 'flex';
      document.getElementById('taxAmount').textContent = money(totals.tax);
    }
    
    document.getElementById('totalAmount').textContent = money(totals.total);
  }

  function populateStateDropdown() {
    const stateSelect = document.getElementById('state');
    if (!stateSelect || !store?.delivery?.rates) return;

    // Clear existing options except the first one
    stateSelect.innerHTML = '<option value="">-- Select Your State --</option>';

    // Sort states alphabetically and populate dropdown
    const sortedRates = [...store.delivery.rates].sort((a, b) => 
      a.state.localeCompare(b.state)
    );

    sortedRates.forEach(rate => {
      const option = document.createElement('option');
      option.value = rate.state;
      option.textContent = `${rate.state} - ₹${rate.charge_inr}`;
      option.dataset.charge = rate.charge_inr;
      option.dataset.region = rate.region;
      stateSelect.appendChild(option);
    });
  }

  window.updateShippingOnStateChange = function() {
    // Recalculate totals when state is selected
    renderCart();
    
    // Save selected state to profile for next time
    const profile = loadProfile();
    const stateInput = document.getElementById('state');
    if (stateInput && stateInput.value) {
      profile.shipping_state = stateInput.value;
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch (e) {
        console.error('Error saving profile:', e);
      }
    }
  };

  function prefillForm() {
    const profile = loadProfile();
    
    if (profile.name) document.getElementById('full-name').value = profile.name;
    if (profile.phone) document.getElementById('phone').value = profile.phone;
    if (profile.email) document.getElementById('email').value = profile.email;
    if (profile.shipping_address) document.getElementById('address').value = profile.shipping_address;
    if (profile.shipping_city) document.getElementById('city').value = profile.shipping_city;
    if (profile.shipping_state) {
      const stateSelect = document.getElementById('state');
      if (stateSelect) {
        stateSelect.value = profile.shipping_state;
        // Trigger change to update shipping
        updateShippingOnStateChange();
      }
    }
    if (profile.shipping_zip) document.getElementById('zip').value = profile.shipping_zip;
  }

  window.handleCheckout = async function(event) {
    event.preventDefault();
    
    const cart = loadCart();
    if (cart.length === 0) {
      alert('Your cart is empty!');
      window.location.href = 'index.html';
      return;
    }

    const formData = {
      name: document.getElementById('full-name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      address2: document.getElementById('address2').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value.trim(),
      zip: document.getElementById('zip').value.trim(),
      email: document.getElementById('email').value.trim(),
      notes: document.getElementById('notes').value.trim()
    };

    const totals = calculateTotals(cart);
    const orderId = `ORD-${Date.now()}`;

    // Disable button to prevent double submission
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = '⏳ Processing Order...';

    try {
      // Save order to Firebase
      const { saveOrderToFirebase } = await import('./firebase-config.js');
      
      // Check if any item in cart is an abroad order
      const hasAbroadOrder = cart.some(item => item.isAbroadOrder === true);
      
      const orderData = {
        orderId,
        customer: formData,
        items: cart,
        totals: totals,
        // For domestic orders set deliveryCharge now; for abroad orders admin will add later
        deliveryCharge: hasAbroadOrder ? 0 : totals.shipping,
        status: 'pending',
        paymentMethod: 'UPI',
        paymentStatus: 'pending',
        isAbroadOrder: hasAbroadOrder // Flag if order contains international items
      };
      
      const result = await saveOrderToFirebase(orderData);
      
      if (result.success) {
        // Save order to local history as backup
        saveOrderHistory(orderId, cart, totals, formData);
        
        // Clear cart
        localStorage.removeItem(CART_KEY);
        
        // Show success message with order ID and track link
        setTimeout(() => {
          showOrderConfirmation(orderId);
        }, 300);
      } else {
        throw new Error(result.error || 'Failed to save order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('❌ Error placing order. Please try again or contact support.');
      
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = '🛒 Place Order';
    }
  };

  function buildWhatsAppMessage(orderId, cart, totals, formData) {
    let msg = `🛍️ *NEW ORDER*\n\n`;
    msg += `📋 *Order ID:* ${orderId}\n\n`;
    msg += `👤 *Customer Details:*\n`;
    msg += `Name: ${formData.name}\n`;
    msg += `Phone: ${formData.phone}\n`;
    if (formData.email) msg += `Email: ${formData.email}\n`;
    msg += `\n📍 *Delivery Address:*\n`;
    msg += `${formData.address}\n`;
    if (formData.address2) msg += `${formData.address2}\n`;
    msg += `${formData.city}, ${formData.state} - ${formData.zip}\n`;
    msg += `\n🛒 *Items Ordered:*\n`;
    
    cart.forEach((item, index) => {
      msg += `${index + 1}. ${item.title}\n`;
      if (item.color) {
        msg += `   Color: ${item.color}\n`;
      }
      msg += `   Qty: ${item.quantity} × ${money(item.price)} = ${money(item.price * item.quantity)}\n`;
    });
    
    msg += `\n💰 *Payment Summary:*\n`;
    msg += `Subtotal: ${money(totals.subtotal)}\n`;
    msg += `Shipping: ${totals.shipping === 0 ? 'FREE' : money(totals.shipping)}\n`;
    if (totals.tax > 0) {
      msg += `Tax: ${money(totals.tax)}\n`;
    }
    msg += `*Total: ${money(totals.total)}*\n`;
    msg += `\n💳 *Payment Method:* UPI/GPay\n`;
    msg += `UPI ID: ${store.payments?.gpayUpiId || 'N/A'}\n`;
    msg += `\n✅ I will pay via UPI and share screenshot + UTR number here.\n`;
    
    if (formData.notes) {
      msg += `\n📝 *Special Instructions:*\n${formData.notes}\n`;
    }
    
    msg += `\nThank you! 🙏`;
    
    return msg;
  }

  function saveOrderHistory(orderId, cart, totals, formData) {
    try {
      const orders = JSON.parse(localStorage.getItem('whshop_orders_v1') || '[]');
      orders.unshift({
        id: orderId,
        orderId: orderId,
        date: new Date().toISOString(),
        items: cart,
        total: totals.total,
        totals: totals,
        customer: formData,
        status: 'pending'
      });
      localStorage.setItem('whshop_orders_v1', JSON.stringify(orders.slice(0, 50))); // Keep last 50 orders
    } catch (error) {
      console.error('Error saving order:', error);
    }
  }

  function showOrderConfirmation(orderId) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      text-align: center;
      animation: slideInUp 0.5s ease-out;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;
    
    modal.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes checkmark {
          0% {
            transform: scale(0) rotate(45deg);
          }
          50% {
            transform: scale(1.2) rotate(45deg);
          }
          100% {
            transform: scale(1) rotate(45deg);
          }
        }
        .checkmark-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }
        .checkmark {
          width: 30px;
          height: 50px;
          border: solid white;
          border-width: 0 5px 5px 0;
          transform: rotate(45deg);
          animation: checkmark 0.5s ease-out 0.3s forwards;
          transform-origin: center;
        }
      </style>
      <div class="checkmark-circle">
        <div class="checkmark"></div>
      </div>
      <h2 style="font-size: 1.875rem; font-weight: bold; color: #10b981; margin-bottom: 1rem;">
        Order Confirmed!
      </h2>
      <p style="color: #6b7280; margin-bottom: 1.5rem;">
        Your order has been placed successfully
      </p>
      <div style="background: #f3f4f6; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
        <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Your Order ID</p>
        <p style="font-size: 1.25rem; font-weight: bold; color: #df20df; font-family: monospace;">
          ${orderId}
        </p>
      </div>
      <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">
        We will contact you shortly for payment and delivery details.<br/>
        Save your Order ID to track your order anytime.
      </p>
      <div style="display: flex; gap: 0.75rem; flex-direction: column;">
        <a href="track-order.html" style="display: block; background: #df20df; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: all 0.3s;">
          📦 Track Your Order
        </a>
        <button onclick="window.location.href='index.html'" style="background: #e5e7eb; color: #374151; padding: 0.75rem 1.5rem; border-radius: 0.5rem; border: none; font-weight: 600; cursor: pointer; transition: all 0.3s;">
          Continue Shopping
        </button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function saveOrderHistory(orderId, cart, totals, formData) {
    try {
      const orders = JSON.parse(localStorage.getItem('whshop_orders_v1') || '[]');
      orders.unshift({
        id: orderId,
        date: new Date().toISOString(),
        items: cart,
        total: totals.total,
        customer: formData,
        status: 'pending'
      });
      localStorage.setItem('whshop_orders_v1', JSON.stringify(orders.slice(0, 50))); // Keep last 50 orders
    } catch (error) {
      console.error('Error saving order:', error);
    }
  }

  async function loadStore() {
    try {
      const response = await fetch('data/store.json', { cache: 'no-cache' });
      store = await response.json();
      
      document.getElementById('storeName').textContent = store.name;
      document.getElementById('footerStoreName').textContent = store.name;
      
      if (store.payments?.gpayUpiId) {
        document.getElementById('upiId').textContent = store.payments.gpayUpiId;
      }
      
      if (store.payments?.gpayQrImage) {
        document.getElementById('qrContainer').innerHTML = `
          <img src="${store.payments.gpayQrImage}" alt="UPI QR Code" class="w-48 h-48 mx-auto rounded-lg border-2 border-primary"/>
          <p class="text-xs text-center mt-2 text-subtle-light dark:text-subtle-dark">Scan to pay</p>
        `;
      }
    } catch (error) {
      console.error('Error loading store:', error);
      document.getElementById('upiId').textContent = 'Not configured';
    }
  }

  // Initialize
  async function init() {
    await loadStore();
    populateStateDropdown(); // Populate state dropdown after store data is loaded
    renderCart();
    prefillForm();
  }

  init();
})();
