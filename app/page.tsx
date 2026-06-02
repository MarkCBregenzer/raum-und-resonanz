import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { RevealOnScroll } from "./components/RevealOnScroll";
import {
  Hero,
  WelcomeSection,
  MethodsSection,
  AboutSection,
  CalmSection,
  ContactSection,
} from "./components/Sections";
import { getContent } from "@/lib/content";

/* Startseite — Raum & Resonanz
   Async Server Component. Der Inhalt kommt aus Neon Postgres
   (siehe lib/content.ts → lib/db.ts). Seit Slice 2 fließt der
   gesamte `home`-Teilbaum in die Sektionen — jede Sektion
   bekommt genau ihren Unterbaum und keine harten Texte mehr.

   Die einzige client-seitige Logik (IntersectionObserver für
   Reveal-on-Scroll) liegt in RevealOnScroll — eine winzige
   "renders null"-Komponente, die nebenher mitläuft. */

export default async function Home() {
  const content = await getContent();
  const home = content.home;

  return (
    <div data-bokeh="on">
      <SiteHeader categories={content.categories} />
      <main>
        <Hero data={home.hero} />
        <WelcomeSection data={home.welcome} />
        <MethodsSection data={home.methods} categories={content.categories} />
        <AboutSection data={home.about} />
        <CalmSection data={home.calm} />
        <ContactSection data={home.contact} />
      </main>
      <SiteFooter />
      <RevealOnScroll />
    </div>
  );
}
