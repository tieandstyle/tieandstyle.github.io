// Track Order Page Script
import { getOrderById, db, collection, getDocs, query, where } from './firebase-config.js';

let currentOrder = null;
let allOrders = [];

// Tab switching
window.switchSearchTab = function(tab) {
  const tabOrderId = document.getElementById('tabOrderId');
  const tabPhone = document.getElementById('tabPhone');
  const orderIdForm = document.getElementById('orderIdForm');
  const phoneForm = document.getElementById('phoneForm');
  
  if (tab === 'orderId') {
    tabOrderId.className = 'flex-1 py-3 px-4 text-center font-medium border-b-2 border-primary text-primary';
    tabPhone.className = 'flex-1 py-3 px-4 text-center font-medium text-gray-500 border-b-2 border-transparent hover:text-primary';
    orderIdForm.classList.remove('hidden');
    phoneForm.classList.add('hidden');
  } else {
    tabPhone.className = 'flex-1 py-3 px-4 text-center font-medium border-b-2 border-primary text-primary';
    tabOrderId.className = 'flex-1 py-3 px-4 text-center font-medium text-gray-500 border-b-2 border-transparent hover:text-primary';
    phoneForm.classList.remove('hidden');
    orderIdForm.classList.add('hidden');
  }
};

// Track by phone/email
window.trackByPhone = async function(event) {
  event.preventDefault();
  
  const phoneInput = document.getElementById('phoneInput').value.trim();
  
  if (!phoneInput) {
    showNotification('Please enter phone number or email', 'error');
    return;
  }
  
  showSection('loadingSection');
  
  try {
    const isEmail = phoneInput.includes('@');
    const ordersRef = collection(db, 'orders');
    const q = isEmail 
      ? query(ordersRef, where('customer.email', '==', phoneInput))
      : query(ordersRef, where('customer.phone', '==', phoneInput));
    
    const snapshot = await getDocs(q);
    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    
    // Sort by date descending
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    if (orders.length > 0) {
      allOrders = orders;
      displayOrdersList(orders, phoneInput);
    } else {
      showSection('notFoundSection');
    }
  } catch (error) {
    console.error('Error searching orders:', error);
    showSection('notFoundSection');
  }
};

// Display multiple orders list
function displayOrdersList(orders, searchValue) {
  const orderSection = document.getElementById('orderSection');
  
  // Create orders list HTML
  const ordersListHTML = `
    <div class="bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6 mb-6 animate-slideInUp">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold">📦 Your Orders</h2>
          <p class="text-sm text-gray-500">${searchValue} • ${orders.length} order${orders.length > 1 ? 's' : ''}</p>
        </div>
        <button onclick="resetSearch()" class="text-primary hover:underline text-sm">← Change</button>
      </div>
      
      <div class="space-y-4" id="ordersListContainer">
        ${orders.map(order => {
          const status = order.status || 'pending';
          const statusConfig = getStatusConfig(status);
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
          const total = order.totals?.grandTotal || order.totals?.total || 0;
          const itemCount = order.items?.length || 0;
          
          return `
            <div class="border rounded-lg p-4 cursor-pointer hover:shadow-lg hover:border-primary transition" onclick="viewOrderDetail('${order.id}')">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-bold text-primary">${order.orderId || order.id}</p>
                  <p class="text-sm text-gray-500">${orderDate.toLocaleDateString()} • ${itemCount} item${itemCount > 1 ? 's' : ''}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold">₹${total}</p>
                  <span class="text-sm ${statusConfig.color}">${statusConfig.icon} ${statusConfig.label}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  // Hide other content and show orders list
  document.getElementById('customerDetails').parentElement.parentElement.classList.add('hidden');
  orderSection.innerHTML = ordersListHTML;
  showSection('orderSection');
}

// View single order detail - show in modal
window.viewOrderDetail = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  
  currentOrder = order;
  
  const status = order.status || 'pending';
  const statusConfig = getStatusConfig(status);
  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
  const total = order.totals?.grandTotal || order.totals?.total || 0;
  
  // Timeline steps
  const timelineSteps = [
    { key: 'pending', label: 'Order Placed', icon: '📝' },
    { key: 'processing', label: 'Processing', icon: '⚙️' },
    { key: 'packed', label: 'Packed', icon: '📦' },
    { key: 'dispatched', label: 'Dispatched', icon: '🚚' },
    { key: 'in-transit', label: 'In Transit', icon: '🛣️' },
    { key: 'out-for-delivery', label: 'Out for Delivery', icon: '🏃' },
    { key: 'delivered', label: 'Delivered', icon: '✅' }
  ];
  
  const statusOrder = ['pending', 'processing', 'packed', 'dispatched', 'in-transit', 'out-for-delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(status);
  const isCancelled = status === 'cancelled';
  
  // Build timeline HTML
  const timelineHTML = timelineSteps.map((step, index) => {
    const isDone = index < currentIndex;
    const isCurrent = index === currentIndex && !isCancelled;
    const isPending = index > currentIndex;
    
    let dotClass = 'bg-gray-300';
    let lineClass = 'bg-gray-300';
    let textClass = 'text-gray-400';
    
    if (isDone) {
      dotClass = 'bg-green-500';
      lineClass = 'bg-green-500';
      textClass = 'text-green-600';
    } else if (isCurrent) {
      dotClass = 'bg-primary animate-pulse';
      textClass = 'text-primary font-bold';
    }
    
    return `
      <div class="flex items-start gap-3 relative">
        <div class="flex flex-col items-center">
          <div class="w-4 h-4 rounded-full ${dotClass} z-10"></div>
          ${index < timelineSteps.length - 1 ? `<div class="w-0.5 h-8 ${isDone ? 'bg-green-500' : 'bg-gray-300'}"></div>` : ''}
        </div>
        <div class="-mt-1">
          <p class="text-sm ${textClass}">${step.icon} ${step.label}</p>
          ${isCurrent ? `<p class="text-xs text-gray-500">${orderDate.toLocaleDateString()}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Create modal HTML
  const modalHTML = `
    <div id="orderDetailModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick="if(event.target===this) closeOrderModal()">
      <div class="bg-white dark:bg-background-dark rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slideInUp">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 class="text-xl font-bold text-primary">${order.orderId || order.id}</h2>
              <p class="text-sm text-gray-500">${orderDate.toLocaleDateString()}</p>
            </div>
            <button onclick="closeOrderModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          
          ${isCancelled ? `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-center">
              <span class="text-4xl">❌</span>
              <p class="font-bold mt-2 text-red-600">Order Cancelled</p>
            </div>
          ` : `
            <!-- Visual Timeline -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <h3 class="font-bold text-sm mb-3">📊 Order Progress</h3>
              ${timelineHTML}
            </div>
          `}
          
          <!-- Items -->
          <div class="mb-4">
            <h3 class="font-bold mb-2">📦 Items</h3>
            <div class="space-y-2">
              ${(order.items || []).map(item => `
                <div class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <img src="${item.image || 'image/placeholder.jpg'}" class="w-12 h-12 rounded object-cover" onerror="this.src='image/placeholder.jpg'"/>
                  <div class="flex-grow">
                    <p class="font-medium text-sm">${item.title}</p>
                    <p class="text-xs text-gray-500">Qty: ${item.quantity} × ₹${item.price}</p>
                  </div>
                  <p class="font-medium">₹${(item.price * item.quantity)}</p>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Total -->
          <div class="border-t pt-3 mb-4">
            <div class="flex justify-between text-sm"><span>Subtotal</span><span>₹${order.totals?.subtotal || 0}</span></div>
            <div class="flex justify-between text-sm"><span>Shipping</span><span>₹${order.totals?.shipping || 0}</span></div>
            <div class="flex justify-between font-bold text-lg mt-2"><span>Total</span><span class="text-primary">₹${total}</span></div>
          </div>
          
          <!-- Address -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <h3 class="font-bold text-sm mb-1">📍 Delivery Address</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              ${order.customer?.name || ''}<br/>
              ${order.customer?.address || ''} ${order.customer?.address2 || ''}<br/>
              ${order.customer?.city || ''}, ${order.customer?.state || ''} - ${order.customer?.zip || ''}
            </p>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-2">
            <button onclick="closeOrderModal()" class="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-300">
              ← Back to List
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  const modalContainer = document.createElement('div');
  modalContainer.id = 'modalContainer';
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);
};

// Close order modal
window.closeOrderModal = function() {
  const container = document.getElementById('modalContainer');
  if (container) container.remove();
};

// Get status config helper
function getStatusConfig(status) {
  const configs = {
    pending: { icon: '📝', label: 'Pending', color: 'text-yellow-600' },
    processing: { icon: '⚙️', label: 'Processing', color: 'text-blue-600' },
    packed: { icon: '📦', label: 'Packed', color: 'text-purple-600' },
    dispatched: { icon: '🚚', label: 'Dispatched', color: 'text-indigo-600' },
    'in-transit': { icon: '🛣️', label: 'In Transit', color: 'text-blue-600' },
    'out-for-delivery': { icon: '🏃', label: 'Out for Delivery', color: 'text-orange-600' },
    delivered: { icon: '✅', label: 'Delivered', color: 'text-green-600' },
    cancelled: { icon: '❌', label: 'Cancelled', color: 'text-red-600' }
  };
  return configs[status] || configs.pending;
}

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
    pending: {
      icon: '⏳',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      title: 'Order Pending',
      message: 'Your order has been received and is awaiting processing'
    },
    processing: {
      icon: '📦',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      title: 'Order Processing',
      message: 'Your order is being prepared for shipment'
    },
    completed: {
      icon: '✅',
      bg: 'bg-green-100 dark:bg-green-900/30',
      title: 'Order Completed',
      message: 'Your order has been delivered successfully'
    },
    cancelled: {
      icon: '❌',
      bg: 'bg-red-100 dark:bg-red-900/30',
      title: 'Order Cancelled',
      message: 'This order has been cancelled'
    }
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
    { key: 'processing', label: 'Processing', icon: '⚙️' },
    { key: 'completed', label: 'Completed', icon: '✅' }
  ];
  
  if (status === 'cancelled') {
    steps.push({ key: 'cancelled', label: 'Cancelled', icon: '❌' });
  }
  
  const statusOrder = ['pending', 'processing', 'completed', 'cancelled'];
  const currentIndex = statusOrder.indexOf(status);
  
  timeline.innerHTML = steps.map((step, index) => {
    const stepIndex = statusOrder.indexOf(step.key);
    const isActive = stepIndex === currentIndex;
    const isCompleted = stepIndex < currentIndex && status !== 'cancelled';
    const isCancelled = status === 'cancelled' && step.key === 'cancelled';
    
    let statusClass = '';
    if (isActive) statusClass = 'active';
    else if (isCompleted) statusClass = 'completed';
    else if (isCancelled) statusClass = 'active';
    
    return `
      <div class="status-step ${statusClass}">
        <div class="step-icon">
          <span class="text-lg">${step.icon}</span>
        </div>
        <div>
          <p class="font-semibold">${step.label}</p>
          ${isActive || isCompleted || isCancelled ? `<p class="text-sm text-gray-500 dark:text-gray-400">${orderDate.toLocaleString()}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
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
