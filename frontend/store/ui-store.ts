import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ViewMode = "grid" | "list";

interface UIState {
  /** Menu trượt trên điện thoại. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  /** Cách hiển thị danh sách công thức, được nhớ trong localStorage. */
  recipesViewMode: ViewMode;
  setRecipesViewMode: (mode: ViewMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

      recipesViewMode: "grid",
      setRecipesViewMode: (mode) => set({ recipesViewMode: mode }),
    }),
    {
      name: "culinary-blog-ui",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Server không có localStorage: đọc lại sau khi hydrate (StoreHydration) để tránh lệch HTML.
      skipHydration: true,
      // Chỉ lưu lựa chọn hiển thị, không lưu trạng thái menu.
      partialize: (state) => ({ recipesViewMode: state.recipesViewMode }),
    },
  ),
);

export const useViewMode = () => useUIStore((s) => s.recipesViewMode);
