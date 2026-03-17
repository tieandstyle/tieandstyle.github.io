(function () {
  const CART_KEY = 'whshop_cart_v1';
  const SHIPPING_KEY = 'whshop_pending_shipping_v1';
  let store = null;

  function money(n) {
    return `₹${Number(n).toFixed(2)}`;
  }

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  }

  function loadShipping() {
    try { return JSON.parse(localStorage.getItem(SHIPPING_KEY) || '{}'); }
    catch { return {}; }
  }

  /* ── Calculate totals using saved shipping state ── */
  function calculateTotals(cart) {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    const hasAbroadOrder = cart.some(i => i.isAbroadOrder === true);

    const shipping_data = loadShipping();
    const customerState = (shipping_data.state || '').trim();

    let shipping = 0;
    if (hasAbroadOrder) {
      shipping = 0;
    } else if (totalItems >= 15) {
      shipping = 100;
    } else if (customerState && store) {
      const rates = store.delivery?.rates || [];
      const matched = rates.find(r => r.state && r.state.toLowerCase() === customerState.toLowerCase());
      const freeMin = store.pricing?.freeShippingMin || 999;
      if (matched) {
        shipping = subtotal >= freeMin ? 0 : Number(matched.charge_inr) || 0;
      }
    }

    const tax = 0;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total, hasAbroadOrder, totalItems };
  }

  /* ── Render Order Summary Panel ── */
  function renderCart() {
    const cart = loadCart();
    const orderItems = document.getElementById('orderItems');

    if (cart.length === 0) {
      orderItems.innerHTML = `
        <div class="text-center py-8">
          <p class="text-subtle-light dark:text-subtle-dark mb-4">Your cart is empty</p>
          <button onclick="window.location.href='index.html'" class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition">Start Shopping</button>
        </div>`;
      return;
    }

    orderItems.innerHTML = cart.map(item => `
      <div class="flex items-center gap-4 ${item.isAbroadOrder ? 'bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-700' : ''}">
        <div class="w-20 h-20 bg-cover bg-center rounded-lg flex-shrink-0" style="background-image: url('${item.image || ''}')"></div>
        <div class="flex-grow">
          <p class="font-medium">${item.isAbroadOrder ? '<span class="text-blue-600">🌍</span> ' : ''}${item.title}</p>
          ${item.color ? `<p class="text-xs text-gray-500">Color: ${item.color}</p>` : ''}
          <p class="text-sm text-subtle-light dark:text-subtle-dark">Qty: ${item.quantity}</p>
          <p class="text-sm text-primary font-semibold mt-1">${money(item.price)} each</p>
        </div>
        <p class="font-medium">${money(item.price * item.quantity)}</p>
      </div>`).join('');

    const totals = calculateTotals(cart);
    document.getElementById('subtotalAmount').textContent = money(totals.subtotal);

    // Bulk / abroad notifications
    const icn = document.getElementById('itemCountNotification');
    if (totals.totalItems >= 15) {
      icn.innerHTML = `<div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-4 mb-4"><p class="text-sm text-orange-800 dark:text-orange-200">📦 Bulk Order (${totals.totalItems} items) — flat ₹100 delivery applies.</p></div>`;
      icn.style.display = 'block';
    } else {
      icn.style.display = 'none';
    }

    if (totals.hasAbroadOrder) {
      document.getElementById('abroadDeliveryNotification').innerHTML = `<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-4"><p class="text-sm text-blue-800 dark:text-blue-200">🌍 International Order — admin will confirm delivery charges before processing.</p></div>`;
      document.getElementById('abroadDeliveryNotification').style.display = 'block';
    }

    const shippingEl = document.getElementById('shippingAmount');
    if (totals.hasAbroadOrder) {
      shippingEl.textContent = 'Pending';
      shippingEl.className = 'font-medium text-blue-600';
    } else if (totals.shipping === 0) {
      shippingEl.textContent = 'FREE';
      shippingEl.className = 'font-medium text-green-600 font-bold';
    } else {
      shippingEl.textContent = money(totals.shipping);
      shippingEl.className = 'font-medium';
    }

    document.getElementById('totalAmount').textContent = money(totals.total);
  }

  /* ── Populate shipping summary card ── */
  function renderShippingSummary() {
    const s = loadShipping();
    if (!s.name) {
      // No shipping info — redirect back
      window.location.href = 'checkout.html';
      return;
    }
    document.getElementById('summaryName').textContent = s.name;
    const addrParts = [s.address, s.address2, s.city, s.state, s.zip].filter(Boolean);
    document.getElementById('summaryAddress').textContent = addrParts.join(', ');
    document.getElementById('summaryPhone').textContent = s.phone || '';
  }

  /* ── Copy UPI ID ── */
  window.copyUpiId = function () {
    const upiText = document.getElementById('upiId').textContent;
    if (upiText && upiText !== 'Loading...' && upiText !== 'Not configured') {
      navigator.clipboard.writeText(upiText).then(() => {
        const btn = document.getElementById('copyUpiBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    }
  };

  /* ── Build WhatsApp message ── */
  function buildWhatsAppMessage(orderId, cart, totals, formData) {
    let msg = `🛍️ *NEW ORDER*\n\n📋 *Order ID:* ${orderId}\n\n👤 *Customer:*\nName: ${formData.name}\nPhone: ${formData.phone}\n`;
    if (formData.email) msg += `Email: ${formData.email}\n`;
    msg += `\n📍 *Delivery Address:*\n${formData.address}\n`;
    if (formData.address2) msg += `${formData.address2}\n`;
    msg += `${formData.city}, ${formData.state} - ${formData.zip}\n\n🛒 *Items:*\n`;
    cart.forEach((item, i) => {
      msg += `${i + 1}. ${item.title}${item.color ? ` (${item.color})` : ''} × ${item.quantity} = ${money(item.price * item.quantity)}\n`;
    });
    msg += `\n💰 *Summary:*\nSubtotal: ${money(totals.subtotal)}\nShipping: ${totals.shipping === 0 ? 'FREE' : money(totals.shipping)}\n*Total: ${money(totals.total)}*\n\n💳 UPI ID: ${store?.payments?.gpayUpiId || 'N/A'}\n✅ I will pay via UPI and share screenshot + UTR here.\n`;
    if (formData.notes) msg += `\n📝 Notes: ${formData.notes}\n`;
    msg += `\nThank you! 🙏`;
    return msg;
  }

  /* ── Save to local order history ── */
  function saveOrderHistory(orderId, cart, totals, formData) {
    try {
      const orders = JSON.parse(localStorage.getItem('whshop_orders_v1') || '[]');
      orders.unshift({ id: orderId, orderId, date: new Date().toISOString(), items: cart, total: totals.total, totals, customer: formData, status: 'pending' });
      localStorage.setItem('whshop_orders_v1', JSON.stringify(orders.slice(0, 50)));
    } catch (e) { console.error(e); }
  }

  /* ── Show success modal ── */
  function showOrderConfirmation(orderId) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:1rem;padding:2rem;max-width:500px;width:90%;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);';
    modal.innerHTML = `
      <style>
        @keyframes checkmark{0%{transform:scale(0) rotate(45deg)}50%{transform:scale(1.2) rotate(45deg)}100%{transform:scale(1) rotate(45deg)}}
        .chk-circle{width:80px;height:80px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;}
        .chk{width:30px;height:50px;border:solid white;border-width:0 5px 5px 0;transform:rotate(45deg);animation:checkmark .5s ease-out .3s forwards;transform-origin:center;}
      </style>
      <div class="chk-circle"><div class="chk"></div></div>
      <h2 style="font-size:1.875rem;font-weight:bold;color:#10b981;margin-bottom:1rem;">Order Confirmed!</h2>
      <p style="color:#6b7280;margin-bottom:1.5rem;">Your order has been placed successfully</p>
      <div style="background:#f3f4f6;border-radius:.5rem;padding:1rem;margin-bottom:1.5rem;">
        <p style="font-size:.875rem;color:#6b7280;margin-bottom:.5rem;">Your Order ID</p>
        <p style="font-size:1.25rem;font-weight:bold;color:#df20df;font-family:monospace;">${orderId}</p>
      </div>
      <p style="font-size:.875rem;color:#6b7280;margin-bottom:1.5rem;">We will contact you shortly for payment and delivery details.<br/>Save your Order ID to track your order.</p>
      <div style="display:flex;gap:.75rem;flex-direction:column;">
        <a href="track-order.html" style="display:block;background:#df20df;color:white;padding:.75rem 1.5rem;border-radius:.5rem;text-decoration:none;font-weight:600;">📦 Track Your Order</a>
        <button onclick="window.location.href='index.html'" style="background:#e5e7eb;color:#374151;padding:.75rem 1.5rem;border-radius:.5rem;border:none;font-weight:600;cursor:pointer;">Continue Shopping</button>
      </div>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /* ── Main place-order handler ── */
  window.handlePayment = async function () {
    const cart = loadCart();
    if (cart.length === 0) {
      alert('Your cart is empty!');
      window.location.href = 'index.html';
      return;
    }

    const formData = loadShipping();
    if (!formData.name) {
      alert('Shipping information is missing. Please fill it in again.');
      window.location.href = 'checkout.html';
      return;
    }

    const totals = calculateTotals(cart);
    const orderId = `ORD-${Date.now()}`;

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Processing Order...';

    try {
      const { saveOrderToFirebase } = await import('./firebase-config.js');
      const hasAbroadOrder = cart.some(i => i.isAbroadOrder === true);

      const orderData = {
        orderId,
        customer: formData,
        items: cart,
        totals,
        deliveryCharge: hasAbroadOrder ? 0 : totals.shipping,
        status: 'pending',
        paymentMethod: 'UPI',
        paymentStatus: 'pending',
        isAbroadOrder: hasAbroadOrder
      };

      const result = await saveOrderToFirebase(orderData);
      if (result.success) {
        saveOrderHistory(orderId, cart, totals, formData);
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(SHIPPING_KEY);
        setTimeout(() => showOrderConfirmation(orderId), 300);
      } else {
        throw new Error(result.error || 'Failed to save order');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      alert('❌ Error placing order. Please try again or contact support.');
      btn.disabled = false;
      btn.textContent = '🛒 Place Order';
    }
  };

  /* ── Load store config ── */
  async function loadStore() {
    try {
      const res = await fetch('data/store.json', { cache: 'no-cache' });
      store = await res.json();
      document.getElementById('storeName').textContent = store.name;
      document.getElementById('footerStoreName').textContent = store.name;
      if (store.payments?.gpayUpiId) {
        document.getElementById('upiId').textContent = store.payments.gpayUpiId;
      }
      if (store.payments?.gpayQrImage) {
        document.getElementById('qrContainer').innerHTML = `
          <img src="${store.payments.gpayQrImage}" alt="UPI QR Code" class="w-48 h-48 mx-auto rounded-lg border-2 border-primary"/>
          <p class="text-xs text-center mt-2 text-subtle-light dark:text-subtle-dark">Scan to pay</p>`;
      }
    } catch (e) {
      console.error(e);
      document.getElementById('upiId').textContent = 'Not configured';
    }
  }

  /* ── Init ── */
  async function init() {
    await loadStore();
    renderShippingSummary();
    renderCart();
  }

  init();
})();
