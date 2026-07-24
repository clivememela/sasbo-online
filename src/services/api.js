const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Validate the base URL is an http/https origin — prevents SSRF from a misconfigured env var
const API_BASE_URL = (() => {
  if (!RAW_BASE) return '';
  try {
    const { protocol, origin } = new URL(RAW_BASE);
    if (protocol !== 'http:' && protocol !== 'https:') return '';
    return origin;
  } catch {
    return '';
  }
})();

export function apiUrl(path) {
  // Ensure path starts with / and contains no protocol — prevents open redirect / SSRF
  const safePath = '/' + path.replace(/^\/+/, '').replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
  if (!API_BASE_URL) return safePath;
  return `${API_BASE_URL}${safePath}`;
}
