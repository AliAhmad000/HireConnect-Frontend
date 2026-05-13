const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

export const environment = {
  production: false,
  apiUrl: isHttpsPage ? '/api/v1' : 'http://localhost:8080/api/v1',
  razorpayKeyId: 'rzp_test_SjnuxnuJFULCYU'
};
