import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getPublishedPostById, getSiteChromeContent } from "@/lib/directus";

type PostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const [{ siteSettings, navLinks }, post] = await Promise.all([getSiteChromeContent(), getPublishedPostById(id)]);

  if (!post) {
    notFound();
  }

  return (
    <>
      <SiteHeader siteSettings={siteSettings} navLinks={navLinks} anchorBase="/" />

      <main className="page-shell post-shell">
        <div className="post-nav">
          <Link href="/posts" className="back-link">
            ← Back to posts
          </Link>
          <Link href="/" className="back-link">
            Homepage
          </Link>
        </div>

        <article className="post-detail panel reveal-up">
          <p className="section-kicker">Insight #{post.id}</p>
          <h1>{post.title}</h1>
          <p>{post.desc}</p>
        </article>
      </main>

      <SiteFooter siteSettings={siteSettings} />
    </>
  );
}
