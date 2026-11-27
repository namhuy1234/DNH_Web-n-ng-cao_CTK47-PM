import { BookOpen, ChefHat, FilePlus2, Home, KeyRound, LayoutDashboard, LayoutGrid, Search, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SITE = {
  name: "Culinary Blog",
  tagline: "Chia sẻ và khám phá công thức nấu ăn",
  email: "lienhe@culinaryblog.local",
} as const;

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/** Menu chính ở header. */
export const MAIN_NAV: NavItem[] = [
  { title: "Trang chủ", href: "/", icon: Home },
  { title: "Công thức", href: "/recipes", icon: BookOpen },
  { title: "Danh mục", href: "/categories", icon: LayoutGrid },
  { title: "Tìm kiếm", href: "/recipes/search", icon: Search },
];

/** Menu bên trái của trang quản lý. */
export const DASHBOARD_NAV: NavItem[] = [
  { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { title: "Công thức của tôi", href: "/dashboard/recipes", icon: ChefHat },
  { title: "Viết công thức", href: "/dashboard/recipes/new", icon: FilePlus2 },
  { title: "Hồ sơ", href: "/dashboard/profile", icon: UserRound },
  { title: "Đổi mật khẩu", href: "/dashboard/password", icon: KeyRound },
];

export const RECIPES_PAGE_SIZE = 12;
