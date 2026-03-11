import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SwiftLayerHero } from "@/components/swiftlayer-hero";
import { getHomePageContent } from "@/lib/directus";

export default async function Home() {
  const {
    siteSettings,
    navLinks,
    hero,
    stats,
    services,
    processSteps,
    testimonials,
    finalCta,
    posts,
  } = await getHomePageContent();

  const latestPosts = posts.slice(0, 3);

  return (
    <>
      <SiteHeader siteSettings={siteSettings} navLinks={navLinks} />

      <main id="top" className="page-shell">
        <SwiftLayerHero
          hero={hero}
          companyName={siteSettings.company_name}
          companyTagline={siteSettings.company_tagline}
          postsCount={posts.length}
        />

        <section className="stats-grid reveal-up" aria-label="Performance and delivery metrics">
          {stats.map((item) => (
            <article key={item.id} className="metric-card panel">
              <p className="metric-value">{item.value}</p>
              <h2>{item.label}</h2>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>

        <section id="services" className="section-block reveal-up" aria-labelledby="services-title">
          <p className="section-kicker">Capabilities</p>
          <h2 id="services-title" className="section-title">
            Full-section architecture powered by content operations
          </h2>
          <p className="section-lead">
            Instead of a single hero and post list, every part of this page is CMS-driven and reusable: navigation,
            value sections, process, social proof, and final conversion block.
          </p>

          <div className="cards-grid service-grid">
            {services.map((item) => (
              <article key={item.id} className="service-card panel">
                <p className="section-kicker">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <a href={item.cta_href} className="text-link">
                  {item.cta_label}
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="section-block reveal-up" aria-labelledby="process-title">
          <p className="section-kicker">Delivery flow</p>
          <h2 id="process-title" className="section-title">
            Clear process from strategy to iterative publishing
          </h2>
          <div className="process-grid">
            {processSteps.map((step) => (
              <article key={step.id} className="process-card panel">
                <p className="process-phase">{step.phase}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="insights" className="section-block reveal-up" aria-labelledby="insights-title">
          <div className="section-head">
            <div>
              <p className="section-kicker">CMS posts</p>
              <h2 id="insights-title" className="section-title">
                Latest insights from Directus
              </h2>
            </div>
            <Link href="/posts" className="post-link">
              View all posts
            </Link>
          </div>

          {latestPosts.length === 0 ? (
            <section className="empty-state panel" aria-live="polite">
              <h3>No published posts yet</h3>
              <p>
                Add content in Directus and set <code>status</code> to <code>published</code>.
              </p>
            </section>
          ) : (
            <div className="cards-grid insights-grid" aria-live="polite">
              {latestPosts.map((post) => (
                <article key={post.id} className="post-card panel">
                  <p className="post-card-meta">Insight #{post.id}</p>
                  <h3>{post.title}</h3>
                  <p>{post.desc}</p>
                  <Link href={`/posts/${post.id}`} className="btn btn-secondary">
                    Read article
                  </Link>
                </article>
              ))}
            </div>
          )}

          {latestPosts.length > 0 ? (
            <div className="section-footer-link">
              <Link href="/posts" className="text-link">
                Browse the complete post archive
              </Link>
            </div>
          ) : null}
        </section>

        <section id="testimonials" className="section-block reveal-up" aria-labelledby="testimonials-title">
          <p className="section-kicker">Client feedback</p>
          <h2 id="testimonials-title" className="section-title">
            Teams use this model to ship faster and safer
          </h2>
          <div className="cards-grid testimonial-grid">
            {testimonials.map((item) => (
              <article key={item.id} className="testimonial-card panel">
                <p className="testimonial-quote">“{item.quote}”</p>
                <p className="testimonial-author">{item.author_name}</p>
                <p className="testimonial-role">{item.author_role}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="final-cta panel reveal-up" aria-labelledby="contact-title">
          <p className="section-kicker">Ready to launch</p>
          <h2 id="contact-title">{finalCta.title}</h2>
          <p>{finalCta.body}</p>
          <div className="hero-actions">
            <a href={finalCta.primary_cta_href} className="btn btn-primary">
              {finalCta.primary_cta_label}
            </a>
            <a href={finalCta.secondary_cta_href} className="btn btn-secondary">
              {finalCta.secondary_cta_label}
            </a>
          </div>
          <p className="contact-line">Contact: {siteSettings.contact_email}</p>
        </section>
      </main>

      <SiteFooter siteSettings={siteSettings} />
    </>
  );
}
