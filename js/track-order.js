// Track Order Page Script
import { getOrderById } from './firebase-config.js';

let currentOrder = null;

// Load store name
async function loadStoreName() {
  try {
    const response = await fetch('data/store.json', { cache: 'no-cache' });
    const store = await response.json();
    document.getElementById('storeName').textContent = store.name;
    document.getElementById('receiptStoreName').textContent = store.name;
  } catch (error) {
    console.error('Error loading store name:', error);
  }
}

// Track order function
window.trackOrder = async function(event) {
  event.preventDefault();
  
  const orderIdInput = document.getElementById('orderIdInput').value.trim();
  
  if (!orderIdInput) {
    showNotification('Please enter an Order ID', 'error');
    return;
  }
  
  // Show loading
  showSection('loadingSection');
  
  try {
    // Try to find order in Firebase
    const result = await getOrderById(orderIdInput);
    
    if (result.success && result.order) {
      currentOrder = result.order;
      displayOrder(result.order);
    } else {
      // Try to find in localStorage as fallback
      const localOrders = JSON.parse(localStorage.getItem('whshop_orders_v1') || '[]');
      const localOrder = localOrders.find(o => o.id === orderIdInput || o.orderId === orderIdInput);
      
      if (localOrder) {
        currentOrder = localOrder;
        displayOrder(localOrder);
      } else {
        showSection('notFoundSection');
      }
    }
  } catch (error) {
    console.error('Error tracking order:', error);
    showSection('notFoundSection');
  }
};

// Display order details
function displayOrder(order) {
  // Set basic info
  document.getElementById('displayOrderId').textContent = order.orderId || order.id;
  
  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.date || order.createdAt || Date.now());
  document.getElementById('displayOrderDate').textContent = orderDate.toLocaleDateString();
  
  const total = order.totals?.total || order.total || 0;
  document.getElementById('displayOrderTotal').textContent = `₹${total.toFixed(2)}`;
  
  // Set payment status
  const paymentStatus = order.paymentStatus || 'pending';
  displayPaymentStatus(paymentStatus);
  
  // Set status
  const status = order.status || 'pending';
  displayStatus(status);
  
  // Display timeline
  displayTimeline(status, orderDate);
  
  // Display customer details
  displayCustomerDetails(order.customer);
  
  // Display items
  displayOrderItems(order.items || []);
  
  // Display totals
  displayTotals(order.totals || {});
  
  // Show order section
  showSection('orderSection');
}

// Display payment status
function displayPaymentStatus(paymentStatus) {
  const statusConfig = {
    pending: { text: '💳 Payment Pending', color: 'text-orange-600' },
    confirmed: { text: '✅ Payment Confirmed', color: 'text-green-600' },
    failed: { text: '❌ Payment Failed', color: 'text-red-600' }
  };
  
  const config = statusConfig[paymentStatus] || statusConfig.pending;
  const element = document.getElementById('displayPaymentStatus');
  element.textContent = config.text;
  element.className = `font-semibold ${config.color}`;
}

// Display status
function displayStatus(status) {
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusMessage = document.getElementById('statusMessage');

  const statusConfig = {
    pending: { icon: '⏳', bg: 'bg-yellow-100 dark:bg-yellow-900/30', title: 'Order Placed', message: 'We have received your order' },
    processing: { icon: '🔄', bg: 'bg-blue-100 dark:bg-blue-900/30', title: 'Processing', message: 'Your order is being prepared' },
    packed: { icon: '📦', bg: 'bg-indigo-100 dark:bg-indigo-900/30', title: 'Packed', message: 'Your items have been packed' },
    dispatched: { icon: '🚀', bg: 'bg-purple-100 dark:bg-purple-900/30', title: 'Dispatched', message: 'Order handed over to courier' },
    'in-transit': { icon: '🚚', bg: 'bg-cyan-100 dark:bg-cyan-900/30', title: 'In Transit', message: 'Your order is on the way' },
    'out-for-delivery': { icon: '🏃', bg: 'bg-orange-100 dark:bg-orange-900/30', title: 'Out for Delivery', message: 'Courier is out to deliver your order' },
    delivered: { icon: '✅', bg: 'bg-green-100 dark:bg-green-900/30', title: 'Delivered', message: 'Order delivered successfully' },
    completed: { icon: '✅', bg: 'bg-green-100 dark:bg-green-900/30', title: 'Completed', message: 'Order completed' },
    cancelled: { icon: '❌', bg: 'bg-red-100 dark:bg-red-900/30', title: 'Cancelled', message: 'This order has been cancelled' }
  };

  const config = statusConfig[status] || statusConfig.pending;

  statusIcon.className = `inline-flex items-center justify-center w-24 h-24 rounded-full ${config.bg}`;
  statusIcon.innerHTML = `<span class="text-5xl">${config.icon}</span>`;
  statusTitle.textContent = config.title;
  statusMessage.textContent = config.message;
}

// Display timeline
function displayTimeline(status, orderDate) {
  const timeline = document.getElementById('orderTimeline');
  const steps = [
    { key: 'pending', label: 'Order Placed', icon: '📝' },
    { key: 'processing', label: 'Processing', icon: '🔄' },
    { key: 'packed', label: 'Packed', icon: '📦' },
    { key: 'dispatched', label: 'Dispatched', icon: '🚀' },
    { key: 'in-transit', label: 'In Transit', icon: '🚚' },
    { key: 'out-for-delivery', label: 'Out for Delivery', icon: '🏃' },
    { key: 'delivered', label: 'Delivered', icon: '✅' }
  ];

  // Include cancelled as a possible ending step
  if (status === 'cancelled') {
    steps.push({ key: 'cancelled', label: 'Cancelled', icon: '❌' });
  }

  const statusOrder = ['pending','processing','packed','dispatched','in-transit','out-for-delivery','delivered','cancelled'];
  const currentIndex = statusOrder.indexOf(status);

  // Use order.updatedAt for active/completed timestamp when available
  const updatedDate = (currentOrder && (currentOrder.updatedAt?.toDate ? currentOrder.updatedAt.toDate() : new Date(currentOrder.updatedAt))) || orderDate;

  timeline.innerHTML = steps.map(step => {
    const stepIndex = statusOrder.indexOf(step.key);
    const isActive = stepIndex === currentIndex;
    const isCompleted = stepIndex < currentIndex && status !== 'cancelled';
    const isCancelled = status === 'cancelled' && step.key === 'cancelled';

    let statusClass = '';
    if (isActive) statusClass = 'active';
    else if (isCompleted) statusClass = 'completed';
    else if (isCancelled) statusClass = 'active';

    // show timestamp for completed/active/cancelled steps; show created date for 'Order Placed'
    const showTimestamp = isActive || isCompleted || isCancelled;
    const timestamp = step.key === 'pending' ? orderDate : updatedDate;

    return `
      <div class="status-step ${statusClass}">
        <div class="step-icon">
          <span class="text-lg">${step.icon}</span>
        </div>
        <div>
          <p class="font-semibold">${step.label}</p>
          ${showTimestamp ? `<p class="text-sm text-gray-500 dark:text-gray-400">${timestamp.toLocaleString()}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Staggered reveal for compact + animated feel
  setTimeout(() => {
    const stepEls = Array.from(timeline.querySelectorAll('.status-step'));
    stepEls.forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 110);
    });
  }, 50);
}

// Display customer details
function displayCustomerDetails(customer) {
  const container = document.getElementById('customerDetails');
  
  if (!customer) {
    container.innerHTML = '<p class="text-gray-500">No customer information available</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
      <span class="text-gray-600 dark:text-gray-400">Name:</span>
      <span class="font-medium">${customer.name || 'N/A'}</span>
    </div>
    <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
      <span class="text-gray-600 dark:text-gray-400">Phone:</span>
      <span class="font-medium">${customer.phone || 'N/A'}</span>
    </div>
    ${customer.email ? `
    <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
      <span class="text-gray-600 dark:text-gray-400">Email:</span>
      <span class="font-medium">${customer.email}</span>
    </div>
    ` : ''}
    <div class="py-2">
      <span class="text-gray-600 dark:text-gray-400 block mb-1">Delivery Address:</span>
      <span class="font-medium">
        ${customer.address || ''}<br/>
        ${customer.address2 ? customer.address2 + '<br/>' : ''}
        ${customer.city || ''}, ${customer.state || ''} - ${customer.zip || ''}
      </span>
    </div>
  `;
}

// Display order items
function displayOrderItems(items) {
  const container = document.getElementById('orderItems');
  
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No items in this order</p>';
    return;
  }
  
  container.innerHTML = items.map(item => `
    <div class="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
      <div class="w-12 h-12 bg-cover bg-center rounded flex-shrink-0" style="background-image: url('${item.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%23ddd\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\'/%3E%3C/svg%3E'}');"></div>
      <div class="flex-grow">
        <p class="font-medium text-sm">${item.title}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Qty: ${item.quantity} × ₹${item.price?.toFixed(2)}</p>
      </div>
      <p class="font-semibold">₹${(item.price * item.quantity).toFixed(2)}</p>
    </div>
  `).join('');
}

// Display totals
function displayTotals(totals) {
  document.getElementById('subtotalAmount').textContent = `₹${(totals.subtotal || 0).toFixed(2)}`;
  document.getElementById('shippingAmount').textContent = totals.shipping === 0 ? 'FREE' : `₹${(totals.shipping || 0).toFixed(2)}`;
  document.getElementById('taxAmount').textContent = `₹${(totals.tax || 0).toFixed(2)}`;
  document.getElementById('totalAmount').textContent = `₹${(totals.total || 0).toFixed(2)}`;
}

// Download receipt
window.downloadReceipt = function() {
  if (!currentOrder) return;
  
  // Populate receipt
  const orderDate = currentOrder.createdAt?.toDate ? currentOrder.createdAt.toDate() : new Date(currentOrder.date || currentOrder.createdAt || Date.now());
  
  document.getElementById('receiptOrderId').textContent = currentOrder.orderId || currentOrder.id;
  document.getElementById('receiptDate').textContent = orderDate.toLocaleString();
  document.getElementById('receiptStatus').textContent = (currentOrder.status || 'pending').toUpperCase();
  
  // Customer info
  const customer = currentOrder.customer;
  document.getElementById('receiptCustomer').innerHTML = `
    <p style="margin: 5px 0;"><strong>Name:</strong> ${customer?.name || 'N/A'}</p>
    <p style="margin: 5px 0;"><strong>Phone:</strong> ${customer?.phone || 'N/A'}</p>
    ${customer?.email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${customer.email}</p>` : ''}
    <p style="margin: 5px 0;"><strong>Address:</strong> ${customer?.address || ''}</p>
    ${customer?.address2 ? `<p style="margin: 5px 0;">${customer.address2}</p>` : ''}
    <p style="margin: 5px 0;">${customer?.city || ''}, ${customer?.state || ''} - ${customer?.zip || ''}</p>
  `;
  
  // Items
  const items = currentOrder.items || [];
  document.getElementById('receiptItems').innerHTML = items.map(item => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.title}</td>
      <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${item.price?.toFixed(2)}</td>
      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');
  
  // Totals
  const totals = currentOrder.totals || {};
  document.getElementById('receiptTotals').innerHTML = `
    <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>₹${(totals.subtotal || 0).toFixed(2)}</span></p>
    <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Shipping:</span> <span>${totals.shipping === 0 ? 'FREE' : '₹' + (totals.shipping || 0).toFixed(2)}</span></p>
    <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Tax:</span> <span>₹${(totals.tax || 0).toFixed(2)}</span></p>
    <p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 2px solid #df20df; font-size: 18px; font-weight: bold; display: flex; justify-content: space-between;"><span>Total:</span> <span style="color: #df20df;">₹${(totals.total || 0).toFixed(2)}</span></p>
  `;
  
  // Print
  window.print();
};

// Reset search
window.resetSearch = function() {
  document.getElementById('orderIdInput').value = '';
  currentOrder = null;
  showSection('searchSection');
};

// Refresh order status
window.refreshOrder = async function() {
  if (!currentOrder) return;
  
  const orderId = currentOrder.orderId || currentOrder.id;
  
  // Show loading indicator
  const refreshBtn = event.target;
  const originalText = refreshBtn.innerHTML;
  refreshBtn.innerHTML = '⏳ Refreshing...';
  refreshBtn.disabled = true;
  
  try {
    // Fetch latest data from Firebase
    const result = await getOrderById(orderId);
    
    if (result.success && result.order) {
      currentOrder = result.order;
      displayOrder(result.order);
      
      // Show success feedback
      refreshBtn.innerHTML = '✅ Updated!';
      setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
      }, 2000);
    } else {
      // Try localStorage fallback
      const localOrders = JSON.parse(localStorage.getItem('whshop_orders_v1') || '[]');
      const localOrder = localOrders.find(o => o.id === orderId || o.orderId === orderId);
      
      if (localOrder) {
        currentOrder = localOrder;
        displayOrder(localOrder);
      }
      
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error refreshing order:', error);
    refreshBtn.innerHTML = '❌ Error';
    setTimeout(() => {
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }, 2000);
  }
};

// Show section helper
function showSection(sectionId) {
  const sections = ['searchSection', 'loadingSection', 'notFoundSection', 'orderSection'];
  sections.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(sectionId).classList.remove('hidden');
}

// Show notification
function showNotification(message, type = 'info') {
  // Simple alert for now, can be enhanced with toast notifications
  alert(message);
}

// Initialize
loadStoreName();
