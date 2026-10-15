import legacy from "@/lib/legacy-content.json";
import { copy, type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import { pageLabels } from "./content";
export default function ActivityPage({ locale }: { locale: Locale }) {
  const data = legacy[locale],
    t = copy[locale],
    labels = pageLabels[locale];
  const contact = `/${locale}/contact`;
  const title = data.pages.find((p) => p.path === "activity")!.title;
  return (
    <>
      <PageHeading locale={locale} title={title} />
      <section className="container empty-state">
        <p>{labels.empty}</p>
        <a className="button" href={contact}>
          {t.nav[5]} ↗
        </a>
      </section>
    </>
  );
}
