import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getPublishedPosts, getSiteChromeContent } from "@/lib/directus";

export default async function PostsPage() {
  const [{ siteSettings, navLinks }, posts] = await Promise.all([
    getSiteChromeContent(),
    getPublishedPosts(),
  ]);

  return (
    <>
      <SiteHeader siteSettings={siteSettings} navLinks={navLinks} anchorBase="/" />

      <main className="page-shell posts-page">
        <section className="posts-hero panel reveal-up" aria-labelledby="posts-page-title">
          <p className="section-kicker">Published insights</p>
          <h1 id="posts-page-title">Directus posts in one place</h1>
          <p className="hero-copy">
            This index shows every published post from the CMS so visitors landing on <code>/posts</code> can browse
            the full set instead of only the homepage teaser.
          </p>
          <div className="hero-actions">
            <Link href="/" className="btn btn-secondary">
              Back to homepage
            </Link>
          </div>
        </section>

        {posts.length === 0 ? (
          <section className="empty-state panel reveal-up" aria-live="polite">
            <h3>No published posts yet</h3>
            <p>
              Add content in Directus and set <code>status</code> to <code>published</code>.
            </p>
          </section>
        ) : (
          <section className="section-block reveal-up" aria-labelledby="posts-list-title">
            <div className="section-head">
              <div>
                <p className="section-kicker">Archive</p>
                <h2 id="posts-list-title" className="section-title">
                  {posts.length} published {posts.length === 1 ? "post" : "posts"}
                </h2>
              </div>
            </div>

            <div className="posts-list" aria-live="polite">
              {posts.map((post) => (
                <article key={post.id} className="post-list-item panel">
                  <div className="post-list-copy">
                    <p className="post-card-meta">Insight #{post.id}</p>
                    <h3>{post.title}</h3>
                    <p>{post.desc}</p>
                  </div>

                  <div className="post-list-actions">
                    <Link href={`/posts/${post.id}`} className="btn btn-secondary">
                      Read article
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter siteSettings={siteSettings} />
    </>
  );
}
