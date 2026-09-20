"use client";

/**
 * Nav — landing header. Text links only (§3.3); duplicate-text hover from ui.
 */

import { ArrowLink } from "../ui";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 backdrop-blur-sm"
        style={{ background: "rgba(250,246,243,0.7)" }}
      >
        <a href="/" className="font-serif text-[24px] text-ink">
          Agyion
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#templates" className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
            Templates
          </a>
          <a href="#compliance" className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
            Trust
          </a>
          <a href="#why-stellar" className="text-[14px] font-medium text-muted transition-colors hover:text-ink">
            Why Stellar
          </a>
          <ArrowLink href="/app">Open app</ArrowLink>
        </nav>
        <div className="md:hidden">
          <ArrowLink href="/app">App</ArrowLink>
        </div>
      </div>
    </header>
  );
}
