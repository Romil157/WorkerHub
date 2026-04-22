import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // User (worker or customer)
      user: null,
      token: null,
      refreshToken: null,

      // Admin
      admin: null,
      adminToken: null,

      setUser: (user, token, refreshToken) => set({ user, token, refreshToken }),
      setAdmin: (admin, adminToken) => set({ admin, adminToken }),

      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),

      logout: () => set({ user: null, token: null, refreshToken: null }),
      adminLogout: () => set({ admin: null, adminToken: null }),

      isWorker: () => get().user?.userType === 'worker',
      isCustomer: () => get().user?.userType === 'customer',
      isVerified: () => get().user?.isVerified === true,
    }),
    {
      name: 'workerhub-auth',
      partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken, admin: s.admin, adminToken: s.adminToken }),
    }
  )
);

export default useAuthStore;
