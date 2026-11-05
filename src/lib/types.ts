export type Media = { type: "image" | "video"; url: string };

/** A flavour of a product. stock null = no limit. */
export type Variant = { name: string; hex: string; stock: number | null; /** photo shown when this colour is picked */ image?: string };

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parent_id: string | null;
  sort: number;
  active: boolean;
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
