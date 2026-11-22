import React from "react";
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  LayoutGrid,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Settings,
  HelpCircle,
  Bell,
  Lock,
  ShieldCheck,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Pencil,
  Trash2,
  Plus,
  Minus,
  Upload,
  Download,
  Filter,
  ArrowDownWideNarrow,
  Share2,
  Copy,
  Calendar,
  Clock,
  Home,
  Gauge,
  Package,
  PackageOpen,
  Receipt,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  Laptop,
  Keyboard,
  Cpu,
  Armchair,
  Utensils,
  Gift,
  Shirt,
  Languages,
  Flag,
  Store,
  Truck,
  Headphones,
  LogOut,
  Star,
  Zap,
  Flame,
  Tag,
  RotateCcw,
  TrendingUp,
  BarChart3,
  FileText,
  Lightbulb,
  Sparkles,
  ShoppingBag,
  CircleDot,
  Play,
  Pause,
  Rocket,
  LucideIcon,
  LucideProps,
} from "lucide-react";

export type IconName =
  | "search"
  | "cart"
  | "user"
  | "user-circle"
  | "heart"
  | "heart-outline"
  | "bars"
  | "grid"
  | "xmark"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "location"
  | "phone"
  | "email"
  | "settings"
  | "help"
  | "bell"
  | "lock"
  | "shield"
  | "shield-halved"
  | "check"
  | "circle-check"
  | "error"
  | "warning"
  | "info"
  | "edit"
  | "trash"
  | "plus"
  | "minus"
  | "upload"
  | "download"
  | "filter"
  | "sort"
  | "share"
  | "copy"
  | "calendar"
  | "clock"
  | "home"
  | "dashboard"
  | "orders"
  | "box"
  | "box-open"
  | "box-tissue"
  | "receipt"
  | "payments"
  | "credit-card"
  | "money-bill"
  | "bank"
  | "mobile"
  | "laptop"
  | "keyboard"
  | "microchip"
  | "couch"
  | "utensils"
  | "gift"
  | "shirt"
  | "person-dress"
  | "person"
  | "language"
  | "flag"
  | "store"
  | "truck"
  | "motorcycle"
  | "headset"
  | "logout"
  | "star"
  | "star-half"
  | "star-outline"
  | "bolt"
  | "fire"
  | "tag"
  | "rotate-left"
  | "chart-line"
  | "chart-column"
  | "file"
  | "file-pdf"
  | "lightbulb"
  | "map"
  | "list-check"
  | "sparkles"
  | "bag-shopping"
  | "circle-dot"
  | "play"
  | "pause"
  | "rocket";

const LUCIDE_ICON_MAP: Record<IconName, LucideIcon> = {
  search: Search,
  cart: ShoppingCart,
  user: User,
  "user-circle": User,
  heart: Heart,
  "heart-outline": Heart,
  bars: Menu,
  grid: LayoutGrid,
  xmark: X,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  location: MapPin,
  phone: Phone,
  email: Mail,
  settings: Settings,
  help: HelpCircle,
  bell: Bell,
  lock: Lock,
  shield: ShieldCheck,
  "shield-halved": ShieldCheck,
  check: Check,
  "circle-check": CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  edit: Pencil,
  trash: Trash2,
  plus: Plus,
  minus: Minus,
  upload: Upload,
  download: Download,
  filter: Filter,
  sort: ArrowDownWideNarrow,
  share: Share2,
  copy: Copy,
  calendar: Calendar,
  clock: Clock,
  home: Home,
  dashboard: Gauge,
  orders: Package,
  box: Package,
  "box-open": PackageOpen,
  "box-tissue": Package,
  receipt: Receipt,
  payments: CreditCard,
  "credit-card": CreditCard,
  "money-bill": Banknote,
  bank: Building2,
  mobile: Smartphone,
  laptop: Laptop,
  keyboard: Keyboard,
  microchip: Cpu,
  couch: Armchair,
  utensils: Utensils,
  gift: Gift,
  shirt: Shirt,
  "person-dress": User,
  person: User,
  language: Languages,
  flag: Flag,
  store: Store,
  truck: Truck,
  motorcycle: Truck,
  headset: Headphones,
  logout: LogOut,
  star: Star,
  "star-half": Star,
  "star-outline": Star,
  bolt: Zap,
  fire: Flame,
  tag: Tag,
  "rotate-left": RotateCcw,
  "chart-line": TrendingUp,
  "chart-column": BarChart3,
  file: FileText,
  "file-pdf": FileText,
  lightbulb: Lightbulb,
  map: MapPin,
  "list-check": CheckCircle2,
  sparkles: Sparkles,
  "bag-shopping": ShoppingBag,
  "circle-dot": CircleDot,
  play: Play,
  pause: Pause,
  rocket: Rocket,
};

export interface IconProps extends LucideProps {
  name: IconName;
  label?: string;
  className?: string;
  size?: number | string;
}

/**
 * Centralized, production-grade SVG Icon component for Arozao.
 * Powered by Lucide SVG icons with full accessibility attributes.
 */
export function Icon({
  name,
  className = "",
  size = 18,
  label,
  "aria-hidden": ariaHidden,
  ...rest
}: IconProps) {
  const Component = LUCIDE_ICON_MAP[name] || CircleDot;

  if (label) {
    return (
      <Component
        size={size}
        className={className}
        role="img"
        aria-label={label}
        {...rest}
      />
    );
  }

  return (
    <Component
      size={size}
      className={className}
      aria-hidden={ariaHidden ?? true}
      {...rest}
    />
  );
}

export {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  LayoutGrid,
  X,
  Truck,
  Zap,
  Banknote,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Smartphone,
  CreditCard,
  Lock,
  Tag,
  AlertTriangle,
  Lightbulb,
  Calendar,
  MapPin,
  Package,
  Flame,
  Store,
  Rocket,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
};
