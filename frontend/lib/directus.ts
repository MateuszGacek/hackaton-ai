export type Post = {
  id: string | number;
  title: string;
  desc: string;
  status: string;
};

export type SiteSettings = {
  id: string | number;
  company_name: string;
  company_tagline: string;
  primary_cta_label: string;
  primary_cta_href: string;
  contact_email: string;
  footer_note: string;
  status: string;
};

export type NavLink = {
  id: string | number;
  label: string;
  href: string;
  sort: number;
  status: string;
};

export type HomeHero = {
  id: string | number;
  eyebrow: string;
  title: string;
  body: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  visual_badge: string;
  status: string;
};

export type HomeStat = {
  id: string | number;
  value: string;
  label: string;
  detail: string;
  sort: number;
  status: string;
};

export type HomeService = {
  id: string | number;
  eyebrow: string;
  title: string;
  description: string;
  cta_label: string;
  cta_href: string;
  sort: number;
  status: string;
};

export type HomeProcessStep = {
  id: string | number;
  phase: string;
  title: string;
  body: string;
  sort: number;
  status: string;
};

export type HomeTestimonial = {
  id: string | number;
  author_name: string;
  author_role: string;
  quote: string;
  sort: number;
  status: string;
};

export type HomeFinalCta = {
  id: string | number;
  title: string;
  body: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  status: string;
};

export type CmsPage = {
  id: string | number;
  slug: string;
  title: string;
  meta_description: string | null;
  hero_eyebrow: string | null;
  hero_headline: string | null;
  hero_subhead: string | null;
  sections: unknown;
  status: string;
};

export type HomePageContent = {
  siteSettings: SiteSettings;
  navLinks: NavLink[];
  hero: HomeHero;
  stats: HomeStat[];
  services: HomeService[];
  processSteps: HomeProcessStep[];
  testimonials: HomeTestimonial[];
  finalCta: HomeFinalCta;
  posts: Post[];
};

export type SiteChromeContent = {
  siteSettings: SiteSettings;
  navLinks: NavLink[];
};

type DirectusItemsResponse<T> = {
  data: T[];
};

const directusUrl = (process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055").replace(/\/$/, "");
const staticToken = process.env.DIRECTUS_STATIC_TOKEN?.trim();

const fallbackSiteSettings: SiteSettings = {
  id: "fallback-site",
  company_name: "SwiftLayer",
  company_tagline:
    "Three.js-led digital product delivery with measurable performance, accessibility, and SEO outcomes.",
  primary_cta_label: "Book Discovery Call",
  primary_cta_href: "#contact",
  contact_email: "hello@swiftlayer.studio",
  footer_note: "Built for teams that need premium motion and reliable shipping velocity.",
  status: "published",
};

const fallbackNavLinks: NavLink[] = [
  { id: "nav-1", label: "Services", href: "#services", sort: 10, status: "published" },
  { id: "nav-2", label: "Process", href: "#process", sort: 20, status: "published" },
  { id: "nav-3", label: "Insights", href: "#insights", sort: 30, status: "published" },
  { id: "nav-4", label: "Posts", href: "/posts", sort: 40, status: "published" },
  { id: "nav-5", label: "Testimonials", href: "#testimonials", sort: 50, status: "published" },
  { id: "nav-6", label: "Contact", href: "#contact", sort: 60, status: "published" },
];

const fallbackHero: HomeHero = {
  id: "hero-fallback",
  eyebrow: "CMS + Three.js + Performance",
  title: "Ship a premium digital experience without sacrificing release confidence.",
  body: "SwiftLayer combines cinematic interaction design, strict performance budgets, and CMS-governed content operations so teams can scale pages quickly.",
  primary_cta_label: "Start a Project",
  primary_cta_href: "#contact",
  secondary_cta_label: "Explore Services",
  secondary_cta_href: "#services",
  visual_badge: "Realtime WebGL stage",
  status: "published",
};

const fallbackStats: HomeStat[] = [
  {
    id: "stat-1",
    value: "95+",
    label: "Lighthouse baseline",
    detail: "Performance-first template and budget guardrails.",
    sort: 10,
    status: "published",
  },
  {
    id: "stat-2",
    value: "< 1.8s",
    label: "Median LCP target",
    detail: "Critical rendering paths tuned per route.",
    sort: 20,
    status: "published",
  },
  {
    id: "stat-3",
    value: "24h",
    label: "CMS publish cycle",
    detail: "Editors can launch new sections without frontend changes.",
    sort: 30,
    status: "published",
  },
  {
    id: "stat-4",
    value: "100%",
    label: "Accessible defaults",
    detail: "Semantic structure, keyboard flows, and contrast checks included.",
    sort: 40,
    status: "published",
  },
];

const fallbackServices: HomeService[] = [
  {
    id: "service-1",
    eyebrow: "Platform",
    title: "CMS Architecture",
    description: "Model sections, components, and page rules in Directus so editorial teams can scale content safely.",
    cta_label: "See architecture",
    cta_href: "#process",
    sort: 10,
    status: "published",
  },
  {
    id: "service-2",
    eyebrow: "Experience",
    title: "Three.js Product Surfaces",
    description: "Create immersive hero moments with graceful fallbacks and strict control over runtime cost.",
    cta_label: "View showcase",
    cta_href: "#insights",
    sort: 20,
    status: "published",
  },
  {
    id: "service-3",
    eyebrow: "Growth",
    title: "Technical SEO and Analytics",
    description: "Turn indexing, schema, and tracking into stable engineering contracts with release checkpoints.",
    cta_label: "Open playbook",
    cta_href: "#insights",
    sort: 30,
    status: "published",
  },
  {
    id: "service-4",
    eyebrow: "Delivery",
    title: "Release Governance",
    description: "Define quality gates, review loops, and measurable acceptance criteria before implementation starts.",
    cta_label: "Book workshop",
    cta_href: "#contact",
    sort: 40,
    status: "published",
  },
];

const fallbackProcessSteps: HomeProcessStep[] = [
  {
    id: "step-1",
    phase: "01 Discovery",
    title: "Define outcome + constraints",
    body: "We align business goals, technical risks, and CMS requirements into one scoped delivery map.",
    sort: 10,
    status: "published",
  },
  {
    id: "step-2",
    phase: "02 Architecture",
    title: "Model content and section system",
    body: "Collections, fields, and publishing rules are built first so design and development run in parallel.",
    sort: 20,
    status: "published",
  },
  {
    id: "step-3",
    phase: "03 Build",
    title: "Implement interaction + performance budgets",
    body: "We deliver reusable sections with animation, Three.js, and measured budgets for each route.",
    sort: 30,
    status: "published",
  },
  {
    id: "step-4",
    phase: "04 Scale",
    title: "Run governance and iterate",
    body: "Editorial teams can publish independently while engineering keeps quality checks enforced.",
    sort: 40,
    status: "published",
  },
];

const fallbackTestimonials: HomeTestimonial[] = [
  {
    id: "testimonial-1",
    author_name: "Marta K.",
    author_role: "Head of Marketing, SaaS Platform",
    quote: "SwiftLayer transformed our launch page into an editorial system that our team can update weekly without touching code.",
    sort: 10,
    status: "published",
  },
  {
    id: "testimonial-2",
    author_name: "Daniel R.",
    author_role: "CTO, Fintech Startup",
    quote: "The team introduced high-impact motion while keeping performance under control. We shipped on time with no regressions.",
    sort: 20,
    status: "published",
  },
];

const fallbackFinalCta: HomeFinalCta = {
  id: "cta-fallback",
  title: "Need a CMS-driven website that still feels custom and premium?",
  body: "Share your goals, timeline, and constraints. We will propose the smallest scope that protects speed, accessibility, and visual impact.",
  primary_cta_label: "Book Intro Call",
  primary_cta_href: "mailto:hello@swiftlayer.studio",
  secondary_cta_label: "Review Latest Insights",
  secondary_cta_href: "#insights",
  status: "published",
};

function createHeaders() {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (staticToken) {
    headers.set("Authorization", `Bearer ${staticToken}`);
  }

  return headers;
}

function truncate(text: string, maxLength = 500) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

async function directusFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${directusUrl}${path}`, {
    cache: "no-store",
    headers: createHeaders(),
  });

  const responseText = await response.text();
  let parsedBody: unknown = null;

  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      `Directus API error (${response.status}) for ${path}. Body: ${truncate(responseText || "<empty>")}`,
    );
  }

  return parsedBody as T;
}

async function getPublishedItems<T>(collection: string, fields: string, sort = "sort,id"): Promise<T[]> {
  const query = new URLSearchParams();
  query.set("filter[status][_eq]", "published");
  query.set("fields", fields);
  query.set("sort", sort);

  const response = await directusFetch<DirectusItemsResponse<T>>(`/items/${collection}?${query.toString()}`);
  return Array.isArray(response.data) ? response.data : [];
}

async function getSinglePublishedItem<T>(collection: string, fields: string): Promise<T | null> {
  const query = new URLSearchParams();
  query.set("filter[status][_eq]", "published");
  query.set("fields", fields);
  query.set("sort", "-id");
  query.set("limit", "1");

  const response = await directusFetch<DirectusItemsResponse<T>>(`/items/${collection}?${query.toString()}`);
  const [item] = Array.isArray(response.data) ? response.data : [];
  return item ?? null;
}

async function safe<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

export async function getPublishedPosts(): Promise<Post[]> {
  return safe(
    () => getPublishedItems<Post>("posts", "id,title,desc,status", "-id"),
    [],
  );
}

export async function getPublishedPostById(id: string): Promise<Post | null> {
  const query = new URLSearchParams();
  query.set("filter[id][_eq]", id);
  query.set("filter[status][_eq]", "published");
  query.set("fields", "id,title,desc,status");
  query.set("limit", "1");

  const response = await directusFetch<DirectusItemsResponse<Post>>(`/items/posts?${query.toString()}`);
  const [post] = Array.isArray(response.data) ? response.data : [];
  return post ?? null;
}

export async function getSiteChromeContent(): Promise<SiteChromeContent> {
  const [siteSettings, navLinks] = await Promise.all([
    safe(
      () =>
        getSinglePublishedItem<SiteSettings>(
          "site_settings",
          "id,company_name,company_tagline,primary_cta_label,primary_cta_href,contact_email,footer_note,status",
        ),
      null,
    ),
    safe(() => getPublishedItems<NavLink>("nav_links", "id,label,href,sort,status"), []),
  ]);

  return {
    siteSettings: siteSettings ?? fallbackSiteSettings,
    navLinks: navLinks.length > 0 ? navLinks : fallbackNavLinks,
  };
}

export async function getPublishedPageBySlug(slug: string): Promise<CmsPage | null> {
  return safe(async () => {
    const query = new URLSearchParams();
    query.set("filter[slug][_eq]", slug);
    query.set("filter[status][_eq]", "published");
    query.set(
      "fields",
      "id,slug,title,meta_description,hero_eyebrow,hero_headline,hero_subhead,sections,status",
    );
    query.set("limit", "1");

    const response = await directusFetch<DirectusItemsResponse<CmsPage>>(`/items/pages?${query.toString()}`);
    const [page] = Array.isArray(response.data) ? response.data : [];
    return page ?? null;
  }, null);
}

export async function getHomePageContent(): Promise<HomePageContent> {
  const [chrome, hero, stats, services, processSteps, testimonials, finalCta, posts] = await Promise.all([
    getSiteChromeContent(),
    safe(
      () =>
        getSinglePublishedItem<HomeHero>(
          "home_hero",
          "id,eyebrow,title,body,primary_cta_label,primary_cta_href,secondary_cta_label,secondary_cta_href,visual_badge,status",
        ),
      null,
    ),
    safe(() => getPublishedItems<HomeStat>("home_stats", "id,value,label,detail,sort,status"), []),
    safe(
      () =>
        getPublishedItems<HomeService>(
          "home_services",
          "id,eyebrow,title,description,cta_label,cta_href,sort,status",
        ),
      [],
    ),
    safe(
      () => getPublishedItems<HomeProcessStep>("home_process_steps", "id,phase,title,body,sort,status"),
      [],
    ),
    safe(
      () =>
        getPublishedItems<HomeTestimonial>(
          "home_testimonials",
          "id,author_name,author_role,quote,sort,status",
        ),
      [],
    ),
    safe(
      () =>
        getSinglePublishedItem<HomeFinalCta>(
          "home_final_cta",
          "id,title,body,primary_cta_label,primary_cta_href,secondary_cta_label,secondary_cta_href,status",
        ),
      null,
    ),
    getPublishedPosts(),
  ]);

  return {
    siteSettings: chrome.siteSettings,
    navLinks: chrome.navLinks,
    hero: hero ?? fallbackHero,
    stats: stats.length > 0 ? stats : fallbackStats,
    services: services.length > 0 ? services : fallbackServices,
    processSteps: processSteps.length > 0 ? processSteps : fallbackProcessSteps,
    testimonials: testimonials.length > 0 ? testimonials : fallbackTestimonials,
    finalCta: finalCta ?? fallbackFinalCta,
    posts,
  };
}
