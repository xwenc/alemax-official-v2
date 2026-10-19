import type { CmsFields, CmsShared } from "@/lib/cms-types";
import RichText from "@/components/content/RichText";
import { blocksToDocument } from "@/lib/rich-text";
export default function ContentPreview({
  fields,
  shared,
}: {
  fields: CmsFields;
  shared: CmsShared;
}) {
  return (
    <article className="admin-preview">
      {shared.images?.[0] && (
        <img src={shared.images[0]} alt={fields.image_alt} />
      )}
      <h2>{fields.title}</h2>
      {fields.summary && <p>{fields.summary}</p>}
      <RichText document={fields.body || blocksToDocument(fields.blocks)} />
    </article>
  );
}
