// Regenerates supabase/seed.sql from src/lib/seed.json: node scripts/make-seed-sql.mjs
import { readFileSync, writeFileSync } from "node:fs";
const { categories, products } = JSON.parse(readFileSync("src/lib/seed.json", "utf8"));
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
let sql = "-- Starting catalog for Nafas Endurance. Safe to run once after schema.sql.\n\n";
for (const c of categories.filter((c) => !c.parent))
  sql += `insert into categories (slug,name,description,sort,active) values (${q(c.slug)},${q(c.name)},${q(c.description)},${c.sort},${c.active}) on conflict (slug) do nothing;\n`;
for (const c of categories.filter((c) => c.parent))
  sql += `insert into categories (slug,name,description,parent_id,sort,active) values (${q(c.slug)},${q(c.name)},${q(c.description)},(select id from categories where slug=${q(c.parent)}),${c.sort},${c.active}) on conflict (slug) do nothing;\n`;
sql += "\n";
for (const p of products)
  sql += `insert into products (slug,name,description,price,category_id,active,personalizable,sort,media) values (${q(p.slug)},${q(p.name)},${q(p.description)},${p.price},(select id from categories where slug=${q(p.category)}),${p.active},${p.personalizable},${p.sort},'[]'::jsonb) on conflict (slug) do nothing;\n`;
writeFileSync("supabase/seed.sql", sql);
console.log(`wrote ${categories.length} categories, ${products.length} products`);
