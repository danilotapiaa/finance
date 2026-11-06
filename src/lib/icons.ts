const LEGACY_ICONS: Record<string, string> = {
  Utensils: 'restaurant',
  UtensilsCrossed: 'restaurant',
  Car: 'directions_car',
  Bus: 'directions_bus',
  Train: 'train',
  Bike: 'pedal_bike',
  Zap: 'bolt',
  Home: 'home',
  Building2: 'apartment',
  Landmark: 'account_balance',
  HeartPulse: 'monitor_heart',
  Stethoscope: 'stethoscope',
  GraduationCap: 'school',
  BookOpen: 'menu_book',
  Film: 'movie',
  ShoppingBag: 'shopping_bag',
  Shirt: 'checkroom',
  Briefcase: 'work',
  TrendingUp: 'trending_up',
  LineChart: 'show_chart',
  PlusCircle: 'add_circle',
  Wallet: 'account_balance_wallet',
  Banknote: 'payments',
  PiggyBank: 'savings',
  CreditCard: 'credit_card',
  Receipt: 'receipt_long',
  Coffee: 'local_cafe',
  Plane: 'flight',
  Gift: 'redeem',
  Smartphone: 'smartphone',
  Wifi: 'wifi',
  Fuel: 'local_gas_station',
  PawPrint: 'pets',
  Baby: 'child_care',
  Music: 'music_note',
  Gamepad2: 'sports_esports',
  Dumbbell: 'fitness_center',
  Sparkles: 'auto_awesome',
};

/**
 * Traduce los nombres de íconos heredados (estilo Lucide) a Material Symbols,
 * que es la fuente que usa la interfaz. Los nombres ya válidos se conservan.
 */
export const toMaterialIcon = (
  icon: string | null | undefined,
  fallback = 'category'
): string => {
  if (!icon) return fallback;

  const normalized = icon.trim();
  const mapped = LEGACY_ICONS[normalized];

  if (mapped) return mapped;
  if (/^[a-z0-9_]+$/.test(normalized)) return normalized;

  return fallback;
};
