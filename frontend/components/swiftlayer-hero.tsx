"use client";

import Link from "next/link";
import type { HomeHero } from "@/lib/directus";
import { CodePulseShowcase } from "./code-pulse-showcase";

type SwiftLayerHeroProps = {
  hero: HomeHero;
  companyName: string;
  companyTagline: string;
  postsCount: number;
};

export function SwiftLayerHero({ hero, companyName, companyTagline, postsCount }: SwiftLayerHeroProps) {
  return (
    <section className="hero-grid" aria-label="Homepage hero">
      <div className="hero-content panel reveal-up">
        <p className="section-kicker">{hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p className="hero-body">{hero.body}</p>
        <p className="hero-tagline">{companyTagline}</p>

        <div className="hero-actions">
          <a href={hero.primary_cta_href} className="btn btn-primary">
            {hero.primary_cta_label}
          </a>
          <a href={hero.secondary_cta_href} className="btn btn-secondary">
            {hero.secondary_cta_label}
          </a>
          <Link href="/posts" className="btn btn-secondary">
            Browse posts
          </Link>
        </div>

        <div className="hero-utility-grid">
          <div className="hero-signature">
            <span className="status-dot" aria-hidden="true" />
            <span>
              {companyName} delivery model: design, content, and engineering in
              one workflow.
            </span>
          </div>

          <Link href="/posts" className="hero-posts-entry">
            <span className="hero-posts-label">Published insights</span>
            <strong>{postsCount}</strong>
            <span>Open the full posts index</span>
          </Link>
        </div>
      </div>

      <div className="hero-visual panel reveal-up" aria-hidden="true">
        <div className="hero-visual-badge">{hero.visual_badge}</div>
        <CodePulseShowcase />
      </div>
    </section>
  );
}
