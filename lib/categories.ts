import { BadgeIndianRupee, CarFront, CircleEllipsis, Coffee, HeartPulse, House, Laptop, ShoppingBag, Utensils } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export const defaultCategories = ['Food & dining', 'Groceries', 'Shopping', 'Bills', 'Transport', 'Health', 'Transfers', 'Other'];

export const categoryIcons: Record<string, LucideIcon> = {
  food: Utensils,
  shopping: ShoppingBag,
  transport: CarFront,
  home: House,
  health: HeartPulse,
  coffee: Coffee,
  digital: Laptop,
  money: BadgeIndianRupee,
  other: CircleEllipsis,
};

export const categoryIconOptions = [
  { key: 'food', label: 'Food' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'transport', label: 'Transport' },
  { key: 'home', label: 'Home' },
  { key: 'health', label: 'Health' },
  { key: 'coffee', label: 'Coffee' },
  { key: 'digital', label: 'Digital' },
  { key: 'money', label: 'Money' },
  { key: 'other', label: 'Other' },
] as const;

export const getCategoryIcon = (key: string) => categoryIcons[key] ?? categoryIcons.other;
