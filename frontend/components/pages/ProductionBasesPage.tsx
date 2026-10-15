import legacy from "@/lib/legacy-content.json";
import { type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import { pageLabels } from "./content";
export default function ProductionBasesPage({ locale }: { locale: Locale }) {
  const data = legacy[locale],
    labels = pageLabels[locale];
  const origins = data.pages.filter((p) =>
    p.path.startsWith("production-base/"),
  );
  return (
    <>
      <PageHeading locale={locale} title={labels.network} />
      <section className="origin-grid container">
        {origins.map((p, i) => (
          <a href={`/${locale}/${p.path}`} className="origin-card" key={p.path}>
            <img
              src={
                p.images[0] ||
                `/images/${["potassium.jpg", "silica.jpg", "phosphates.jpg", "starch.png", "hydrocolloids.png", "emulsifiers.png"][i]}`
              }
              alt={p.title}
            />
            <div>
              <p className="eyebrow green">0{i + 1}</p>
              <h3>{p.title} ↗</h3>
            </div>
          </a>
        ))}
      </section>
    </>
  );
}
