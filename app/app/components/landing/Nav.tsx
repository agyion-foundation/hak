"use client";

/**
 * Nav — brand left, center links anchor to sections, right CTA → /app.
 * Fixed; hairline divider appears after the first scroll.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#templates", label: "Templates" },
  { href: "#stellar", label: "Why Stellar" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 bg-paper/85 backdrop-blur transition-shadow duration-500 ${
        scrolled ? "shadow-[0_1px_0_0_#EEE7E0]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Agyion
        </Link>
        <nav className="hidden gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors duration-300 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/app"
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors duration-300 ease-house hover:bg-accent"
        >
          Open the app
        </Link>
      </div>
    </header>
  );
}
