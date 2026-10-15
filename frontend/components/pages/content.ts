import legacy from "@/lib/legacy-content.json";
export type ContentPage = (typeof legacy)["en"]["pages"][number];
export const pageLabels = {
  en: {
    catalog: "Ingredient portfolio",
    network: "Production bases",
    all: "All categories",
    empty: "No articles have been published yet.",
    none: "No products match your search.",
    origin: "Production origin",
    code: "Product code",
    back: "Back to products",
    search: "Search ingredients",
    spec: "Contact our team for technical specifications, documentation and availability.",
  },
  es: {
    catalog: "Catálogo de ingredientes",
    network: "Bases de producción",
    all: "Todas las categorías",
    empty: "Todavía no se han publicado artículos.",
    none: "No hay productos para esta búsqueda.",
    origin: "Origen de producción",
    code: "Código del producto",
    back: "Volver a productos",
    search: "Buscar ingredientes",
    spec: "Contacte con nuestro equipo para obtener especificaciones, documentación y disponibilidad.",
  },
};
