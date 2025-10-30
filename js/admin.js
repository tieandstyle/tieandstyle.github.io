// Admin Dashboard Script
import { 
  auth, 
  db,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  getTodaysOrders,
  getAllOrders,
  getOrdersByPhone,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderById
} from './firebase-config.js';

let allOrders = [];
let filteredOrders = [];
let currentUser = null;

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showDashboard();
    loadDashboardData();
  } else {
    showLoginScreen();
  }
});

function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboardScreen').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboardScreen').classList.remove('hidden');
}

// Handle login
window.handleLogin = async function(event) {
  event.preventDefault();
  
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const loginBtn = document.getElementById('loginBtn');
  
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  } catch (error) {
    console.error('Login error:', error);
    alert('❌ Login failed: ' + error.message);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
};

// Handle logout
window.handleLogout = async function() {
  if (confirm('Are you sure you want to logout?')) {
    try {
      await signOut(auth);
      showLoginScreen();
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out: ' + error.message);
    }
  }
};

// Load dashboard data
async function loadDashboardData() {
  try {
    const result = await getTodaysOrders();
    
    if (result.success) {
      allOrders = result.orders;
      filteredOrders = allOrders;
      updateStats(allOrders);
      renderOrdersTable(allOrders);
    } else {
      console.error('Error loading orders:', result.error);
      document.getElementById('ordersTableBody').innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-red-500">
            Error loading orders: ${result.error}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    alert('Error loading dashboard data. Please refresh the page.');
  }
}

// Update statistics
function updateStats(orders) {
  const todayOrders = orders.filter(o => isToday(o.createdAt));
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const abroadOrders = orders.filter(o => o.isAbroadOrder === true);
  
  // Calculate today's revenue - ONLY from confirmed payments
  const todayRevenue = todayOrders.reduce((sum, order) => {
    // Only add to revenue if payment is confirmed
    if (order.paymentStatus === 'confirmed') {
      return sum + (order.totals?.total || 0);
    }
    return sum;
  }, 0);
  
  const uniqueCustomers = new Set(orders.map(o => o.customer?.phone)).size;
  
  document.getElementById('todayOrdersCount').textContent = todayOrders.length;
  document.getElementById('abroadOrdersCount').textContent = abroadOrders.length;
  document.getElementById('todayRevenue').textContent = `₹${todayRevenue.toFixed(2)}`;
  document.getElementById('pendingOrdersCount').textContent = pendingOrders.length;
  document.getElementById('totalCustomers').textContent = uniqueCustomers;
}

// Check if date is today
function isToday(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Render orders table
function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
          No orders found
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = orders.map(order => {
    const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
    const dateStr = date.toLocaleString();
    const itemCount = order.items?.length || 0;
    const total = order.totals?.total || 0;
    const paymentStatus = order.paymentStatus || 'pending';
    const isAbroad = order.isAbroadOrder === true;
    
    return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${isAbroad ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}" onclick="viewOrderDetails('${order.id}')">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            ${isAbroad ? '<span class="text-lg" title="International Order">🌍</span>' : ''}
            <span class="text-sm font-medium text-primary">${order.orderId || order.id}</span>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm font-medium">${order.customer?.name || 'N/A'}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm">${order.customer?.phone || 'N/A'}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm font-semibold">₹${total.toFixed(2)}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${getPaymentBadge(paymentStatus)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${getStatusBadge(order.status)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          ${dateStr}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <button onclick="event.stopPropagation(); viewOrderDetails('${order.id}')" class="text-primary hover:text-primary/80 font-medium">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Get status badge
function getStatusBadge(status) {
  const statusConfig = {
    pending: { color: 'yellow', text: 'Pending', icon: '⏳' },
    processing: { color: 'blue', text: 'Processing', icon: '🔄' },
    completed: { color: 'green', text: 'Completed', icon: '✅' },
    cancelled: { color: 'red', text: 'Cancelled', icon: '❌' }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900 dark:text-${config.color}-200">
      ${config.icon} ${config.text}
    </span>
  `;
}

// Get payment status badge
function getPaymentBadge(paymentStatus) {
  const statusConfig = {
    pending: { color: 'orange', text: 'Payment Pending', icon: '💳' },
    confirmed: { color: 'green', text: 'Payment Confirmed', icon: '✅' },
    failed: { color: 'red', text: 'Payment Failed', icon: '❌' }
  };
  
  const config = statusConfig[paymentStatus] || statusConfig.pending;
  
  return `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900 dark:text-${config.color}-200">
      ${config.icon} ${config.text}
    </span>
  `;
}

// View order details
window.viewOrderDetails = async function(orderId) {
  const modal = document.getElementById('orderModal');
  const modalContent = document.getElementById('orderModalContent');
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modalContent.innerHTML = '<div class="text-center py-8">Loading...</div>';
  
  try {
    const result = await getOrderById(orderId);
    
    if (result.success) {
      const order = result.order;
      modalContent.innerHTML = renderOrderDetails(order);
    } else {
      modalContent.innerHTML = `<div class="text-center py-8 text-red-500">Error: ${result.error}</div>`;
    }
  } catch (error) {
    console.error('Error loading order details:', error);
    modalContent.innerHTML = `<div class="text-center py-8 text-red-500">Error loading order details</div>`;
  }
};

// Render order details
function renderOrderDetails(order) {
  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
  const dateStr = date.toLocaleString();
  
  return `
    <div class="space-y-6">
      <!-- Order Info -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Order ID</p>
            <p class="font-semibold text-primary">${order.orderId || order.id}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Date</p>
            <p class="font-semibold">${dateStr}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Order Status</p>
            <div class="mt-1">${getStatusBadge(order.status)}</div>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Payment Status</p>
            <div class="mt-1">${getPaymentBadge(order.paymentStatus || 'pending')}</div>
          </div>
        </div>
      </div>
      
      <!-- Customer Info -->
      <div>
        <h4 class="font-bold mb-3">👤 Customer Details</h4>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <p><strong>Name:</strong> ${order.customer?.name || 'N/A'}</p>
          <p><strong>Phone:</strong> ${order.customer?.phone || 'N/A'}</p>
          ${order.customer?.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ''}
          <p><strong>Address:</strong> ${order.customer?.address || 'N/A'}</p>
          ${order.customer?.address2 ? `<p>${order.customer.address2}</p>` : ''}
          <p>${order.customer?.city || ''}, ${order.customer?.state || ''} - ${order.customer?.zip || ''}</p>
          ${order.customer?.notes ? `<p class="mt-3"><strong>Notes:</strong> ${order.customer.notes}</p>` : ''}
        </div>
      </div>
      
      <!-- Items -->
      <div>
        <h4 class="font-bold mb-3">🛒 Order Items</h4>
        <div class="space-y-3">
          ${order.items?.map(item => `
            <div class="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="w-16 h-16 bg-cover bg-center rounded-lg flex-shrink-0" style="background-image: url('${item.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%23ddd\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\'/%3E%3C/svg%3E'}');"></div>
              <div class="flex-grow">
                <p class="font-medium">${item.title}</p>
                ${item.color ? `<p class="text-xs text-primary font-semibold mt-1">🎨 Color: ${item.color}</p>` : ''}
                <p class="text-sm text-gray-500 dark:text-gray-400">₹${item.price?.toFixed(2)} × ${item.quantity}</p>
              </div>
              <p class="font-semibold">₹${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          `).join('') || '<p class="text-gray-500">No items</p>'}
        </div>
      </div>
      
      <!-- Totals -->
      <div>
        <h4 class="font-bold mb-3">💰 Payment Summary</h4>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span>₹${order.totals?.subtotal?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="flex justify-between">
            <span>Shipping:</span>
            <span>${order.totals?.shipping === 0 ? 'FREE' : '₹' + order.totals?.shipping?.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span>Tax:</span>
            <span>₹${order.totals?.tax?.toFixed(2) || '0.00'}</span>
          </div>
          ${order.deliveryCharge ? `
          <div class="flex justify-between text-blue-600 font-semibold">
            <span>🌍 Delivery Charge:</span>
            <span>₹${order.deliveryCharge?.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
            <div class="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span class="text-primary">₹${((order.totals?.total || 0) + (order.deliveryCharge || 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      ${order.isAbroadOrder ? `
      <!-- Abroad Order - Delivery Charge -->
      <div>
        <h4 class="font-bold mb-3">🌍 International Delivery Charge</h4>
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
            Enter delivery charge based on customer's location
          </p>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-2">Delivery Charge (₹)</label>
              <input 
                type="number" 
                id="abroadDeliveryCharge"
                min="0"
                step="0.01"
                value="${order.deliveryCharge || 0}"
                placeholder="Enter amount"
                class="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div class="flex gap-2">
              <button 
                onclick="saveDeliveryCharge('${order.id}')" 
                class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                💾 Save Delivery Charge
              </button>
              <button 
                onclick="sendDeliveryChargeWhatsApp('${order.id}', '${order.customer?.phone || ''}', '${order.customer?.name || ''}', '${order.orderId || order.id}')" 
                class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                Send via WhatsApp
              </button>
            </div>
            <p class="text-xs text-blue-700 dark:text-blue-300">
              💡 Save the charge first, then send WhatsApp message to customer with delivery details
            </p>
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Status Update -->
      <div>
        <h4 class="font-bold mb-3">🔄 Update Order Status</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button onclick="updateStatus('${order.id}', 'pending')" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm">
            ⏳ Pending
          </button>
          <button onclick="updateStatus('${order.id}', 'processing')" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
            🔄 Processing
          </button>
          <button onclick="updateStatus('${order.id}', 'completed')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm">
            ✅ Completed
          </button>
          <button onclick="updateStatus('${order.id}', 'cancelled')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
            ❌ Cancelled
          </button>
        </div>
      </div>
      
      <!-- Payment Status Update -->
      <div>
        <h4 class="font-bold mb-3">💳 Update Payment Status</h4>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="updatePayment('${order.id}', 'pending')" class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm">
            💳 Payment Pending
          </button>
          <button onclick="updatePayment('${order.id}', 'confirmed')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm">
            ✅ Payment Confirmed
          </button>
          <button onclick="updatePayment('${order.id}', 'failed')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
            ❌ Payment Failed
          </button>
        </div>
      </div>
      
      <!-- Send Payment Link -->
      <div>
        <h4 class="font-bold mb-3">📱 Send Payment Link via WhatsApp</h4>
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Send UPI payment link to customer's WhatsApp
          </p>
          <button 
            onclick="sendPaymentLink('${order.customer?.phone || ''}', ${order.totals?.total || 0}, '${order.orderId || order.id}')" 
            class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Send Payment Link (₹${order.totals?.total?.toFixed(2) || '0.00'})
          </button>
        </div>
      </div>
    </div>
  `;
}

// Update order status
window.updateStatus = async function(orderId, newStatus) {
  if (!confirm(`Update order status to "${newStatus}"?`)) return;
  
  try {
    const result = await updateOrderStatus(orderId, newStatus);
    
    if (result.success) {
      alert('✅ Status updated successfully!');
      closeOrderModal();
      refreshData();
    } else {
      alert('❌ Error updating status: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    alert('❌ Error updating status: ' + error.message);
  }
};

// Update payment status
window.updatePayment = async function(orderId, paymentStatus) {
  if (!confirm(`Update payment status to "${paymentStatus}"?`)) return;
  
  try {
    const result = await updatePaymentStatus(orderId, paymentStatus);
    
    if (result.success) {
      alert('✅ Payment status updated successfully!');
      closeOrderModal();
      refreshData();
    } else {
      alert('❌ Error updating payment status: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    alert('❌ Error updating payment status: ' + error.message);
  }
};

// Send payment link via WhatsApp
window.sendPaymentLink = async function(phoneNumber, amount, orderId) {
  if (!phoneNumber || !amount) {
    alert('❌ Invalid phone number or amount');
    return;
  }
  
  try {
    // Fetch store data to get UPI ID
    const response = await fetch('data/store.json', { cache: 'no-cache' });
    const storeData = await response.json();
    
    const upiID = storeData.payments?.gpayUpiId || 'santhoshsharuk16-1@okhdfcbank';
    const storeName = storeData.name || 'Tie-Style';
    
    // Clean phone number (remove any spaces, dashes, or plus sign)
    const cleanPhone = phoneNumber.replace(/[\s\-+]/g, '');
    
    // Create UPI payment link
    const note = encodeURIComponent(`Payment for Order ${orderId}`);
    const upiLink = `upi://pay?pa=${upiID}&pn=${encodeURIComponent(storeName)}&tn=${note}&am=${amount}&cu=INR`;
    
    // Create WhatsApp message
    const message = encodeURIComponent(
      `Hi! 👋 Thank you for your order!\n\n` +
      `📦 Order ID: ${orderId}\n` +
      `💰 Amount: ₹${amount.toFixed(2)}\n\n` +
      `Please complete your payment using this UPI link:\n${upiLink}\n\n` +
      `Or pay to:\n` +
      `💳 UPI ID: ${upiID}\n\n` +
      `After payment, please share the UTR number/screenshot here.\n\n` +
      `Thank you! 🙏`
    );
    
    // Open WhatsApp with the message
    const whatsappURL = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappURL, '_blank');
    
  } catch (error) {
    console.error('Error sending payment link:', error);
    alert('❌ Error sending payment link. Please try again.');
  }
};

// Save delivery charge for abroad order
window.saveDeliveryCharge = async function(orderId) {
  const deliveryChargeInput = document.getElementById('abroadDeliveryCharge');
  const deliveryCharge = parseFloat(deliveryChargeInput.value);
  
  if (isNaN(deliveryCharge) || deliveryCharge < 0) {
    alert('❌ Please enter a valid delivery charge');
    return;
  }
  
  if (!confirm(`Save delivery charge of ₹${deliveryCharge.toFixed(2)}?`)) return;
  
  try {
    const { updateDoc, doc } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');
    
    // Update order with delivery charge
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      deliveryCharge: deliveryCharge,
      updatedAt: new Date()
    });
    
    alert('✅ Delivery charge saved successfully!');
    
    // Refresh order details
    viewOrderDetails(orderId);
    
  } catch (error) {
    console.error('Error saving delivery charge:', error);
    alert('❌ Error saving delivery charge: ' + error.message);
  }
};

// Send delivery charge details via WhatsApp
window.sendDeliveryChargeWhatsApp = async function(orderId, phoneNumber, customerName, orderIdDisplay) {
  const deliveryChargeInput = document.getElementById('abroadDeliveryCharge');
  const deliveryCharge = parseFloat(deliveryChargeInput.value);
  
  if (isNaN(deliveryCharge) || deliveryCharge < 0) {
    alert('❌ Please enter a valid delivery charge first');
    return;
  }
  
  if (!phoneNumber) {
    alert('❌ Customer phone number not available');
    return;
  }
  
  try {
    // Fetch order details to get the complete information
    const result = await getOrderById(orderId);
    if (!result.success) {
      throw new Error('Could not fetch order details');
    }
    
    const order = result.order;
    const subtotal = order.totals?.subtotal || 0;
    const finalTotal = subtotal + deliveryCharge;
    
    // Fetch store data
    const response = await fetch('data/store.json', { cache: 'no-cache' });
    const storeData = await response.json();
    const upiID = storeData.payments?.gpayUpiId || 'santhoshsharuk16-1@okhdfcbank';
    const storeName = storeData.name || 'Tie-Style';
    const storePhone = storeData.contact?.phoneE164 || '+918110960489';
    
    // Clean phone number
    const cleanPhone = phoneNumber.replace(/[\s\-+]/g, '');
    
    // Create WhatsApp message
    const itemsList = order.items?.map((item, index) => 
      `${index + 1}. ${item.title}${item.color ? ` (${item.color})` : ''} - ₹${item.price.toFixed(2)} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
    ).join('\n') || '';
    
    const message = encodeURIComponent(
      `🌍 *INTERNATIONAL ORDER CONFIRMATION*\n\n` +
      `Hi ${customerName}! 👋\n\n` +
      `Thank you for your international order!\n\n` +
      `📦 *Order ID:* ${orderIdDisplay}\n` +
      `📅 *Date:* ${new Date().toLocaleDateString()}\n\n` +
      `*ORDER ITEMS:*\n${itemsList}\n\n` +
      `💰 *PAYMENT DETAILS:*\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `Subtotal: ₹${subtotal.toFixed(2)}\n` +
      `🌍 International Delivery: ₹${deliveryCharge.toFixed(2)}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `*TOTAL AMOUNT: ₹${finalTotal.toFixed(2)}*\n\n` +
      `📍 Delivery Location: ${order.customer?.city || ''}, ${order.customer?.state || ''}, ${order.customer?.zip || ''}\n\n` +
      `💳 *PAYMENT INSTRUCTIONS:*\n` +
      `Please pay ₹${finalTotal.toFixed(2)} to:\n` +
      `UPI ID: ${upiID}\n\n` +
      `After payment, please share:\n` +
      `✅ UTR/Transaction ID\n` +
      `✅ Payment screenshot\n\n` +
      `📞 For queries: ${storePhone}\n\n` +
      `Thank you! We'll process your order once payment is confirmed. 🙏`
    );
    
    // Open WhatsApp
    const whatsappURL = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappURL, '_blank');
    
    alert('✅ WhatsApp message opened! Please send the message to customer.');
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    alert('❌ Error: ' + error.message);
  }
};

// Close modal
window.closeOrderModal = function() {
  const modal = document.getElementById('orderModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

// Search by phone
window.searchByPhone = async function() {
  const phone = document.getElementById('phoneSearch').value.trim();
  
  if (phone.length === 0) {
    filteredOrders = allOrders;
    renderOrdersTable(filteredOrders);
    return;
  }
  
  if (phone.length < 3) return;
  
  try {
    const result = await getOrdersByPhone(phone);
    
    if (result.success) {
      filteredOrders = result.orders;
      renderOrdersTable(filteredOrders);
      updateStats(filteredOrders);
    }
  } catch (error) {
    console.error('Error searching orders:', error);
  }
};

// Filter orders
window.filterOrders = async function() {
  const statusFilter = document.getElementById('statusFilter').value;
  const dateFilter = document.getElementById('dateFilter').value;
  
  try {
    let orders = [];
    
    if (dateFilter === 'today' || statusFilter === 'today') {
      const result = await getTodaysOrders();
      orders = result.success ? result.orders : [];
    } else {
      const result = await getAllOrders();
      orders = result.success ? result.orders : [];
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && statusFilter !== 'today') {
      orders = orders.filter(o => o.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all' && dateFilter !== 'today') {
      const now = new Date();
      orders = orders.filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthAgo;
        }
        return true;
      });
    }
    
    allOrders = orders;
    filteredOrders = orders;
    renderOrdersTable(orders);
    updateStats(orders);
  } catch (error) {
    console.error('Error filtering orders:', error);
  }
};

// Refresh data
window.refreshData = async function() {
  await loadDashboardData();
  document.getElementById('phoneSearch').value = '';
  document.getElementById('statusFilter').value = 'today';
  document.getElementById('dateFilter').value = 'today';
};

// ==================== ANALYTICS FUNCTIONS ====================

let revenueChart = null;
let statusChart = null;
let paymentChart = null;

// Switch between tabs
window.switchTab = function(tab) {
  const ordersView = document.getElementById('ordersView');
  const analyticsView = document.getElementById('analyticsView');
  const ordersTab = document.getElementById('ordersTab');
  const abroadTab = document.getElementById('abroadTab');
  const analyticsTab = document.getElementById('analyticsTab');
  
  // Remove active state from all tabs
  [ordersTab, abroadTab, analyticsTab].forEach(t => {
    t.classList.remove('border-primary', 'text-primary');
    t.classList.add('border-transparent');
  });
  
  // Hide all views
  ordersView.classList.add('hidden');
  analyticsView.classList.add('hidden');
  
  if (tab === 'orders') {
    ordersView.classList.remove('hidden');
    ordersTab.classList.add('border-primary', 'text-primary');
    ordersTab.classList.remove('border-transparent');
    
    // Show all orders
    renderOrdersTable(allOrders);
  } else if (tab === 'abroad') {
    ordersView.classList.remove('hidden');
    abroadTab.classList.add('border-primary', 'text-primary');
    abroadTab.classList.remove('border-transparent');
    
    // Show only abroad orders
    const abroadOrders = allOrders.filter(order => order.isAbroadOrder === true);
    renderOrdersTable(abroadOrders);
    
    // Update filter message
    const tableBody = document.getElementById('ordersTableBody');
    if (abroadOrders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center">
            <div class="flex flex-col items-center gap-3">
              <span class="text-6xl">🌍</span>
              <p class="text-lg font-semibold text-black dark:text-white">No International Orders</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Abroad orders will appear here when customers place international orders</p>
            </div>
          </td>
        </tr>
      `;
    }
  } else if (tab === 'analytics') {
    analyticsView.classList.remove('hidden');
    analyticsTab.classList.add('border-primary', 'text-primary');
    analyticsTab.classList.remove('border-transparent');
    loadAnalytics();
  }
};

// Load analytics data
async function loadAnalytics() {
  try {
    const result = await getAllOrders();
    if (result.success) {
      const orders = result.orders;
      
      // Render charts
      renderRevenueChart(orders);
      renderStatusChart(orders);
      renderPaymentChart(orders);
      renderTopProducts(orders);
      renderRecentCustomers(orders);
      renderSalesByDate(orders);
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

// Update analytics based on date filter
window.updateAnalytics = async function() {
  const filterValue = document.getElementById('analyticsDateFilter').value;
  
  try {
    const result = await getAllOrders();
    if (!result.success) return;
    
    let filteredOrders = result.orders;
    const now = new Date();
    
    // Filter orders based on selected date range
    switch(filterValue) {
      case 'today':
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate.toDateString() === now.toDateString();
        });
        break;
        
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate >= weekAgo;
        });
        break;
        
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate >= monthAgo;
        });
        break;
        
      case 'all':
      default:
        // No filtering, use all orders
        break;
    }
    
    // Calculate analytics metrics
    const confirmedOrders = filteredOrders.filter(o => o.paymentStatus === 'confirmed');
    const totalRevenue = confirmedOrders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
    const avgOrderValue = confirmedOrders.length > 0 ? totalRevenue / confirmedOrders.length : 0;
    
    // Update analytics summary cards
    document.getElementById('analyticsRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('analyticsOrders').textContent = filteredOrders.length;
    document.getElementById('analyticsAvgOrder').textContent = `₹${avgOrderValue.toFixed(2)}`;
    
    // Re-render all charts with filtered data
    renderRevenueChart(filteredOrders);
    renderStatusChart(filteredOrders);
    renderPaymentChart(filteredOrders);
    renderTopProducts(filteredOrders);
    renderRecentCustomers(filteredOrders);
    renderSalesByDate(filteredOrders);
    
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
};

// Revenue Over Time Chart
function renderRevenueChart(orders) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  
  // Determine days based on filter
  const filterValue = document.getElementById('analyticsDateFilter')?.value || 'month';
  let days = 30;
  
  switch(filterValue) {
    case 'today':
      days = 1;
      break;
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    case 'all':
      // Show last 90 days for all time
      days = 90;
      break;
  }
  
  const labels = [];
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(dateStr);
    
    // Calculate revenue for this day
    const dayRevenue = orders.filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      return orderDate.toDateString() === date.toDateString() && 
             order.paymentStatus === 'confirmed';
    }).reduce((sum, order) => sum + (order.totals?.total || 0), 0);
    
    data.push(dayRevenue);
  }
  
  // Destroy existing chart
  if (revenueChart) {
    revenueChart.destroy();
  }
  
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { 
          display: true,
          labels: {
            color: '#666',
            font: {
              size: 12,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Revenue: ₹' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value;
            },
            color: '#999'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            color: '#999'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Order Status Chart
function renderStatusChart(orders) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  
  const statusCounts = {
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  };
  
  orders.forEach(order => {
    const status = order.status || 'pending';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  });
  
  // Destroy existing chart
  if (statusChart) {
    statusChart.destroy();
  }
  
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Processing', 'Completed', 'Cancelled'],
      datasets: [{
        data: [
          statusCounts.pending,
          statusCounts.processing,
          statusCounts.completed,
          statusCounts.cancelled
        ],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Payment Status Chart
function renderPaymentChart(orders) {
  const ctx = document.getElementById('paymentChart');
  if (!ctx) return;
  
  const paymentCounts = {
    pending: 0,
    confirmed: 0,
    failed: 0
  };
  
  orders.forEach(order => {
    const payment = order.paymentStatus || 'pending';
    if (paymentCounts.hasOwnProperty(payment)) {
      paymentCounts[payment]++;
    }
  });
  
  // Destroy existing chart
  if (paymentChart) {
    paymentChart.destroy();
  }
  
  paymentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Pending', 'Confirmed', 'Failed'],
      datasets: [{
        label: 'Orders',
        data: [paymentCounts.pending, paymentCounts.confirmed, paymentCounts.failed],
        backgroundColor: ['#f59e0b', '#10b981', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Top Selling Products
function renderTopProducts(orders) {
  const productCounts = {};
  const productRevenue = {};
  
  orders.forEach(order => {
    if (order.paymentStatus === 'confirmed' && order.items) {
      order.items.forEach(item => {
        const title = item.title || 'Unknown Product';
        productCounts[title] = (productCounts[title] || 0) + (item.quantity || 1);
        productRevenue[title] = (productRevenue[title] || 0) + (item.price * item.quantity || 0);
      });
    }
  });
  
  // Sort by revenue
  const sorted = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const html = sorted.length > 0 ? sorted.map(([product, revenue], index) => `
    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
          ${index + 1}
        </div>
        <div>
          <p class="font-medium">${product}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">${productCounts[product]} sold</p>
        </div>
      </div>
      <p class="font-bold text-green-600">₹${revenue.toFixed(2)}</p>
    </div>
  `).join('') : '<p class="text-gray-500 dark:text-gray-400">No data available</p>';
  
  document.getElementById('topProductsList').innerHTML = html;
}

// Recent Customers
function renderRecentCustomers(orders) {
  const recentOrders = [...orders]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    })
    .slice(0, 5);
  
  const html = recentOrders.length > 0 ? recentOrders.map(order => {
    const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <p class="font-medium">${order.customer?.name || 'Unknown'}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">${order.customer?.phone || 'N/A'}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-green-600">₹${order.totals?.total?.toFixed(2) || '0.00'}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${date.toLocaleDateString()}</p>
        </div>
      </div>
    `;
  }).join('') : '<p class="text-gray-500 dark:text-gray-400">No data available</p>';
  
  document.getElementById('recentCustomersList').innerHTML = html;
}

// Sales by Date
function renderSalesByDate(orders) {
  const salesByDate = {};
  
  orders.forEach(order => {
    if (order.paymentStatus === 'confirmed') {
      const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const dateStr = date.toLocaleDateString();
      
      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = { count: 0, revenue: 0 };
      }
      
      salesByDate[dateStr].count++;
      salesByDate[dateStr].revenue += order.totals?.total || 0;
    }
  });
  
  const sorted = Object.entries(salesByDate)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 10);
  
  const html = sorted.length > 0 ? sorted.map(([date, data]) => `
    <tr>
      <td class="px-4 py-3">${date}</td>
      <td class="px-4 py-3">${data.count}</td>
      <td class="px-4 py-3 font-bold text-green-600">₹${data.revenue.toFixed(2)}</td>
      <td class="px-4 py-3">₹${(data.revenue / data.count).toFixed(2)}</td>
    </tr>
  `).join('') : '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No data available</td></tr>';
  
  document.getElementById('salesByDateTable').innerHTML = html;
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-blue-500 text-white'
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
