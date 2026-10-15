"use client";
import legacy from "@/lib/legacy-content.json";
import { copy, type Locale } from "@/lib/content";
import PageHeading from "./PageHeading";
import { useSearchParams } from "next/navigation";
import InquiryForm from "../InquiryForm";
export default function ContactPage({ locale }: { locale: Locale }) {
  const data = legacy[locale],
    t = copy[locale];
  const params = useSearchParams();
  const title = data.pages.find((p) => p.path === "contact")!.title;
  return (
    <>
      <PageHeading locale={locale} title={title} />
      <section className="contact-page container">
        <div className="contact-details">
          <h3>{t.nav[5]}</h3>
          <p>
            C. Río Ebro, 15-2A
            <br />
            28947 Fuenlabrada
            <br />
            {t.address}
          </p>
          <a href="mailto:info@alemaxglobal.com">info@alemaxglobal.com</a>
          <a href="tel:+34614466828">+34 614 466 828</a>
        </div>
        <InquiryForm locale={locale} subject={params.get("subject") || ""} />
      </section>
    </>
  );
}
