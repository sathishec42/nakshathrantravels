import apiClient from './client';

export async function listActiveVehicles(params = {}) {
  const response = await apiClient.get('/vehicles', { params });
  return { vehicles: response.data.data, conflicts: response.data.conflicts || [] };
}

export async function createBooking(details) {
  const response = await apiClient.post('/bookings', details);
  return response.data;
}

export async function listMyBookings() {
  const response = await apiClient.get('/bookings/mine');
  return response.data.data;
}

export async function createPaymentOrder(bookingId) {
  const response = await apiClient.post('/payments/create-order', { bookingId });
  return response.data.data;
}

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-razorpay-checkout]');
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        reject(new Error('Razorpay Checkout failed to initialize.'));
        return;
      }
      if (existingScript.dataset.failed === 'true') {
        reject(new Error('Razorpay Checkout could not be loaded.'));
        return;
      }
      existingScript.addEventListener('load', () => {
        existingScript.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existingScript.addEventListener('error', () => {
        existingScript.dataset.failed = 'true';
        reject(new Error('Razorpay Checkout could not be loaded.'));
      }, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.dataset.failed = 'true';
      reject(new Error('Razorpay Checkout could not be loaded.'));
    };
    document.body.appendChild(script);
  });
}
