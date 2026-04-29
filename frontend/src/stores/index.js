import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authAPI } from '../services/api'

/* =========================
   AUTH STORE
========================= */
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // stays true until checkAuth completes ONCE

  checkAuth: async () => {
    // Prevent duplicate calls if already checked
    if (!get().isLoading && get().user !== null) return

    try {
      const res = await authAPI.me()
      set({
        user: res.data.data.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false, // ✅ MUST set false even on failure
      })
    }
  },

  login: (user) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  isAdmin: () =>
    ['admin', 'superadmin'].includes(get().user?.role),
}))

/* =========================
   CART STORE
========================= */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (product, size, color, quantity = 1) => {
        const items = get().items
        const key = `${product._id}-${size}-${color}`
        const existing = items.find((i) => i.key === key)

        if (existing) {
          set({
            items: items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + quantity } : i
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                key,
                product: product._id,
                name: product.name,
                slug: product.slug,
                image: product.images?.[0]?.url || '',
                price: product.price,
                size,
                color,
                quantity,
              },
            ],
          })
        }

        set({ isOpen: true })
      },

      removeItem: (key) =>
        set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      updateQty: (key, quantity) => {
        if (quantity < 1) {
          get().removeItem(key)
          return
        }

        set((s) => ({
          items: s.items.map((i) =>
            i.key === key ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/* =========================
   UI STORE
========================= */
export const useUIStore = create((set) => ({
  /* sidebar */
  isSidebarOpen: false,
  toggleSidebar: () =>
    set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  /* mobile menu */
  mobileMenuOpen: false,
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  toggleMobileMenu: () =>
    set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  /* search */
  searchOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () =>
    set((s) => ({ searchOpen: !s.searchOpen })),
}))

/* =========================
   WISHLIST STORE
========================= */
export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      toggle: (productId) => {
        const items = get().items
        set({
          items: items.includes(productId)
            ? items.filter((id) => id !== productId)
            : [...items, productId],
        })
      },

      has: (productId) => get().items.includes(productId),
    }),
    {
      name: 'wishlist-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)