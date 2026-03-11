import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug } from "@/lib/directus";

type Topic = {
  title: string;
  description?: string;
  subtopics?: string[];
};

type FaqItem = {
  q: string;
  a: string;
};

type Section =
  | {
      type: "topic_grid";
      title?: string;
      lede?: string;
      topics?: Topic[];
    }
  | {
      type: "feature_list";
      title?: string;
      lede?: string;
      items?: string[];
    }
  | {
      type: "process";
      title?: string;
      lede?: string;
      steps?: Array<{ title: string; description?: string }>;
    }
  | {
      type: "faq";
      title?: string;
      lede?: string;
      items?: FaqItem[];
    }
  | {
      type: "cta";
      title?: string;
      desc?: string;
      cta_label?: string;
      cta_href?: string;
    };

function isSection(value: unknown): value is Section {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string";
}

type SubNavItem = {
  id: string;
  label: string;
};

type ResolvedSection = {
  id: string;
  title: string;
  lede: string;
  section: Section;
  subNav: SubNavItem[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const fallbackSections: Section[] = [
  {
    type: "topic_grid",
    title: "Agency Menu by Capability",
    lede: "Start from the category that matches your current bottleneck. Each track includes delivery scope, risk controls, and expected outcomes.",
    topics: [
      {
        title: "Go-To-Market Websites",
        description:
          "Landing pages and service pages optimized for speed, indexing, and conversion. Includes messaging structure, section architecture, and launch readiness.",
        subtopics: ["Messaging hierarchy", "Conversion sections", "Route-level SEO", "Performance budgets"],
      },
      {
        title: "Content Hubs",
        description:
          "Build scalable hubs for insights, resources, and updates with clear taxonomy, filtering strategy, and reusable templates.",
        subtopics: ["Taxonomy model", "Template rules", "Internal links", "Editorial workflow"],
      },
      {
        title: "Motion + 3D",
        description:
          "Use animation and WebGL intentionally, with graceful degradation and accessibility defaults that protect readability and interaction.",
        subtopics: ["Reduced motion", "Layering safety", "Runtime constraints", "Fallback states"],
      },
    ],
  },
  {
    type: "feature_list",
    title: "What This Engagement Includes",
    lede: "The baseline package is structured to prevent scope drift and keep delivery measurable from day one.",
    items: [
      "Page and section map with reusable content blocks",
      "Technical SEO rules: canonicals, indexing, metadata contracts",
      "Performance envelope per route type (home, services, content)",
      "Content modeling plan for your CMS with governance boundaries",
      "Accessibility checks across keyboard flow, contrast, and motion preferences",
      "QA checklist for pre-launch and post-launch validation",
    ],
  },
  {
    type: "process",
    title: "Delivery Subsections",
    lede: "Every phase has a clear output so stakeholders can review progress without ambiguity.",
    steps: [
      {
        title: "Discovery and Scope Definition",
        description:
          "We define goals, route inventory, dependencies, and risks. Output: aligned brief, priorities, and implementation boundaries.",
      },
      {
        title: "Information Architecture + Section System",
        description:
          "We design a reusable section model and map it to CMS structures. Output: content schema, template matrix, and component ownership.",
      },
      {
        title: "Build + Validation",
        description:
          "We implement pages and interaction layers with budget checks. Output: validated routes and documented release criteria.",
      },
      {
        title: "Launch + Iteration",
        description:
          "We ship with monitoring and a first optimization cycle. Output: measured baseline and a prioritized post-launch roadmap.",
      },
    ],
  },
  {
    type: "faq",
    title: "Frequently Asked Questions",
    lede: "Operational questions teams ask before starting a project.",
    items: [
      {
        q: "Can we keep our existing CMS and design system?",
        a: "Yes. We work within existing systems first and only replace parts that create measurable delivery friction.",
      },
      {
        q: "How quickly can we ship a first version?",
        a: "A focused first release is typically planned in short phases with clear checkpoints, then expanded in iterations.",
      },
      {
        q: "Will this work for multilingual routes and content?",
        a: "Yes. The section and metadata model can be structured for multiple locales with predictable publishing workflows.",
      },
      {
        q: "How do you handle SEO during page migrations?",
        a: "We define canonical strategy, redirect mapping, and post-release checks so migrations do not break discoverability.",
      },
    ],
  },
  {
    type: "cta",
    title: "Need a Full Page Plan This Week?",
    desc: "Share your current site, constraints, and launch target. We’ll propose a practical structure with sections, subcategories, and implementation steps.",
    cta_label: "Request Project Outline",
    cta_href: "/#contact",
  },
];

function withDefaults(section: Section): Section {
  switch (section.type) {
    case "topic_grid":
      return {
        ...section,
        title: section.title?.trim() || "Agency Menu by Capability",
        lede:
          section.lede?.trim() ||
          "Choose a category to explore focused subcategories and execution priorities for your project.",
        topics:
          Array.isArray(section.topics) && section.topics.length > 0
            ? section.topics
            : (fallbackSections[0] as Extract<Section, { type: "topic_grid" }>).topics,
      };
    case "feature_list":
      return {
        ...section,
        title: section.title?.trim() || "What This Engagement Includes",
        lede:
          section.lede?.trim() ||
          "A clear baseline scope helps teams avoid vague deliverables and keeps launch readiness trackable.",
        items:
          Array.isArray(section.items) && section.items.length > 0
            ? section.items
            : (fallbackSections[1] as Extract<Section, { type: "feature_list" }>).items,
      };
    case "process":
      return {
        ...section,
        title: section.title?.trim() || "Delivery Subsections",
        lede:
          section.lede?.trim() ||
          "Each phase includes a concrete output so execution and approvals stay predictable.",
        steps:
          Array.isArray(section.steps) && section.steps.length > 0
            ? section.steps
            : (fallbackSections[2] as Extract<Section, { type: "process" }>).steps,
      };
    case "faq":
      return {
        ...section,
        title: section.title?.trim() || "Frequently Asked Questions",
        lede:
          section.lede?.trim() || "Common scope, timeline, and implementation questions before kickoff.",
        items:
          Array.isArray(section.items) && section.items.length > 0
            ? section.items
            : (fallbackSections[3] as Extract<Section, { type: "faq" }>).items,
      };
    case "cta":
      return {
        ...section,
        title: section.title?.trim() || "Need a Full Page Plan This Week?",
        desc:
          section.desc?.trim() ||
          "Send your constraints and goals. We will return a scope proposal with practical milestones.",
        cta_label: section.cta_label?.trim() || "Request Project Outline",
        cta_href: section.cta_href?.trim() || "/#contact",
      };
    default:
      return section;
  }
}

function getSubNav(section: Section, sectionId: string): SubNavItem[] {
  switch (section.type) {
    case "topic_grid":
      return (section.topics ?? []).map((topic, index) => ({
        id: `${sectionId}-sub-${index + 1}-${slugify(topic.title || `topic-${index + 1}`)}`,
        label: topic.title || `Topic ${index + 1}`,
      }));
    case "feature_list":
      return (section.items ?? []).map((item, index) => ({
        id: `${sectionId}-sub-${index + 1}`,
        label: item.length > 42 ? `${item.slice(0, 42).trim()}...` : item,
      }));
    case "process":
      return (section.steps ?? []).map((step, index) => ({
        id: `${sectionId}-sub-${index + 1}-${slugify(step.title || `step-${index + 1}`)}`,
        label: step.title || `Step ${index + 1}`,
      }));
    case "faq":
      return (section.items ?? []).map((item, index) => ({
        id: `${sectionId}-sub-${index + 1}-${slugify(item.q || `faq-${index + 1}`)}`,
        label: item.q || `FAQ ${index + 1}`,
      }));
    case "cta":
      return section.title
        ? [{ id: `${sectionId}-sub-1-cta`, label: section.title }]
        : [];
    default:
      return [];
  }
}

export default async function AiAgenciesPage() {
  const page = await getPublishedPageBySlug("ai-agencies");

  if (!page) notFound();

  const sectionsRaw = page.sections;
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw.filter(isSection) : [];
  const normalizedSections = (sections.length > 0 ? sections : fallbackSections).map(withDefaults);
  const existingTypes = new Set(normalizedSections.map((section) => section.type));
  const hydratedSections = [
    ...normalizedSections,
    ...fallbackSections
      .filter((section) => !existingTypes.has(section.type))
      .map((section) => withDefaults(section)),
  ];

  const resolvedSections: ResolvedSection[] = hydratedSections.map((section, index) => {
    const title = section.title ?? `Section ${index + 1}`;
    const lede =
      (section.type === "cta" ? section.desc : section.lede) ??
      "This subsection provides implementation details and practical guidance.";
    const id = `${section.type}-${index + 1}-${slugify(title)}`;

    return {
      id,
      title,
      lede,
      section,
      subNav: getSubNav(section, id),
    };
  });

  return (
    <main className="page-shell">
      <Link href="/" className="back-link">
        ← Wróć do postów
      </Link>

      <section className="hero hero-page">
        <p className="eyebrow">{page.hero_eyebrow ?? "AI Agencies"}</p>
        <h1>{page.hero_headline ?? page.title}</h1>
        <p className="hero-copy">{page.hero_subhead ?? page.meta_description ?? ""}</p>
      </section>

      <section className="content-section page-menu" aria-labelledby="page-menu-title">
        <header className="section-header">
          <h2 id="page-menu-title">Page Menu</h2>
          <p>
            Use this menu to move through sections and subcategories. Each subsection has its own anchor so you can
            jump directly to specific content.
          </p>
        </header>
        <div className="menu-grid">
          {resolvedSections.map((resolvedSection) => (
            <article key={resolvedSection.id} className="topic-card menu-group">
              <h3>
                <a href={`#${resolvedSection.id}`}>{resolvedSection.title}</a>
              </h3>
              <p>{resolvedSection.lede}</p>
              {resolvedSection.subNav.length > 0 ? (
                <ul className="menu-sublist">
                  {resolvedSection.subNav.map((subItem) => (
                    <li key={subItem.id}>
                      <a href={`#${subItem.id}`}>{subItem.label}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {resolvedSections.map((resolvedSection) => {
        const section = resolvedSection.section;
        switch (section.type) {
          case "topic_grid": {
            const topics = Array.isArray(section.topics) ? section.topics : [];
            return (
              <section key={resolvedSection.id} id={resolvedSection.id} className="content-section">
                <header className="section-header">
                  <h2>{resolvedSection.title}</h2>
                  <p>{resolvedSection.lede}</p>
                </header>
                <div className="topic-grid">
                  {topics.map((topic, topicIndex) => {
                    const subId = resolvedSection.subNav[topicIndex]?.id;
                    return (
                      <article key={topicIndex} id={subId} className="topic-card">
                        <h3>{topic.title}</h3>
                        {topic.description ? <p>{topic.description}</p> : null}
                        {Array.isArray(topic.subtopics) && topic.subtopics.length > 0 ? (
                          <ul className="pill-list">
                            {topic.subtopics.map((subtopic, subIndex) => (
                              <li key={subIndex} className="pill">
                                {subtopic}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          }
          case "feature_list": {
            const items = Array.isArray(section.items) ? section.items : [];
            return (
              <section key={resolvedSection.id} id={resolvedSection.id} className="content-section">
                <header className="section-header">
                  <h2>{resolvedSection.title}</h2>
                  <p>{resolvedSection.lede}</p>
                </header>
                <ul className="bullet-list">
                  {items.map((item, itemIndex) => (
                    <li key={itemIndex} id={resolvedSection.subNav[itemIndex]?.id}>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }
          case "process": {
            const steps = Array.isArray(section.steps) ? section.steps : [];
            return (
              <section key={resolvedSection.id} id={resolvedSection.id} className="content-section">
                <header className="section-header">
                  <h2>{resolvedSection.title}</h2>
                  <p>{resolvedSection.lede}</p>
                </header>
                <ol className="step-list">
                  {steps.map((step, stepIndex) => (
                    <li key={stepIndex} id={resolvedSection.subNav[stepIndex]?.id} className="step-card">
                      <h3>
                        <span className="step-index">{stepIndex + 1}</span>
                        {step.title}
                      </h3>
                      {step.description ? <p>{step.description}</p> : null}
                    </li>
                  ))}
                </ol>
              </section>
            );
          }
          case "faq": {
            const items = Array.isArray(section.items) ? section.items : [];
            return (
              <section key={resolvedSection.id} id={resolvedSection.id} className="content-section">
                <header className="section-header">
                  <h2>{resolvedSection.title}</h2>
                  <p>{resolvedSection.lede}</p>
                </header>
                <div className="faq-list">
                  {items.map((item, itemIndex) => (
                    <details key={itemIndex} id={resolvedSection.subNav[itemIndex]?.id} className="faq-item">
                      <summary>{item.q}</summary>
                      <p>{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          }
          case "cta": {
            return (
              <section key={resolvedSection.id} id={resolvedSection.id} className="content-section cta-banner">
                <h2 id={resolvedSection.subNav[0]?.id}>{resolvedSection.title}</h2>
                <p>{resolvedSection.lede}</p>
                {section.cta_href && section.cta_label ? (
                  <Link href={section.cta_href} className="post-link">
                    {section.cta_label}
                  </Link>
                ) : null}
              </section>
            );
          }
          default:
            return null;
        }
      })}
    </main>
  );
}
