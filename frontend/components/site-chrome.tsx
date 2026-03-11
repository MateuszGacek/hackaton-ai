import type { NavLink, SiteSettings } from "@/lib/directus";
import { ThemeModeToggle } from "./theme-mode-toggle";

type SiteHeaderProps = {
  siteSettings: SiteSettings;
  navLinks: NavLink[];
  anchorBase?: string;
};

type SiteFooterProps = {
  siteSettings: SiteSettings;
};

function resolveHref(href: string, anchorBase: string) {
  if (href.startsWith("#")) {
    return `${anchorBase}${href}`;
  }

  return href;
}

export function SiteHeader({ siteSettings, navLinks, anchorBase = "" }: SiteHeaderProps) {
  const primaryCtaHref = resolveHref(siteSettings.primary_cta_href, anchorBase);

  return (
    <header className="site-header">
      <div className="shell header-row">
        <a href={anchorBase ? "/" : "#top"} className="brand-mark">
          {siteSettings.company_name}
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navLinks.map((item) => (
            <a key={item.id} href={resolveHref(item.href, anchorBase)}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeModeToggle className="header-theme-toggle" />
          <a href={primaryCtaHref} className="btn btn-primary header-cta">
            {siteSettings.primary_cta_label}
          </a>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Open mobile menu">Menu</summary>
          <nav aria-label="Mobile navigation">
            {navLinks.map((item) => (
              <a key={`mobile-${item.id}`} href={resolveHref(item.href, anchorBase)}>
                {item.label}
              </a>
            ))}
            <a href={primaryCtaHref}>{siteSettings.primary_cta_label}</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ siteSettings }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <p>{siteSettings.company_name}</p>
        <p>{siteSettings.footer_note}</p>
      </div>
    </footer>
  );
}
