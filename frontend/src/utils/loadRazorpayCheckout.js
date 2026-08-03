// Lazily injects Razorpay's Checkout script once, only when the customer actually
// reaches the payment step — resolves once window.Razorpay is available.
let loadPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in browser'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Razorpay script loaded but window.Razorpay is missing.'));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Razorpay checkout script.'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
