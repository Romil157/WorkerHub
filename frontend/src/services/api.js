import axios from 'axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,  // 30s — enough for file uploads
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const store = useAuthStore.getState();
  // Use admin token ONLY for admin routes, otherwise use standard user token
  const isAdminRoute = config.url?.includes('/admin/');
  const token = isAdminRoute ? store.adminToken : store.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle errors
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const store = useAuthStore.getState();
    const status = err.response?.status;

    // Only attempt token refresh for authenticated routes (not /login, /register, /admin/login)
    const isAuthRoute = original?.url?.includes('/login') ||
      original?.url?.includes('/register') ||
      original?.url?.includes('/send-otp');

    if (status === 401 && !original._retry && !isAuthRoute && store.refreshToken) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh-token', {
          refreshToken: store.refreshToken,
        });
        store.setUser(store.user, data.data.accessToken, store.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        store.logout();
        toast.error('Session expired. Please log in again.');
        window.location.href = '/';
      }
    }

    // Show error toast for all errors EXCEPT when it's a login/register route
    const message = err.response?.data?.message
      || (err.code === 'ECONNABORTED' ? 'Request timed out. Server may be slow — please try again.' : null)
      || (err.response ? `Error ${status}: Something went wrong` : 'Cannot connect to server. Is the backend running?');
    if (!isAuthRoute && status !== 404) {
      toast.error(message);
    }

    return Promise.reject(err);
  }
);

export default api;
