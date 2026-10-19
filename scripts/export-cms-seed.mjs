import { readFileSync, writeFileSync } from "node:fs";
import { copy } from "../frontend/lib/content.ts";
const legacy = JSON.parse(
  readFileSync(new URL("../frontend/lib/legacy-content.json", import.meta.url)),
);
const records = [];
const fields = (title, blocks = [], summary = "") => ({
  title,
  blocks: blocks.map((b) => ({
    tag: ["p", "h2", "h3", "li"].includes(b.tag) ? b.tag : "p",
    text: b.text,
  })),
  summary,
  seo_title: title,
  seo_description: summary,
  image_alt: "",
});
for (const [index, item] of legacy.en.categories.entries()) {
  const es = legacy.es.categories.find((x) => x.slug === item.slug);
  records.push({
    id: item._id,
    kind: "category",
    slug: item.slug,
    shared: { sort_order: index },
    languages: {
      en: fields(item.name),
      ...(es ? { es: fields(es.name) } : {}),
    },
  });
}
for (const [index, item] of legacy.en.products.entries()) {
  const es = legacy.es.products.find((x) => x.slug === item.slug);
  records.push({
    id: item._id,
    kind: "product",
    slug: item.slug,
    shared: {
      code: item.code || "",
      category_slug: item.category?.slug || "",
      origin_slug: item.origin?.slug || "",
      images: [],
      sort_order: index,
    },
    languages: {
      en: fields(item.name),
      ...(es ? { es: fields(es.name) } : {}),
    },
  });
}
for (const [index, item] of legacy.en.pages.entries()) {
  const es = legacy.es.pages.find((x) => x.path === item.path);
  const kind = item.path.startsWith("production-base/")
    ? "production-base"
    : "page";
  const slug = item.path.split("/").at(-1);
  records.push({
    id: crypto.randomUUID(),
    kind,
    slug,
    shared: { images: item.images, sort_order: index },
    languages: {
      en: fields(item.title, item.blocks),
      ...(es ? { es: fields(es.title, es.blocks) } : {}),
    },
  });
}
const about = {};
for (const locale of ["en", "es"]) {
  const t = copy[locale];
  about[locale] = fields(t.nav[3], [
    { tag: "h2", text: t.aboutTitle },
    { tag: "p", text: t.aboutText },
    { tag: "h2", text: t.basesLabel },
    { tag: "p", text: t.basesText },
    { tag: "h2", text: t.productsLabel },
    { tag: "p", text: t.brandText },
  ]);
}
records.push({
  id: crypto.randomUUID(),
  kind: "page",
  slug: "about",
  shared: { images: ["/images/production.jpg"], sort_order: 0 },
  languages: about,
});
writeFileSync(
  new URL("../backend/app/seed-content.json", import.meta.url),
  JSON.stringify(records, null, 2) + "\n",
);
console.log(
  `Exported ${records.length} bilingual CMS records. Existing databases are never overwritten.`,
);
