const status = document.getElementById('session-status');
const button = document.getElementById('verify-session');
button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Checking your Shopify session…';
  try {
    const token = await shopify.idToken();
    const response = await fetch('/api/shopify/session', {
      headers: {Authorization: `Bearer ${token}`},
      cache: 'no-store', credentials: 'omit', redirect: 'error',
    });
    if (!response.ok) throw new Error('Session check failed');
    status.textContent = 'Shopify session verified. This development app uses synthetic data only.';
  } catch {
    status.textContent = 'Session could not be verified. Open this development app from its Shopify sandbox store.';
  } finally { button.disabled = false; }
});
