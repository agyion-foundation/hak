"use client";

/**
 * Agyion landing — section plan per design_brief §4:
 * hero scrub → how it works → template cards → Why Stellar interlude →
 * compliance → CTA/footer. Lifeline + cursor followers are ambient layers.
 */

import Nav from "./components/landing/Nav";
import Hero from "./components/landing/Hero";
import HowItWorks from "./components/landing/HowItWorks";
import TemplateCards from "./components/landing/TemplateCards";
import WhyStellar from "./components/landing/WhyStellar";
import Compliance from "./components/landing/Compliance";
import CtaFooter from "./components/landing/CtaFooter";
import Lifeline from "./components/landing/Lifeline";
import Cursor from "./components/landing/Cursor";

export default function Landing() {
  return (
    <main className="relative">
      <Cursor />
      <Lifeline />
      <Nav />
      <Hero />
      <HowItWorks />
      <TemplateCards />
      <WhyStellar />
      <Compliance />
      <CtaFooter />
    </main>
  );
}
