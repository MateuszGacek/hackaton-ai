#!/usr/bin/env node
/**
 * Creates the `pages` collection in Directus and seeds the "ai-agencies" page.
 * Run: node scripts/seed-ai-agencies.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

async function login(baseUrl, email, password) {
  const r = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Login failed: ${r.status}`);
  const token = json?.data?.access_token;
  if (!token) throw new Error("No access token returned");
  return token;
}

function api(baseUrl, token) {
  return async function call(pathname, options = {}) {
    const { method = "GET", body, query } = options;
    const qs = query ? "?" + new URLSearchParams(query).toString() : "";
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    let requestBody;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
    const r = await fetch(`${baseUrl}${pathname}${qs}`, {
      method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* empty */ }
    if (!r.ok) {
      console.error(`[API Error] ${method} ${pathname} -> ${r.status}\n${text.slice(0, 500)}`);
    }
    return { ok: r.ok, status: r.status, json };
  };
}

async function ensurePagesCollection(call) {
  const listRes = await call("/collections");
  const collections = listRes.json?.data ?? [];
  const exists = collections.some((c) => c.collection === "pages");
  if (exists) {
    console.log("Collection `pages` already exists.");
    return;
  }
  console.log("Creating collection `pages`...");
  await call("/collections", {
    method: "POST",
    body: {
      collection: "pages",
      meta: { collection: "pages", icon: "article", note: "CMS-driven landing pages" },
      schema: { name: "pages" },
    },
  });
}

async function ensurePagesFields(call) {
  const listRes = await call("/fields/pages");
  const existing = new Set((listRes.json?.data ?? []).map((f) => f.field));

  const fields = [
    {
      field: "slug",
      type: "string",
      meta: { interface: "input", required: true, width: "half" },
      schema: { is_nullable: false, max_length: 255 },
    },
    {
      field: "title",
      type: "string",
      meta: { interface: "input", required: true, width: "half" },
      schema: { is_nullable: false, max_length: 255 },
    },
    {
      field: "meta_description",
      type: "text",
      meta: { interface: "input-multiline", width: "full" },
      schema: { is_nullable: true },
    },
    {
      field: "status",
      type: "string",
      meta: {
        interface: "select-dropdown",
        required: true,
        width: "half",
        options: {
          choices: [
            { text: "Published", value: "published" },
            { text: "Draft", value: "draft" },
          ],
        },
      },
      schema: { is_nullable: false, max_length: 32, default_value: "draft" },
    },
    {
      field: "hero_eyebrow",
      type: "string",
      meta: { interface: "input", width: "half" },
      schema: { is_nullable: true, max_length: 255 },
    },
    {
      field: "hero_headline",
      type: "string",
      meta: { interface: "input", width: "full" },
      schema: { is_nullable: true, max_length: 512 },
    },
    {
      field: "hero_subhead",
      type: "text",
      meta: { interface: "input-multiline", width: "full" },
      schema: { is_nullable: true },
    },
    {
      field: "sections",
      type: "json",
      meta: { interface: "input-code", width: "full", options: { language: "json" } },
      schema: { is_nullable: true },
    },
  ];

  for (const def of fields) {
    if (existing.has(def.field)) {
      console.log(`Field pages.${def.field} already exists.`);
      continue;
    }
    console.log(`Creating field pages.${def.field}...`);
    await call("/fields/pages", { method: "POST", body: { ...def, collection: "pages" } });
  }
}

async function ensurePublicReadPermission(call) {
  const rolesRes = await call("/roles");
  const roles = rolesRes.json?.data ?? [];
  let publicRole = roles.find((r) => r.name === "Public");
  if (!publicRole) {
    console.log("Creating Public role...");
    const res = await call("/roles", {
      method: "POST",
      body: { name: "Public", admin_access: false, app_access: false },
    });
    publicRole = res.json?.data;
  }
  if (!publicRole?.id) throw new Error("Could not resolve Public role ID");

  const pageFields = ["id", "slug", "title", "meta_description", "status", "hero_eyebrow", "hero_headline", "hero_subhead", "sections"];
  const permPayload = {
    collection: "pages",
    action: "read",
    permissions: { status: { _eq: "published" } },
    fields: pageFields,
  };

  // Role-based permission
  const existingRes = await call("/permissions", {
    query: {
      "filter[role][_eq]": publicRole.id,
      "filter[collection][_eq]": "pages",
      "filter[action][_eq]": "read",
      limit: 1,
    },
  });
  if ((existingRes.json?.data ?? []).length === 0) {
    console.log("Creating Public role read permission for pages...");
    await call("/permissions", { method: "POST", body: { role: publicRole.id, ...permPayload } });
  } else {
    console.log("Public role read permission for pages already exists.");
  }

  // Anonymous (role=null) permission for unauthenticated Next.js SSR
  const anonRes = await call("/permissions", {
    query: {
      "filter[role][_null]": true,
      "filter[collection][_eq]": "pages",
      "filter[action][_eq]": "read",
      limit: 1,
    },
  });
  if ((anonRes.json?.data ?? []).length === 0) {
    console.log("Creating anonymous (role=null) read permission for pages...");
    await call("/permissions", { method: "POST", body: { role: null, ...permPayload } });
  } else {
    console.log("Anonymous read permission for pages already exists.");
  }
}

const AI_AGENCIES_SECTIONS = [
  {
    type: "topic_grid",
    title: "Core Topics in AI Agency Services",
    lede: "Explore the main disciplines and service areas delivered by modern AI agencies.",
    topics: [
      {
        title: "What Is an AI Agency?",
        description:
          "An AI agency specialises in designing, building, and deploying artificial-intelligence solutions for businesses. Unlike general software agencies, they focus on ML pipelines, large-language-model integrations, and data-driven products.",
        subtopics: ["Definition & scope", "Agency vs. consultancy", "Full-service vs. niche", "In-house AI vs. agency"],
      },
      {
        title: "AI Strategy & Consulting",
        description:
          "Before writing a single line of model code, top agencies help clients identify high-value use cases, assess data readiness, and build a phased roadmap with clear ROI targets.",
        subtopics: ["Use-case discovery", "Data readiness audit", "ROI modelling", "AI adoption roadmap", "Risk & ethics review"],
      },
      {
        title: "LLM & Generative AI Development",
        description:
          "From prompt engineering and fine-tuning to RAG pipelines and multi-agent orchestration, agencies handle the full LLM stack so your product ships on time.",
        subtopics: ["Prompt engineering", "Fine-tuning & RLHF", "RAG architecture", "Agent & tool-use design", "LLM evaluation"],
      },
      {
        title: "AI Automation & Process Optimisation",
        description:
          "Combining RPA with AI judgement layers, agencies automate repetitive workflows, decision gates, and document processing at scale.",
        subtopics: ["Intelligent document processing", "RPA + AI integration", "Workflow orchestration", "Exception handling", "Human-in-the-loop design"],
      },
      {
        title: "Computer Vision & Multimodal AI",
        description:
          "Object detection, image classification, video analytics, and multimodal models that combine vision with language for richer product experiences.",
        subtopics: ["Object detection", "Image classification", "Video analytics", "Multimodal models", "Edge deployment"],
      },
      {
        title: "Data Engineering & MLOps",
        description:
          "Reliable models need reliable data. Agencies set up pipelines, feature stores, model registries, and monitoring so production AI stays healthy over time.",
        subtopics: ["Data pipelines", "Feature engineering", "Model training infra", "CI/CD for ML", "Drift monitoring"],
      },
    ],
  },
  {
    type: "feature_list",
    title: "What AI Agencies Deliver",
    lede: "A well-scoped AI agency engagement typically covers end-to-end delivery across these capability areas.",
    items: [
      "Custom LLM fine-tuning and retrieval-augmented generation (RAG) pipelines",
      "AI agent design and multi-agent orchestration frameworks",
      "Conversational AI — chatbots, voice assistants, and customer-service automation",
      "Computer vision systems for quality control, surveillance, and AR/VR",
      "Natural language processing: entity extraction, sentiment analysis, summarisation",
      "Predictive analytics, demand forecasting, and anomaly detection",
      "MLOps infrastructure: model versioning, CI/CD pipelines, drift alerts",
      "Responsible AI audits: bias assessment, explainability reports, compliance checks",
      "AI-first product design: interaction patterns, feedback loops, trust UX",
      "Training and enablement for in-house teams post-delivery",
    ],
  },
  {
    type: "process",
    title: "How to Work with an AI Agency",
    lede: "A structured engagement process reduces risk and aligns expectations from day one.",
    steps: [
      {
        title: "Discovery & Use-Case Mapping",
        description:
          "The agency runs workshops to understand your business goals, existing data assets, and pain points. Output: a prioritised list of AI use cases with estimated impact and feasibility scores.",
      },
      {
        title: "Data Audit & Readiness Assessment",
        description:
          "Before model work begins, data quality, volume, labelling requirements, and privacy constraints are evaluated. This step often surfaces quick wins or blockers that reshape the roadmap.",
      },
      {
        title: "Proof of Concept (PoC)",
        description:
          "A focused two-to-four week sprint validates the core hypothesis. The PoC is scoped to answer a single question: can the AI achieve the target performance metric on your data?",
      },
      {
        title: "Model Development & Training",
        description:
          "The agency builds, trains, evaluates, and iterates on models against agreed benchmarks. Stakeholders review results at each milestone with clear acceptance criteria.",
      },
      {
        title: "Integration & Deployment",
        description:
          "Trained models are wrapped in APIs or embedded directly in your product. The agency handles containerisation, cloud deployment, latency tuning, and load testing.",
      },
      {
        title: "Monitoring, Governance & Handoff",
        description:
          "Post-launch, dashboards track model performance, data drift, and business KPIs. The agency documents the system and trains your team to operate it independently.",
      },
    ],
  },
  {
    type: "faq",
    title: "Frequently Asked Questions",
    lede: "Common questions clients ask before engaging an AI agency.",
    items: [
      {
        q: "What is an AI agency and how is it different from a software agency?",
        a: "An AI agency specialises in data science, machine learning engineering, and AI product design. While a traditional software agency builds deterministic applications, an AI agency works with probabilistic systems — models that learn from data, degrade over time, and require ongoing monitoring. They bring expertise in ML frameworks, data pipelines, model evaluation, and responsible-AI practices that are outside most software agencies' core competencies.",
      },
      {
        q: "How much does it cost to hire an AI agency?",
        a: "Costs vary widely by scope and geography. A focused PoC typically runs €15,000–€50,000. Full-product builds with custom model training, MLOps setup, and integrations commonly range from €80,000 to €500,000+. Retainers for ongoing model monitoring and iteration start around €5,000–€15,000 per month. Always ask for a fixed-scope PoC before committing to a larger engagement.",
      },
      {
        q: "Do I need a large dataset before approaching an AI agency?",
        a: "Not necessarily. A good agency will first assess your existing data, then recommend whether to start with a pre-trained model (zero-shot or few-shot), invest in data collection and labelling, or use synthetic data generation. Many successful projects start with small datasets and scale iteratively after proving value.",
      },
      {
        q: "How long does a typical AI project take?",
        a: "A PoC can be delivered in two to four weeks. An MVP with basic integrations typically takes two to four months. A production-grade AI system with MLOps, security review, and full deployment usually requires four to nine months. Timeline depends heavily on data readiness and the complexity of the integration environment.",
      },
      {
        q: "How do I evaluate if an AI agency is a good fit?",
        a: "Look for: a portfolio of production deployments (not just demos), transparent model evaluation methodology, clear data-privacy practices, willingness to do a paid discovery or PoC before a large commitment, and a handoff plan so your team can own the system after delivery. Avoid agencies that promise unrealistic accuracy figures before seeing your data.",
      },
      {
        q: "What questions should I ask an AI agency in a first meeting?",
        a: "Ask about their ML evaluation framework, how they handle model drift post-launch, what their data-privacy and GDPR approach looks like, whether they have experience in your vertical, and what the scope of the handoff deliverables includes. Also ask for a reference from a similar engagement.",
      },
    ],
  },
  {
    type: "cta",
    title: "Looking for an AI agency partner?",
    desc: "SwiftLayer helps teams scope, build, and ship AI-powered products with performance and editorial control built in from day one. Share your use case and we will outline the smallest scope that delivers real value.",
    cta_label: "Book a Discovery Call",
    cta_href: "/#contact",
  },
];

async function seedAiAgenciesPage(call) {
  const existing = await call("/items/pages", {
    query: { "filter[slug][_eq]": "ai-agencies", limit: 1 },
  });
  const items = existing.json?.data ?? [];
  if (items.length > 0) {
    console.log("Page `ai-agencies` already exists. Updating content...");
    const id = items[0].id;
    await call(`/items/pages/${id}`, {
      method: "PATCH",
      body: {
        title: "AI Agencies — Complete Guide",
        meta_description:
          "A comprehensive guide to AI agencies: what they do, how they work, service areas, pricing, and how to choose the right partner for your project.",
        status: "published",
        hero_eyebrow: "AI Agency Guide",
        hero_headline: "Everything You Need to Know About AI Agencies",
        hero_subhead:
          "From strategy consulting to LLM development and MLOps — a practical guide covering what AI agencies do, how to evaluate them, and how to get the most from an engagement.",
        sections: AI_AGENCIES_SECTIONS,
      },
    });
    console.log("Page `ai-agencies` updated.");
    return;
  }

  console.log("Creating page `ai-agencies`...");
  await call("/items/pages", {
    method: "POST",
    body: {
      slug: "ai-agencies",
      title: "AI Agencies — Complete Guide",
      meta_description:
        "A comprehensive guide to AI agencies: what they do, how they work, service areas, pricing, and how to choose the right partner for your project.",
      status: "published",
      hero_eyebrow: "AI Agency Guide",
      hero_headline: "Everything You Need to Know About AI Agencies",
      hero_subhead:
        "From strategy consulting to LLM development and MLOps — a practical guide covering what AI agencies do, how to evaluate them, and how to get the most from an engagement.",
      sections: AI_AGENCIES_SECTIONS,
    },
  });
  console.log("Page `ai-agencies` created.");
}

async function main() {
  loadEnvFile(ENV_PATH);

  const directusUrl = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/$/, "");
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;

  if (!email || !password) throw new Error("Missing DIRECTUS_ADMIN_EMAIL or DIRECTUS_ADMIN_PASSWORD");

  console.log(`Connecting to Directus at ${directusUrl}`);
  const token = await login(directusUrl, email, password);
  const call = api(directusUrl, token);

  await ensurePagesCollection(call);
  await ensurePagesFields(call);
  await ensurePublicReadPermission(call);
  await seedAiAgenciesPage(call);

  console.log("\nDone. Visit http://localhost:3000/ai-agencies to see the page.");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
