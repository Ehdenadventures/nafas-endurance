export type Media = { type: "image" | "video"; url: string };

/** A flavour of a product. stock null = no limit. */
export type Variant = { name: string; hex: string; stock: number | null; /** photo shown when this colour is picked */ image?: string };

/** A way the product is sold, e.g. "1 gel" or "Box of 24", with its own price.
 *  units = how many single pieces it takes from stock. */
export type Package = {
  name: string; price: number; units: number;
  /** Photo to show when this packaging is picked, per flavour name ("" = any flavour). */
  images?: Record<string, string>;
  /** How many of this packaging are ready to sell, per flavour name ("" = no flavours).
   *  Missing or null = no limit. Used instead of the flavour stock when the product has packaging. */
  stock?: Record<string, number | null>;
};

/** One tab of product information, e.g. Ingredients or Warnings. */
export type Detail = { title: string; body: string };

/** Badges shown on the product page. */
export const FEATURES = [
  { key: "gluten_free", label: "Gluten free" },
  { key: "vegan", label: "Vegan" },
  { key: "lactose_free", label: "Lactose free" },
  { key: "low_sugar", label: "Low sugar" },
] as const;
export type FeatureKey = (typeof FEATURES)[number]["key"];

/** Tabs a new product starts with (empty ones are hidden on the shop). */
export const DEFAULT_DETAILS = ["Description", "Ingredients", "Nutritional values", "What science says", "Claims", "Warnings"];

/** Picture behind the home banner. opacity 0-100. all = also behind the first (main) slide. */
export type BannerSettings = { image: string; opacity: number; all: boolean };

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parent_id: string | null;
  sort: number;
  active: boolean;
  /** Shown in the moving brand strip on the home page. */
  is_brand?: boolean;
  /** Brand logo picture shown in the brand strip. */
  logo?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category_id: string | null;
  active: boolean;
  personalizable: boolean;
  sort: number;
  /** How many are ready to sell. null = no limit (made to order). */
  stock: number | null;
  /** Colours, each with its own stock. Empty = the product has no colour choice. */
  variants: Variant[];
  /** Ways it is sold with their own price. Empty = sold one by one at `price`. */
  packages: Package[];
  /** Information tabs. */
  details: Detail[];
  features: FeatureKey[];
  media: Media[];
};

export type OrderItem = {
  product_id: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  personalization: string;
  colour?: string;
  /** Packaging picked, e.g. "Box of 24". */
  package?: string;
  /** Single pieces per item, used for stock. Missing = 1. */
  units?: number;
};

/** An Instagram post that customers can shop from the website. */
export type Post = {
  id: string;
  number: number;
  title: string;
  caption: string;
  image: string;
  product_ids: string[];
  active: boolean;
  created_at: string;
};

export const ORDER_STATUSES = ["new", "confirmed", "packing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
  id: string;
  number: number;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  payment_method: string;
  status: OrderStatus;
  delivery_status: string;
  delivery_ref: string | null;
  delivery_error: string | null;
  created_at: string;
};
