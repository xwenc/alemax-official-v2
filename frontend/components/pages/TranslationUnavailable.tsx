import PageHeading from "./PageHeading";
export default function TranslationUnavailable({ path }: { path: string }) {
  return (
    <>
      <PageHeading locale="es" title="Traducción en preparación" />
      <section className="container empty-state">
        <p>La versión en español de esta página todavía no está disponible.</p>
        <a className="button" href={`/en/${path}`}>
          Ver la versión en inglés ↗
        </a>
      </section>
    </>
  );
}
