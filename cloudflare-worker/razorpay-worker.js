/**
 * Razorpay Payment Worker for Tie Style
 * Deploy to Cloudflare Workers
 * 
 * Environment Variables Required:
 * - RAZORPAY_KEY_ID: rzp_test_S5qa8WW8j8ezxU
 * - RAZORPAY_KEY_SECRET: 2Hq5gj4qXeweC48gbhh1qWhb
 */

const RAZORPAY_KEY_ID = 'rzp_test_S5qa8WW8j8ezxU';
const RAZORPAY_KEY_SECRET = '2Hq5gj4qXeweC48gbhh1qWhb';

// CORS headers for GitHub Pages
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // Create Order endpoint
      if (url.pathname === '/create-order' && request.method === 'POST') {
        return await createOrder(request, env);
      }

      // Verify Payment endpoint
      if (url.pathname === '/verify-payment' && request.method === 'POST') {
        return await verifyPayment(request, env);
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', service: 'razorpay-worker' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Create Razorpay Order
 */
async function createOrder(request, env) {
  const body = await request.json();
  const { amount, currency = 'INR', receipt, notes } = body;

  if (!amount) {
    return new Response(JSON.stringify({ error: 'Amount is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Use env variables if available, otherwise use hardcoded (for testing)
  const keyId = env?.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID;
  const keySecret = env?.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET;

  const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {}
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Razorpay Error:', data);
    return new Response(JSON.stringify({ error: data.error?.description || 'Failed to create order' }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    order_id: data.id,
    amount: data.amount,
    currency: data.currency,
    key_id: keyId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Verify Razorpay Payment Signature
 */
async function verifyPayment(request, env) {
  const body = await request.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return new Response(JSON.stringify({ error: 'Missing payment details' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const keySecret = env?.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET;

  // Create signature to verify
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  
  // Use Web Crypto API for HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const isValid = expectedSignature === razorpay_signature;

  if (isValid) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid payment signature'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
