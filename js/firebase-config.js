// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit, updateDoc, doc, getDoc, setDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD4cnjl2FLfn9bMc3Y5ivRovebkOv_6y8I",
    authDomain: "tie-and-style.firebaseapp.com",
    projectId: "tie-and-style",
    storageBucket: "tie-and-style.firebasestorage.app",
    messagingSenderId: "758894353565",
    appId: "1:758894353565:web:bd9d8ca1758478a2710874"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export Firebase services
export { 
  db, 
  auth,
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
};

// Helper functions for order management
export async function saveOrderToFirebase(orderData) {
  try {
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error('Error saving order to Firebase:', error);
    return { success: false, error: error.message };
  }
}

export async function getOrdersByPhone(phoneNumber) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef, 
      where('customer.phone', '==', phoneNumber),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: error.message, orders: [] };
  }
}

export async function getTodaysOrders() {
  try {
    const ordersRef = collection(db, 'orders');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      ordersRef,
      where('createdAt', '>=', Timestamp.fromDate(today)),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching today\'s orders:', error);
    return { success: false, error: error.message, orders: [] };
  }
}

export async function getAllOrders(limitCount = 100) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return { success: false, error: error.message, orders: [] };
  }
}

export async function updateOrderStatus(orderId, newStatus) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      paymentStatus: paymentStatus,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

export async function getOrderById(orderId) {
  try {
    // First try to get by document ID
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (orderDoc.exists()) {
      return { success: true, order: { id: orderDoc.id, ...orderDoc.data() } };
    }
    
    // If not found by document ID, search by orderId field
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('orderId', '==', orderId), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { success: true, order: { id: doc.id, ...doc.data() } };
    }
    
    return { success: false, error: 'Order not found' };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: error.message };
  }
}

// Customer CRM functions - getCustomerOrders moved to bottom with full email/phone support

export async function getCustomerStats(phoneNumber) {
  try {
    const result = await getOrdersByPhone(phoneNumber);
    if (!result.success) return result;
    
    const orders = result.orders;
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    
    return {
      success: true,
      stats: {
        totalOrders,
        totalSpent,
        completedOrders,
        lastOrderDate: orders[0]?.createdAt || null
      }
    };
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// PRODUCT CATALOG FUNCTIONS (Read from Firestore)
// ============================================

/**
 * Get all categories from Firestore
 * @returns {Promise<{success: boolean, categories?: Array, error?: string}>}
 */
export async function getCategories() {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('active', '==', true), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, categories };
  } catch (error) {
    console.error('Error fetching categories from Firestore:', error);
    return { success: false, error: error.message, categories: [] };
  }
}

/**
 * Get all subcategories from Firestore
 * @param {string} parentCategoryId - Optional filter by parent category
 * @returns {Promise<{success: boolean, subcategories?: Array, error?: string}>}
 */
export async function getSubcategories(parentCategoryId = null) {
  try {
    const subcategoriesRef = collection(db, 'subcategories');
    let q;
    
    if (parentCategoryId) {
      q = query(
        subcategoriesRef, 
        where('parentCategoryId', '==', parentCategoryId),
        where('active', '==', true),
        orderBy('order', 'asc')
      );
    } else {
      q = query(subcategoriesRef, where('active', '==', true), orderBy('order', 'asc'));
    }
    
    const snapshot = await getDocs(q);
    const subcategories = [];
    snapshot.forEach(doc => {
      subcategories.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, subcategories };
  } catch (error) {
    console.error('Error fetching subcategories from Firestore:', error);
    return { success: false, error: error.message, subcategories: [] };
  }
}

/**
 * Get all available products from Firestore
 * @param {number} limitCount - Maximum products to return (default 100)
 * @returns {Promise<{success: boolean, products?: Array, error?: string}>}
 */
export async function getProducts(limitCount = 500) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef, 
      where('available', '==', true),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, products };
  } catch (error) {
    console.error('Error fetching products from Firestore:', error);
    return { success: false, error: error.message, products: [] };
  }
}

/**
 * Get products by category ID
 * @param {string} categoryId - Category ID to filter by
 * @returns {Promise<{success: boolean, products?: Array, error?: string}>}
 */
export async function getProductsByCategory(categoryId) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef, 
      where('categoryIds', 'array-contains', categoryId),
      where('available', '==', true)
    );
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, products };
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return { success: false, error: error.message, products: [] };
  }
}

/**
 * Get products by subcategory ID
 * @param {string} subcategoryId - Subcategory ID to filter by
 * @returns {Promise<{success: boolean, products?: Array, error?: string}>}
 */
export async function getProductsBySubcategory(subcategoryId) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef, 
      where('subcategoryId', '==', subcategoryId),
      where('available', '==', true)
    );
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, products };
  } catch (error) {
    console.error('Error fetching products by subcategory:', error);
    return { success: false, error: error.message, products: [] };
  }
}

/**
 * Get a single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<{success: boolean, product?: Object, error?: string}>}
 */
export async function getProductById(productId) {
  try {
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (productDoc.exists()) {
      return { success: true, product: { id: productDoc.id, ...productDoc.data() } };
    }
    return { success: false, error: 'Product not found' };
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single product by slug
 * @param {string} slug - Product slug
 * @returns {Promise<{success: boolean, product?: Object, error?: string}>}
 */
export async function getProductBySlug(slug) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { success: true, product: { id: doc.id, ...doc.data() } };
    }
    return { success: false, error: 'Product not found' };
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<{success: boolean, category?: Object, error?: string}>}
 */
export async function getCategoryById(categoryId) {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    
    if (categoryDoc.exists()) {
      return { success: true, category: { id: categoryDoc.id, ...categoryDoc.data() } };
    }
    return { success: false, error: 'Category not found' };
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a category by slug
 * @param {string} slug - Category slug
 * @returns {Promise<{success: boolean, category?: Object, error?: string}>}
 */
export async function getCategoryBySlug(slug) {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { success: true, category: { id: doc.id, ...doc.data() } };
    }
    return { success: false, error: 'Category not found' };
  } catch (error) {
    console.error('Error fetching category by slug:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get subcategory by ID
 * @param {string} subcategoryId - Subcategory ID
 * @returns {Promise<{success: boolean, subcategory?: Object, error?: string}>}
 */
export async function getSubcategoryById(subcategoryId) {
  try {
    const subcategoryRef = doc(db, 'subcategories', subcategoryId);
    const subcategoryDoc = await getDoc(subcategoryRef);
    
    if (subcategoryDoc.exists()) {
      return { success: true, subcategory: { id: subcategoryDoc.id, ...subcategoryDoc.data() } };
    }
    return { success: false, error: 'Subcategory not found' };
  } catch (error) {
    console.error('Error fetching subcategory by ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get store configuration from Firestore
 * @returns {Promise<{success: boolean, store?: Object, error?: string}>}
 */
export async function getStoreConfig() {
  try {
    const storeRef = doc(db, 'store', 'config');
    const storeDoc = await getDoc(storeRef);
    
    if (storeDoc.exists()) {
      return { success: true, store: storeDoc.data() };
    }
    return { success: false, error: 'Store config not found' };
  } catch (error) {
    console.error('Error fetching store config from Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active news items from Firestore
 * @returns {Promise<{success: boolean, news?: Array, error?: string}>}
 */
export async function getNews() {
  try {
    const newsRef = collection(db, 'news');
    const q = query(newsRef, where('active', '==', true));
    const snapshot = await getDocs(q);
    const news = [];
    snapshot.forEach(doc => {
      news.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, news };
  } catch (error) {
    console.error('Error fetching news from Firestore:', error);
    return { success: false, error: error.message, news: [] };
  }
}

// ============================================
// ADMIN CRUD FUNCTIONS
// ============================================

// ----- PRODUCT CRUD -----

/**
 * Add a new product
 */
export async function addProduct(productData) {
  try {
    const productId = productData.id || `prod-${Date.now()}`;
    const slug = productData.slug || productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    await setDoc(doc(db, 'products', productId), {
      ...productData,
      id: productId,
      slug,
      available: productData.available !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return { success: true, productId };
  } catch (error) {
    console.error('Error adding product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(productId, updates) {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId) {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all products (for admin - includes unavailable)
 */
export async function getAllProducts() {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, products };
  } catch (error) {
    console.error('Error fetching all products:', error);
    return { success: false, error: error.message, products: [] };
  }
}

/**
 * Reduce stock for products when an order is placed
 * @param {Array} items - Array of cart items with productId/sku and quantity
 */
export async function reduceProductStock(items) {
  try {
    const errors = [];
    
    for (const item of items) {
      // Try to find product by SKU or productId
      const productId = item.productId || item.sku || item.id;
      
      if (!productId) {
        console.warn('No product identifier found for item:', item.title);
        continue;
      }
      
      try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          const newStock = Math.max(0, currentStock - (item.quantity || 1));
          
          await updateDoc(productRef, {
            stock: newStock,
            updatedAt: new Date().toISOString()
          });
          
          console.log(`✅ Stock reduced for ${item.title}: ${currentStock} → ${newStock}`);
        } else {
          console.warn(`Product not found: ${productId}`);
        }
      } catch (itemError) {
        console.error(`Error reducing stock for ${productId}:`, itemError);
        errors.push({ productId, error: itemError.message });
      }
    }
    
    return { 
      success: errors.length === 0, 
      errors: errors.length > 0 ? errors : null 
    };
  } catch (error) {
    console.error('Error in reduceProductStock:', error);
    return { success: false, error: error.message };
  }
}

// ----- CATEGORY CRUD -----

/**
 * Add a new category
 */
export async function addCategory(categoryData) {
  try {
    const categoryId = categoryData.id || `cat-${Date.now()}`;
    const slug = categoryData.slug || categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    await setDoc(doc(db, 'categories', categoryId), {
      ...categoryData,
      id: categoryId,
      slug,
      active: categoryData.active !== false,
      createdAt: new Date().toISOString()
    });
    
    return { success: true, categoryId };
  } catch (error) {
    console.error('Error adding category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a category
 */
export async function updateCategory(categoryId, updates) {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId) {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all categories (for admin - includes inactive)
 */
export async function getAllCategories() {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, categories };
  } catch (error) {
    console.error('Error fetching all categories:', error);
    return { success: false, error: error.message, categories: [] };
  }
}

// ----- SUBCATEGORY CRUD -----

/**
 * Add a new subcategory
 */
export async function addSubcategory(subcategoryData) {
  try {
    const subcategoryId = subcategoryData.id || `subcat-${Date.now()}`;
    const slug = subcategoryData.slug || subcategoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    await setDoc(doc(db, 'subcategories', subcategoryId), {
      ...subcategoryData,
      id: subcategoryId,
      slug,
      active: subcategoryData.active !== false,
      createdAt: new Date().toISOString()
    });
    
    return { success: true, subcategoryId };
  } catch (error) {
    console.error('Error adding subcategory:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a subcategory
 */
export async function updateSubcategory(subcategoryId, updates) {
  try {
    const subcategoryRef = doc(db, 'subcategories', subcategoryId);
    await updateDoc(subcategoryRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a subcategory
 */
export async function deleteSubcategory(subcategoryId) {
  try {
    await deleteDoc(doc(db, 'subcategories', subcategoryId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all subcategories (for admin)
 */
export async function getAllSubcategories() {
  try {
    const subcategoriesRef = collection(db, 'subcategories');
    const q = query(subcategoriesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const subcategories = [];
    snapshot.forEach(doc => {
      subcategories.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, subcategories };
  } catch (error) {
    console.error('Error fetching all subcategories:', error);
    return { success: false, error: error.message, subcategories: [] };
  }
}

// ----- STORE CONFIG -----

/**
 * Update store configuration
 */
export async function updateStoreConfig(updates) {
  try {
    const storeRef = doc(db, 'store', 'config');
    await setDoc(storeRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating store config:', error);
    return { success: false, error: error.message };
  }
}

// ----- NEWS CRUD -----

/**
 * Add a news item
 */
export async function addNews(newsData) {
  try {
    const newsId = newsData.id || `news-${Date.now()}`;
    
    await setDoc(doc(db, 'news', newsId), {
      ...newsData,
      id: newsId,
      active: newsData.active !== false,
      createdAt: new Date().toISOString()
    });
    
    return { success: true, newsId };
  } catch (error) {
    console.error('Error adding news:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a news item
 */
export async function updateNews(newsId, updates) {
  try {
    const newsRef = doc(db, 'news', newsId);
    await updateDoc(newsRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating news:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a news item
 */
export async function deleteNews(newsId) {
  try {
    await deleteDoc(doc(db, 'news', newsId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting news:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all news items (for admin - includes inactive)
 */
export async function getAllNews() {
  try {
    const newsRef = collection(db, 'news');
    const snapshot = await getDocs(newsRef);
    const news = [];
    snapshot.forEach(doc => {
      news.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, news };
  } catch (error) {
    console.error('Error fetching all news:', error);
    return { success: false, error: error.message, news: [] };
  }
}

// ============================================
// CUSTOMER AUTH FUNCTIONS
// ============================================

/**
 * Register a new customer
 */
export async function registerCustomer(email, password, name, phone) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Save customer profile to Firestore
    await setDoc(doc(db, 'customers', uid), {
      uid,
      email,
      name,
      phone: phone || '',
      addresses: [],
      createdAt: new Date().toISOString(),
      orderCount: 0,
      totalSpent: 0
    });
    
    return { success: true, uid, user: userCredential.user };
  } catch (error) {
    console.error('Error registering customer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Login customer
 */
export async function loginCustomer(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Logout customer
 */
export async function logoutCustomer() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get customer profile
 */
export async function getCustomerProfile(uid) {
  try {
    const customerRef = doc(db, 'customers', uid);
    const snapshot = await getDoc(customerRef);
    if (snapshot.exists()) {
      return { success: true, customer: snapshot.data() };
    }
    return { success: false, error: 'Customer not found' };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(uid, updates) {
  try {
    const customerRef = doc(db, 'customers', uid);
    await updateDoc(customerRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get orders for a customer (by email or phone)
 */
export async function getCustomerOrders(email, phone) {
  try {
    const ordersRef = collection(db, 'orders');
    const orders = [];
    
    // Search by email
    if (email) {
      const emailQuery = query(ordersRef, where('customer.email', '==', email), orderBy('createdAt', 'desc'));
      const emailSnapshot = await getDocs(emailQuery);
      emailSnapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
    }
    
    // Also search by phone if provided and no orders found
    if (phone && orders.length === 0) {
      const phoneQuery = query(ordersRef, where('customer.phone', '==', phone), orderBy('createdAt', 'desc'));
      const phoneSnapshot = await getDocs(phoneQuery);
      phoneSnapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
    }
    
    return { success: true, orders };
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return { success: false, error: error.message, orders: [] };
  }
}

/**
 * Reset password
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending reset email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if customer profile exists, create if not
    const customerRef = doc(db, 'customers', user.uid);
    const customerSnap = await getDoc(customerRef);
    
    if (!customerSnap.exists()) {
      // Create new customer profile from Google data
      await setDoc(customerRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        phone: user.phoneNumber || '',
        photoURL: user.photoURL || '',
        addresses: [],
        createdAt: new Date().toISOString(),
        orderCount: 0,
        totalSpent: 0,
        authProvider: 'google'
      });
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { success: false, error: error.message };
  }
}
