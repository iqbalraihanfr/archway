import type { ProjectBriefFields } from "@/components/editors/ProjectBriefEditor";

export type ContentTemplateKey =
  | "blank"
  | "saas"
  | "ecommerce"
  | "internal_tool"
  | "api_service"
  | "mobile_app";

export type ContentTemplate = {
  key: ContentTemplateKey;
  label: string;
  description: string;
  emoji: string;
  brief: Omit<ProjectBriefFields, "name">;
  /** Structured fields for Requirements node (items array) */
  requirements?: { items: RequirementItem[] };
  /** Structured fields for ERD node */
  erd?: { entities: ERDTemplateEntity[]; relationships: ERDTemplateRel[] };
  /** Mermaid code for diagram nodes (mermaid_manual) */
  mermaid?: {
    flowchart?: string;
    sequence?: string;
    dfd?: string;
  };
};

// ── Lightweight types (avoid circular imports from editor hooks) ───────────────

export type RequirementItem = {
  id: string;
  type: "FR" | "NFR";
  description: string;
  priority: "Must" | "Should" | "Could";
  category: string;
  related_scope?: string;
  metric?: string;
  target?: string;
};

export type ERDTemplateAttribute = {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  isRequired?: boolean;
  isIndex?: boolean;
  description?: string;
};

export type ERDTemplateEntity = {
  id: string;
  name: string;
  description?: string;
  attributes: ERDTemplateAttribute[];
};

export type ERDTemplateRel = {
  id: string;
  from: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  label?: string;
};

// ── Template data ─────────────────────────────────────────────────────────────

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // ── Blank ──────────────────────────────────────────────────────────────────
  {
    key: "blank",
    label: "Blank",
    description: "Start fresh — fill everything manually.",
    emoji: "📄",
    brief: {},
  },

  // ── SaaS Web App ───────────────────────────────────────────────────────────
  {
    key: "saas",
    label: "SaaS Web App",
    description: "Subscription-based web platform with user management.",
    emoji: "🚀",
    brief: {
      background:
        "Build a subscription-based web platform that solves a recurring workflow problem for business teams.",
      objectives: [
        "Deliver a self-service onboarding flow that requires no human support",
        "Achieve sub-2s page load for all core user journeys",
        "Support multi-tenancy with isolated data per organization",
        "Implement usage-based billing tied to actual feature consumption",
      ],
      target_users: ["Admin User", "Team Member", "Billing Owner"],
      scope_in: [
        "User authentication and authorization (RBAC)",
        "Subscription and billing management",
        "Core product feature set (MVP)",
        "Admin dashboard with usage analytics",
        "Email notifications and alerts",
      ],
      scope_out: [
        "Mobile native apps (web-only for v1)",
        "Enterprise SSO/SAML integration",
        "White-labeling and custom domains",
      ],
      success_metrics: [
        { metric: "Onboarding completion rate", target: "> 70%" },
        { metric: "Monthly churn rate", target: "< 5%" },
        { metric: "Page load time (P95)", target: "< 2s" },
      ],
      constraints: [
        "Must comply with GDPR and data residency requirements",
        "Launch within a fixed timeline — no scope creep after kickoff",
        "Initial budget limits infrastructure to managed cloud services",
      ],
      tech_stack: ["Next.js", "PostgreSQL", "Tailwind CSS", "Stripe", "Resend"],
    },
    requirements: {
      items: [
        { id: "saas-fr1", type: "FR", description: "User registration with email and password", priority: "Must", category: "Authentication", related_scope: "User authentication and authorization (RBAC)" },
        { id: "saas-fr2", type: "FR", description: "Email verification after registration", priority: "Must", category: "Authentication", related_scope: "User authentication and authorization (RBAC)" },
        { id: "saas-fr3", type: "FR", description: "User login and logout with session management", priority: "Must", category: "Authentication", related_scope: "User authentication and authorization (RBAC)" },
        { id: "saas-fr4", type: "FR", description: "Role-based access control (Admin, Member, Viewer)", priority: "Must", category: "Authorization", related_scope: "User authentication and authorization (RBAC)" },
        { id: "saas-fr5", type: "FR", description: "Subscription plan selection on onboarding", priority: "Must", category: "Billing", related_scope: "Subscription and billing management" },
        { id: "saas-fr6", type: "FR", description: "Stripe payment integration for plan upgrades and renewals", priority: "Must", category: "Billing", related_scope: "Subscription and billing management" },
        { id: "saas-fr7", type: "FR", description: "Billing history and invoice download", priority: "Should", category: "Billing", related_scope: "Subscription and billing management" },
        { id: "saas-fr8", type: "FR", description: "Core product dashboard with usage metrics", priority: "Must", category: "Core Product", related_scope: "Core product feature set (MVP)" },
        { id: "saas-fr9", type: "FR", description: "Team workspace creation and member invitation by email", priority: "Should", category: "Collaboration", related_scope: "Core product feature set (MVP)" },
        { id: "saas-fr10", type: "FR", description: "Admin panel: user list, plan management, and manual overrides", priority: "Should", category: "Admin", related_scope: "Admin dashboard with usage analytics" },
        { id: "saas-fr11", type: "FR", description: "Email notifications for billing events (renewal, failure, cancellation)", priority: "Should", category: "Notifications", related_scope: "Email notifications and alerts" },
        { id: "saas-nfr1", type: "NFR", description: "Page load time P95 must be under 2 seconds", priority: "Must", category: "Performance", metric: "P95 page load", target: "< 2s" },
        { id: "saas-nfr2", type: "NFR", description: "API response time P99 under 200ms for read endpoints", priority: "Should", category: "Performance", metric: "P99 API response", target: "< 200ms" },
        { id: "saas-nfr3", type: "NFR", description: "System uptime SLA of 99.9% per month", priority: "Must", category: "Availability", metric: "Monthly uptime", target: "> 99.9%" },
        { id: "saas-nfr4", type: "NFR", description: "GDPR-compliant data handling including right to erasure", priority: "Must", category: "Security", metric: "Compliance", target: "Full GDPR" },
        { id: "saas-nfr5", type: "NFR", description: "All authenticated routes protected by JWT with short expiry", priority: "Must", category: "Security", metric: "Token expiry", target: "≤ 15 min access token" },
      ],
    },
    erd: {
      entities: [
        {
          id: "saas-e1", name: "USERS", description: "Platform user accounts",
          attributes: [
            { name: "id", type: "UUID", isPrimaryKey: true, isRequired: true },
            { name: "email", type: "VARCHAR(255)", isUnique: true, isRequired: true },
            { name: "name", type: "VARCHAR(255)", isRequired: true },
            { name: "password_hash", type: "VARCHAR(255)", isRequired: true },
            { name: "email_verified", type: "BOOLEAN", isNullable: true },
            { name: "created_at", type: "TIMESTAMP", isRequired: true },
          ],
        },
        {
          id: "saas-e2", name: "PLANS", description: "Available subscription plans",
          attributes: [
            { name: "id", type: "UUID", isPrimaryKey: true, isRequired: true },
            { name: "name", type: "VARCHAR(100)", isRequired: true },
            { name: "price_monthly", type: "DECIMAL(10,2)", isRequired: true },
            { name: "price_yearly", type: "DECIMAL(10,2)", isNullable: true },
            { name: "max_seats", type: "INTEGER", isRequired: true },
            { name: "stripe_price_id", type: "VARCHAR(255)", isUnique: true },
          ],
        },
        {
          id: "saas-e3", name: "WORKSPACES", description: "Tenant organizations",
          attributes: [
            { name: "id", type: "UUID", isPrimaryKey: true, isRequired: true },
            { name: "name", type: "VARCHAR(255)", isRequired: true },
            { name: "owner_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "plan_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "created_at", type: "TIMESTAMP", isRequired: true },
          ],
        },
        {
          id: "saas-e4", name: "WORKSPACE_MEMBERS", description: "Users belonging to a workspace",
          attributes: [
            { name: "id", type: "UUID", isPrimaryKey: true, isRequired: true },
            { name: "workspace_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "user_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "role", type: "VARCHAR(50)", isRequired: true },
            { name: "joined_at", type: "TIMESTAMP", isRequired: true },
          ],
        },
        {
          id: "saas-e5", name: "SUBSCRIPTIONS", description: "Active billing subscriptions per workspace",
          attributes: [
            { name: "id", type: "UUID", isPrimaryKey: true, isRequired: true },
            { name: "workspace_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "plan_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "status", type: "VARCHAR(50)", isRequired: true },
            { name: "current_period_start", type: "TIMESTAMP", isRequired: true },
            { name: "current_period_end", type: "TIMESTAMP", isRequired: true },
            { name: "stripe_subscription_id", type: "VARCHAR(255)", isUnique: true },
          ],
        },
        {
          id: "saas-e6", name: "PAYMENTS", description: "Payment transaction records",
          attributes: [
            { name: "id", type: "UUID", isPrimaryKey: true, isRequired: true },
            { name: "subscription_id", type: "UUID", isForeignKey: true, isRequired: true },
            { name: "amount", type: "DECIMAL(10,2)", isRequired: true },
            { name: "currency", type: "VARCHAR(3)", isRequired: true },
            { name: "status", type: "VARCHAR(50)", isRequired: true },
            { name: "paid_at", type: "TIMESTAMP", isNullable: true },
            { name: "stripe_payment_intent_id", type: "VARCHAR(255)", isUnique: true },
          ],
        },
      ],
      relationships: [
        { id: "saas-r1", from: "WORKSPACES", to: "USERS", type: "many-to-one", label: "owned by" },
        { id: "saas-r2", from: "WORKSPACES", to: "PLANS", type: "many-to-one", label: "on plan" },
        { id: "saas-r3", from: "WORKSPACE_MEMBERS", to: "WORKSPACES", type: "many-to-one", label: "belongs to" },
        { id: "saas-r4", from: "WORKSPACE_MEMBERS", to: "USERS", type: "many-to-one", label: "is user" },
        { id: "saas-r5", from: "SUBSCRIPTIONS", to: "WORKSPACES", type: "many-to-one", label: "for workspace" },
        { id: "saas-r6", from: "SUBSCRIPTIONS", to: "PLANS", type: "many-to-one", label: "on plan" },
        { id: "saas-r7", from: "PAYMENTS", to: "SUBSCRIPTIONS", type: "many-to-one", label: "for subscription" },
      ],
    },
    mermaid: {
      flowchart: `flowchart TD
    A([User Visits Landing Page]) --> B[Clicks Sign Up]
    B --> C[Fill Registration Form]
    C --> D{Form Valid?}
    D -- No --> C
    D -- Yes --> E[Create Account in DB]
    E --> F[Send Verification Email]
    F --> G[User Clicks Verify Link]
    G --> H{Token Valid?}
    H -- No --> I[Show Error & Resend Option]
    H -- Yes --> J[Mark Email Verified]
    J --> K[Redirect to Onboarding]
    K --> L[Select Subscription Plan]
    L --> M[Enter Payment Details]
    M --> N{Payment Success?}
    N -- No --> O[Show Payment Error]
    O --> M
    N -- Yes --> P[Create Workspace]
    P --> Q([Dashboard — Ready!])`,
      sequence: `sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Stripe
    participant Database

    User->>Frontend: Select plan & enter card details
    Frontend->>Backend: POST /api/subscriptions/checkout
    Backend->>Stripe: Create PaymentIntent
    Stripe-->>Backend: PaymentIntent client_secret
    Backend-->>Frontend: Return client_secret
    Frontend->>Stripe: Confirm payment (Stripe.js)
    Stripe-->>Frontend: Payment confirmed
    Frontend->>Backend: POST /api/subscriptions/confirm
    Backend->>Stripe: Verify payment status
    Stripe-->>Backend: Payment succeeded
    Backend->>Database: Create subscription record
    Backend->>Database: Update workspace plan
    Backend-->>Frontend: Subscription active
    Frontend-->>User: Redirect to dashboard`,
      dfd: `graph LR
    U[User] -->|Register / Login| Auth((Auth Service))
    Auth -->|JWT Token| U
    U -->|API Request + JWT| API((API Gateway))
    API -->|Validate Token| Auth
    API -->|Read / Write| DB[(Database)]
    API -->|Payment Request| Stripe[Stripe]
    Stripe -->|Webhook Event| API
    API -->|Send Email| Email[Email Service]
    Email -->|Notification| U`,
    },
  },

  // ── E-Commerce ─────────────────────────────────────────────────────────────
  {
    key: "ecommerce",
    label: "E-Commerce / Toko Online",
    description: "Online store with product catalog, cart, and checkout.",
    emoji: "🛒",
    brief: {
      background:
        "Create an online store that allows the business to sell products directly to customers with full order management.",
      objectives: [
        "Enable end-to-end purchase flow from product discovery to payment confirmation",
        "Give store admins full control over products, inventory, and orders",
        "Provide customers with real-time order tracking",
        "Integrate with at least one local payment gateway",
      ],
      target_users: ["Customer / Buyer", "Store Admin", "Warehouse Staff"],
      scope_in: [
        "Product catalog with categories and search",
        "Shopping cart and wishlist",
        "Checkout with payment gateway integration",
        "Order management and status tracking",
        "Basic CMS for homepage banners and promotions",
        "Inventory management",
      ],
      scope_out: [
        "Multi-vendor marketplace functionality",
        "Physical POS integration",
        "Loyalty points and rewards system",
      ],
      success_metrics: [
        { metric: "Cart-to-checkout conversion", target: "> 60%" },
        { metric: "Checkout completion rate", target: "> 80%" },
        { metric: "Average page load time", target: "< 3s" },
      ],
      constraints: [
        "Payment gateway must support local currency and bank transfers",
        "Must handle peak traffic during promotions (10x normal load)",
        "Product images must be optimized for mobile bandwidth",
      ],
      tech_stack: ["Next.js", "PostgreSQL", "Midtrans / Xendit", "Cloudinary", "Tailwind CSS"],
    },
  },

  // ── Internal Tool ──────────────────────────────────────────────────────────
  {
    key: "internal_tool",
    label: "Internal Tool / Dashboard",
    description: "Company dashboard for operations, HR, or inventory management.",
    emoji: "🏢",
    brief: {
      background:
        "Replace manual spreadsheet workflows with a centralized internal system that gives operations teams real-time visibility and control.",
      objectives: [
        "Centralize all operational data into a single source of truth",
        "Reduce manual data entry errors by automating key workflows",
        "Give managers real-time reporting without waiting for manual reports",
        "Support role-based access so each team sees only relevant data",
      ],
      target_users: ["Operations Manager", "Staff / Data Entry", "Supervisor / Approver", "Executive (read-only)"],
      scope_in: [
        "Core data management (CRUD for main entities)",
        "Role-based access control",
        "Dashboard with KPIs and charts",
        "Approval workflows",
        "Export to Excel/PDF",
        "Audit log for all changes",
      ],
      scope_out: [
        "Customer-facing portal",
        "Mobile app (desktop-first for v1)",
        "Third-party ERP integration",
      ],
      success_metrics: [
        { metric: "Manual data entry time reduction", target: "> 50%" },
        { metric: "Report generation time", target: "< 30 seconds" },
        { metric: "System uptime", target: "> 99.5%" },
      ],
      constraints: [
        "Must run on company intranet or private cloud",
        "Legacy data migration from existing spreadsheets required",
        "Must support concurrent users during business hours",
      ],
      tech_stack: ["Next.js", "PostgreSQL", "Tailwind CSS", "NextAuth", "Prisma"],
    },
  },

  // ── REST API ───────────────────────────────────────────────────────────────
  {
    key: "api_service",
    label: "REST API / Backend Service",
    description: "Standalone API service consumed by web and mobile clients.",
    emoji: "⚡",
    brief: {
      background:
        "Build a standalone, scalable API service that acts as the single backend for multiple client applications.",
      objectives: [
        "Provide a well-documented, versioned REST API",
        "Achieve p99 response time under 200ms for all read endpoints",
        "Implement stateless authentication using JWT",
        "Ensure horizontal scalability with no single point of failure",
      ],
      target_users: ["Frontend Developer (internal)", "Mobile Developer (internal)", "Third-party Integration Partner"],
      scope_in: [
        "RESTful API endpoints with OpenAPI/Swagger docs",
        "JWT authentication and refresh token flow",
        "Rate limiting and request throttling",
        "Input validation and structured error responses",
        "Database migrations and seed scripts",
        "Health check and metrics endpoints",
      ],
      scope_out: [
        "Frontend UI (API-only project)",
        "Real-time WebSocket features (future phase)",
        "Background job processing",
      ],
      success_metrics: [
        { metric: "API response time (P99)", target: "< 200ms" },
        { metric: "API uptime", target: "> 99.9%" },
        { metric: "Test coverage", target: "> 80%" },
      ],
      constraints: [
        "Must be stateless to support horizontal scaling",
        "All endpoints must be versioned from day one",
        "API keys and secrets must never be logged",
      ],
      tech_stack: ["Node.js / Fastify", "PostgreSQL", "Redis", "Docker", "JWT"],
    },
  },

  // ── Mobile App ─────────────────────────────────────────────────────────────
  {
    key: "mobile_app",
    label: "Mobile App",
    description: "Cross-platform mobile app for iOS and Android.",
    emoji: "📱",
    brief: {
      background:
        "Deliver a mobile-first experience that lets users access core product features on the go, with offline support for key workflows.",
      objectives: [
        "Launch on both iOS and Android from a single codebase",
        "Enable offline-first workflows for field users with poor connectivity",
        "Achieve app store rating of 4+ stars within 3 months of launch",
        "Keep app size under 50MB for fast downloads",
      ],
      target_users: ["End User (consumer)", "Field Staff", "Admin (via web, not mobile)"],
      scope_in: [
        "Core feature set (parity with web MVP)",
        "Push notifications",
        "Offline mode with background sync",
        "Biometric authentication (fingerprint/Face ID)",
        "Camera and file upload integration",
      ],
      scope_out: [
        "Admin/management features (web-only)",
        "Tablet-optimized layout (phone-first for v1)",
        "Apple Watch / wearable support",
      ],
      success_metrics: [
        { metric: "App store rating", target: "> 4.0 stars" },
        { metric: "Crash-free session rate", target: "> 99%" },
        { metric: "Day-7 user retention", target: "> 40%" },
      ],
      constraints: [
        "Must pass App Store and Google Play review guidelines",
        "Target minimum OS: iOS 15, Android 10",
        "Binary size must stay under 50MB",
      ],
      tech_stack: ["React Native", "Expo", "TypeScript", "SQLite (offline)", "Firebase"],
    },
  },
];

export function getContentTemplate(key: ContentTemplateKey): ContentTemplate {
  return CONTENT_TEMPLATES.find((t) => t.key === key) ?? CONTENT_TEMPLATES[0];
}
