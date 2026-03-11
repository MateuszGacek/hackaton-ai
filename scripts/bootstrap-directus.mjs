#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

function truncate(value, maxLength = 1200) {
  if (typeof value !== "string") return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...<truncated>`;
}

function toQueryString(query = {}) {
  const searchParams = new URLSearchParams();

  const appendValue = (key, value) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      for (const item of value) appendValue(key, item);
      return;
    }

    searchParams.append(key, String(value));
  };

  for (const [key, value] of Object.entries(query)) appendValue(key, value);

  const finalQuery = searchParams.toString();
  return finalQuery ? `?${finalQuery}` : "";
}

function createApiClient({ baseUrl, tokenProvider }) {
  return async function api(pathname, options = {}) {
    const {
      method = "GET",
      body,
      query,
      headers: optionHeaders = {},
      throwOnError = true,
      timeoutMs = 15000,
    } = options;

    const resolvedHeaders = new Headers();

    const token = tokenProvider();
    if (token) resolvedHeaders.set("Authorization", `Bearer ${token}`);

    for (const [key, value] of Object.entries(optionHeaders)) {
      if (value === undefined || value === null) continue;
      resolvedHeaders.set(key, String(value));
    }

    let requestBody = body;
    if (body !== undefined && body !== null && typeof body !== "string" && !(body instanceof URLSearchParams)) {
      if (!resolvedHeaders.has("Content-Type")) resolvedHeaders.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }

    const requestUrl = `${baseUrl}${pathname}${toQueryString(query)}`;
    const response = await fetch(requestUrl, {
      method,
      headers: resolvedHeaders,
      body: requestBody,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const responseText = await response.text();
    let jsonBody = null;

    if (responseText) {
      try {
        jsonBody = JSON.parse(responseText);
      } catch {
        jsonBody = null;
      }
    }

    if (!response.ok) {
      console.error(
        `[Directus API Error] ${method.toUpperCase()} ${pathname} -> ${response.status}\n${truncate(responseText || "<empty>")}`,
      );

      if (throwOnError) {
        throw new Error(`Request failed: ${method.toUpperCase()} ${pathname} -> ${response.status}`);
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      text: responseText,
      json: jsonBody,
    };
  };
}

async function waitForHealth(baseUrl, retries = 60, delayMs = 2000) {
  const healthUrl = `${baseUrl}/server/health`;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        console.log(`Directus is healthy (attempt ${attempt}/${retries})`);
        return;
      }

      const body = await response.text();
      console.log(`Health check ${attempt}/${retries} -> ${response.status} ${truncate(body, 200)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Health check ${attempt}/${retries} failed: ${message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Directus health endpoint did not become ready after ${retries} attempts.`);
}

function manualPermissionInstructions(baseUrl, collection, fields) {
  console.warn(`\n[WARNING] Could not create anonymous read access for ${collection}.`);
  console.warn("Configure manually in Directus Admin UI:");
  console.warn(`1) Open: ${baseUrl}/admin`);
  console.warn("2) Go to Settings -> Access Policies / Roles & Permissions.");
  console.warn("3) Role: Public -> collection -> Read.");
  console.warn("4) Filter: status _eq published.");
  console.warn(`5) Fields: ${fields.join(", ")}\n`);
}

function getDataArray(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (!Array.isArray(payload.data)) return [];
  return payload.data;
}

function textField(field, required = true, width = "full") {
  return {
    field,
    type: "string",
    meta: {
      field,
      interface: "input",
      required,
      width,
      options: null,
    },
    schema: {
      is_nullable: !required,
      max_length: 255,
    },
  };
}

function longTextField(field, required = true, width = "full") {
  return {
    field,
    type: "text",
    meta: {
      field,
      interface: "input-multiline",
      required,
      width,
      options: null,
    },
    schema: {
      is_nullable: !required,
    },
  };
}

function integerField(field, defaultValue = 10, width = "half") {
  return {
    field,
    type: "integer",
    meta: {
      field,
      interface: "input",
      required: true,
      width,
      options: null,
    },
    schema: {
      is_nullable: false,
      default_value: defaultValue,
    },
  };
}

function publishedStatusField() {
  return {
    field: "status",
    type: "string",
    meta: {
      field: "status",
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
    schema: {
      is_nullable: false,
      max_length: 32,
      default_value: "draft",
    },
  };
}

async function ensureCollection(api, collectionDefinition) {
  const { collection, icon, note } = collectionDefinition;
  const listResponse = await api("/collections");
  const collections = getDataArray(listResponse.json);

  let existingCollection = collections.find((entry) => entry.collection === collection);

  if (existingCollection && existingCollection.schema === null) {
    console.log(`Found metadata-only collection ${collection}. Recreating SQL-backed table...`);
    await api(`/collections/${collection}`, { method: "DELETE" });
    existingCollection = null;
  }

  if (existingCollection) {
    console.log(`Collection ${collection} already exists.`);
    return;
  }

  console.log(`Creating collection ${collection}...`);
  await api("/collections", {
    method: "POST",
    body: {
      collection,
      meta: {
        collection,
        icon,
        note,
      },
      schema: {
        name: collection,
      },
    },
  });
}

async function ensureFields(api, collection, fieldDefinitions) {
  const listResponse = await api(`/fields/${collection}`);
  const fields = getDataArray(listResponse.json);
  const existing = new Set(fields.map((entry) => entry.field));

  for (const definition of fieldDefinitions) {
    if (existing.has(definition.field)) {
      console.log(`Field ${collection}.${definition.field} already exists.`);
      continue;
    }

    console.log(`Creating field ${collection}.${definition.field}...`);
    await api(`/fields/${collection}`, {
      method: "POST",
      body: {
        ...definition,
        meta: {
          collection,
          ...(definition.meta ?? {}),
        },
      },
    });
  }
}

async function ensurePublicRole(api) {
  const rolesResponse = await api("/roles");
  const roles = getDataArray(rolesResponse.json);

  let publicRole = roles.find((role) => role.name === "Public");

  if (!publicRole) {
    console.log("Creating missing Public role...");
    const createRoleResponse = await api("/roles", {
      method: "POST",
      body: {
        name: "Public",
        admin_access: false,
        app_access: false,
      },
    });

    publicRole = createRoleResponse.json?.data ?? null;
  }

  if (!publicRole?.id) {
    throw new Error("Could not resolve Public role ID.");
  }

  return publicRole.id;
}

function buildReadPermissionPayload(collection, fields) {
  return {
    collection,
    action: "read",
    permissions: {
      status: {
        _eq: "published",
      },
    },
    fields,
  };
}

async function ensurePublicReadPermission(api, directusUrl, collection, fields) {
  const permissionPayload = buildReadPermissionPayload(collection, fields);
  const publicRoleId = await ensurePublicRole(api);

  const rolePermissionsResponse = await api("/permissions", {
    query: {
      "filter[role][_eq]": publicRoleId,
      "filter[collection][_eq]": collection,
      "filter[action][_eq]": "read",
      limit: 1,
    },
  });

  const roleReadPermissions = getDataArray(rolePermissionsResponse.json);

  if (roleReadPermissions.length === 0) {
    console.log(`Creating Public role read permission for ${collection}...`);
    const createRolePermissionResponse = await api("/permissions", {
      method: "POST",
      throwOnError: false,
      body: {
        role: publicRoleId,
        ...permissionPayload,
      },
    });

    if (!createRolePermissionResponse.ok) {
      manualPermissionInstructions(directusUrl, collection, fields);
    }
  } else {
    console.log(`Public role read permission for ${collection} already exists.`);
  }

  const probeResponse = await fetch(
    `${directusUrl}/items/${collection}?limit=1&fields=${fields.join(",")}&filter[status][_eq]=published`,
    { signal: AbortSignal.timeout(10000) },
  );

  if (probeResponse.ok) {
    console.log(`Anonymous public read for ${collection} is active.`);
    return;
  }

  const anonymousPermissionsResponse = await api("/permissions", {
    query: {
      "filter[collection][_eq]": collection,
      "filter[action][_eq]": "read",
      limit: 100,
    },
  });

  const anonymousPermissions = getDataArray(anonymousPermissionsResponse.json);
  const hasAnonymousRead = anonymousPermissions.some((permission) => permission.role === null);

  if (!hasAnonymousRead) {
    console.log(`Creating anonymous read permission for ${collection}...`);
    const createAnonymousPermissionResponse = await api("/permissions", {
      method: "POST",
      throwOnError: false,
      body: {
        role: null,
        ...permissionPayload,
      },
    });

    if (!createAnonymousPermissionResponse.ok) {
      manualPermissionInstructions(directusUrl, collection, fields);
      return;
    }
  } else {
    console.log(`Anonymous read permission for ${collection} already exists.`);
  }

  const verifyResponse = await fetch(
    `${directusUrl}/items/${collection}?limit=1&fields=${fields.join(",")}&filter[status][_eq]=published`,
    { signal: AbortSignal.timeout(10000) },
  );

  if (!verifyResponse.ok) {
    const verifyBody = await verifyResponse.text();
    console.warn(
      `Public access check for ${collection} still failing (${verifyResponse.status}).\n${truncate(verifyBody)}`,
    );
    manualPermissionInstructions(directusUrl, collection, fields);
    return;
  }

  console.log(`Anonymous public read for ${collection} is active after fallback.`);
}

async function seedCollection(api, collection, items) {
  const existingItemsResponse = await api(`/items/${collection}`, {
    query: { limit: 1 },
  });

  const existingItems = getDataArray(existingItemsResponse.json);

  if (existingItems.length > 0) {
    console.log(`${collection} already contains data. Skipping seed.`);
    return;
  }

  for (const item of items) {
    await api(`/items/${collection}`, {
      method: "POST",
      body: item,
    });
    console.log(`Seeded ${collection}: ${Object.values(item)[0]}`);
  }
}

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000),
  });

  const responseText = await response.text();
  let jsonBody = null;

  if (responseText) {
    try {
      jsonBody = JSON.parse(responseText);
    } catch {
      jsonBody = null;
    }
  }

  if (!response.ok) {
    console.error(
      `[Directus API Error] POST /auth/login -> ${response.status}\n${truncate(responseText || "<empty>")}`,
    );
    throw new Error("Failed to login to Directus.");
  }

  const accessToken = jsonBody?.data?.access_token;

  if (!accessToken) {
    throw new Error("Directus login succeeded but no access token was returned.");
  }

  return accessToken;
}

const collectionBlueprints = [
  {
    collection: "posts",
    icon: "article",
    note: "Editorial posts for the home insights section.",
    fields: [textField("title"), longTextField("desc"), publishedStatusField()],
    publicFields: ["id", "title", "desc", "status"],
    seed: [
      {
        title: "Core Web Vitals 2026: what teams should track",
        desc: "A practical model for agency teams: use LCP, INP, and CLS as release budgets tied to acceptance criteria.",
        status: "published",
      },
      {
        title: "Scalable section architecture in modern frontend",
        desc: "How to split responsibilities between page shells, section blocks, and reusable components without regressions.",
        status: "published",
      },
      {
        title: "Technical SEO as an engineering contract",
        desc: "Route mapping, canonical rules, and indexing controls should live in your build pipeline, not in post-launch audits.",
        status: "draft",
      },
    ],
  },
  {
    collection: "site_settings",
    icon: "settings",
    note: "Global website settings used by navigation and footer.",
    fields: [
      textField("company_name"),
      longTextField("company_tagline"),
      textField("primary_cta_label"),
      textField("primary_cta_href"),
      textField("contact_email"),
      longTextField("footer_note"),
      publishedStatusField(),
    ],
    publicFields: [
      "id",
      "company_name",
      "company_tagline",
      "primary_cta_label",
      "primary_cta_href",
      "contact_email",
      "footer_note",
      "status",
    ],
    seed: [
      {
        company_name: "SwiftLayer",
        company_tagline: "Three.js-led digital product delivery with measurable performance, accessibility, and SEO outcomes.",
        primary_cta_label: "Book Discovery Call",
        primary_cta_href: "#contact",
        contact_email: "hello@swiftlayer.studio",
        footer_note: "Built for teams that need premium motion and reliable shipping velocity.",
        status: "published",
      },
    ],
  },
  {
    collection: "nav_links",
    icon: "menu",
    note: "Top navigation links rendered in header and mobile menu.",
    fields: [
      textField("label"),
      textField("href"),
      integerField("sort", 10),
      publishedStatusField(),
    ],
    publicFields: ["id", "label", "href", "sort", "status"],
    seed: [
      { label: "Services", href: "#services", sort: 10, status: "published" },
      { label: "Process", href: "#process", sort: 20, status: "published" },
      { label: "Insights", href: "#insights", sort: 30, status: "published" },
      { label: "Testimonials", href: "#testimonials", sort: 40, status: "published" },
      { label: "Contact", href: "#contact", sort: 50, status: "published" },
    ],
  },
  {
    collection: "home_hero",
    icon: "home",
    note: "Hero section content for the homepage.",
    fields: [
      textField("eyebrow"),
      longTextField("title"),
      longTextField("body"),
      textField("primary_cta_label"),
      textField("primary_cta_href"),
      textField("secondary_cta_label"),
      textField("secondary_cta_href"),
      textField("visual_badge"),
      publishedStatusField(),
    ],
    publicFields: [
      "id",
      "eyebrow",
      "title",
      "body",
      "primary_cta_label",
      "primary_cta_href",
      "secondary_cta_label",
      "secondary_cta_href",
      "visual_badge",
      "status",
    ],
    seed: [
      {
        eyebrow: "CMS + Three.js + Performance",
        title: "Ship a premium digital experience without sacrificing release confidence.",
        body: "SwiftLayer combines cinematic interaction design, strict performance budgets, and CMS-governed content operations so teams can scale pages quickly.",
        primary_cta_label: "Start a Project",
        primary_cta_href: "#contact",
        secondary_cta_label: "Explore Services",
        secondary_cta_href: "#services",
        visual_badge: "Realtime WebGL stage",
        status: "published",
      },
    ],
  },
  {
    collection: "home_stats",
    icon: "bar_chart",
    note: "Proof points under the hero section.",
    fields: [textField("value"), textField("label"), longTextField("detail"), integerField("sort", 10), publishedStatusField()],
    publicFields: ["id", "value", "label", "detail", "sort", "status"],
    seed: [
      { value: "95+", label: "Lighthouse baseline", detail: "Performance-first template and budget guardrails.", sort: 10, status: "published" },
      { value: "< 1.8s", label: "Median LCP target", detail: "Critical rendering paths tuned per route.", sort: 20, status: "published" },
      { value: "24h", label: "CMS publish cycle", detail: "Editors can launch new sections without frontend changes.", sort: 30, status: "published" },
      { value: "100%", label: "Accessible defaults", detail: "Semantic structure, keyboard flows, and contrast checks included.", sort: 40, status: "published" },
    ],
  },
  {
    collection: "home_services",
    icon: "construction",
    note: "Service cards shown on the homepage.",
    fields: [
      textField("eyebrow"),
      textField("title"),
      longTextField("description"),
      textField("cta_label"),
      textField("cta_href"),
      integerField("sort", 10),
      publishedStatusField(),
    ],
    publicFields: ["id", "eyebrow", "title", "description", "cta_label", "cta_href", "sort", "status"],
    seed: [
      {
        eyebrow: "Platform",
        title: "CMS Architecture",
        description: "Model sections, components, and page rules in Directus so editorial teams can scale content safely.",
        cta_label: "See architecture",
        cta_href: "#process",
        sort: 10,
        status: "published",
      },
      {
        eyebrow: "Experience",
        title: "Three.js Product Surfaces",
        description: "Create immersive hero moments with graceful fallbacks and strict control over runtime cost.",
        cta_label: "View showcase",
        cta_href: "#insights",
        sort: 20,
        status: "published",
      },
      {
        eyebrow: "Growth",
        title: "Technical SEO and Analytics",
        description: "Turn indexing, schema, and tracking into stable engineering contracts with release checkpoints.",
        cta_label: "Open playbook",
        cta_href: "#insights",
        sort: 30,
        status: "published",
      },
      {
        eyebrow: "Delivery",
        title: "Release Governance",
        description: "Define quality gates, review loops, and measurable acceptance criteria before implementation starts.",
        cta_label: "Book workshop",
        cta_href: "#contact",
        sort: 40,
        status: "published",
      },
    ],
  },
  {
    collection: "home_process_steps",
    icon: "checklist",
    note: "Delivery process timeline shown on homepage.",
    fields: [textField("phase"), textField("title"), longTextField("body"), integerField("sort", 10), publishedStatusField()],
    publicFields: ["id", "phase", "title", "body", "sort", "status"],
    seed: [
      {
        phase: "01 Discovery",
        title: "Define outcome + constraints",
        body: "We align business goals, technical risks, and CMS requirements into one scoped delivery map.",
        sort: 10,
        status: "published",
      },
      {
        phase: "02 Architecture",
        title: "Model content and section system",
        body: "Collections, fields, and publishing rules are built first so design and development run in parallel.",
        sort: 20,
        status: "published",
      },
      {
        phase: "03 Build",
        title: "Implement interaction + performance budgets",
        body: "We deliver reusable sections with animation, Three.js, and measured budgets for each route.",
        sort: 30,
        status: "published",
      },
      {
        phase: "04 Scale",
        title: "Run governance and iterate",
        body: "Editorial teams can publish independently while engineering keeps quality checks enforced.",
        sort: 40,
        status: "published",
      },
    ],
  },
  {
    collection: "home_testimonials",
    icon: "format_quote",
    note: "Social proof quotes on homepage.",
    fields: [textField("author_name"), textField("author_role"), longTextField("quote"), integerField("sort", 10), publishedStatusField()],
    publicFields: ["id", "author_name", "author_role", "quote", "sort", "status"],
    seed: [
      {
        author_name: "Marta K.",
        author_role: "Head of Marketing, SaaS Platform",
        quote: "SwiftLayer transformed our launch page into an editorial system that our team can update weekly without touching code.",
        sort: 10,
        status: "published",
      },
      {
        author_name: "Daniel R.",
        author_role: "CTO, Fintech Startup",
        quote: "The team introduced high-impact motion while keeping performance under control. We shipped on time with no regressions.",
        sort: 20,
        status: "published",
      },
    ],
  },
  {
    collection: "home_final_cta",
    icon: "campaign",
    note: "Final call to action section.",
    fields: [
      longTextField("title"),
      longTextField("body"),
      textField("primary_cta_label"),
      textField("primary_cta_href"),
      textField("secondary_cta_label"),
      textField("secondary_cta_href"),
      publishedStatusField(),
    ],
    publicFields: [
      "id",
      "title",
      "body",
      "primary_cta_label",
      "primary_cta_href",
      "secondary_cta_label",
      "secondary_cta_href",
      "status",
    ],
    seed: [
      {
        title: "Need a CMS-driven website that still feels custom and premium?",
        body: "Share your goals, timeline, and constraints. We will propose the smallest scope that protects speed, accessibility, and visual impact.",
        primary_cta_label: "Book Intro Call",
        primary_cta_href: "mailto:hello@swiftlayer.studio",
        secondary_cta_label: "Review Latest Insights",
        secondary_cta_href: "#insights",
        status: "published",
      },
    ],
  },
];

async function main() {
  loadEnvFile(ENV_PATH);

  const directusPort = process.env.DIRECTUS_PORT || "8055";
  const directusUrl = (process.env.DIRECTUS_URL || `http://localhost:${directusPort}`).replace(/\/$/, "");
  const adminEmail = process.env.DIRECTUS_ADMIN_EMAIL;
  const adminPassword = process.env.DIRECTUS_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("Missing DIRECTUS_ADMIN_EMAIL or DIRECTUS_ADMIN_PASSWORD in env.");
  }

  console.log(`Bootstrapping Directus at ${directusUrl}`);
  await waitForHealth(directusUrl);

  const accessToken = await login(directusUrl, adminEmail, adminPassword);

  const api = createApiClient({
    baseUrl: directusUrl,
    tokenProvider: () => accessToken,
  });

  for (const definition of collectionBlueprints) {
    await ensureCollection(api, definition);
    await ensureFields(api, definition.collection, definition.fields);
    await ensurePublicReadPermission(api, directusUrl, definition.collection, definition.publicFields);
    await seedCollection(api, definition.collection, definition.seed);
  }

  console.log("Directus bootstrap completed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bootstrap failed: ${message}`);
  process.exit(1);
});
