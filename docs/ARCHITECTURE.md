# BuilderOS architecture

## Product boundaries

BuilderOS consists of four independently deployable concerns:

1. **Studio application** — authenticated dashboard and visual editor.
2. **Content runtime** — safely renders published site documents.
3. **Form delivery service** — validates submissions, stores records and queues email/webhook delivery.
4. **Commerce and billing** — catalog, cart, orders, verified payment webhooks and subscription entitlements.

The first release is a modular Next.js application. Keep server-only integrations behind server modules and route handlers so the form delivery or publishing workload can be separated later without changing the editor document format.

## Initial implementation decisions

- Next.js 14 App Router, React 18 and strict TypeScript.
- PostgreSQL/Supabase as the source of truth for users, workspaces, projects, pages, forms and submissions.
- A versioned JSON document tree for editable pages. Components are allow-listed typed nodes, never arbitrary executable React or server code.
- DOM-based canvas rendering. The editor selects and manipulates real rendered elements; it is not a screenshot-based canvas.
- dnd-kit for sortable and draggable interactions. Editor state and document serialization remain independent of the drag library.
- Zustand for client editor state; server persistence is a separate concern.
- Autosave uses debounce, document revision numbers and optimistic concurrency checks. Failed saves retain a local recovery copy.
- Published pages render from immutable published revisions, not directly from mutable editor state.
- SMTP delivery is asynchronous relative to submission persistence. A valid submission remains stored if email delivery fails.

## First vertical slice

1. Create a project and a page document.
2. Add, select, edit and reorder allow-listed blocks.
3. Save and load a document from Supabase.
4. Publish an immutable page revision.
5. Create a form definition and render it publicly.
6. Validate and persist a submission.
7. Queue an owner notification and record delivery attempts.

## Data model direction

Core tables: profiles, workspaces, workspace_members, projects, pages, page_revisions, forms, form_submissions, submission_files, email_delivery_jobs, domains, products, orders, order_items, subscriptions, usage_events and audit_logs.

Every tenant-owned row carries a workspace_id. RLS policies verify workspace membership; service-role operations are server-only and must still validate the requested tenant and resource.

## Security boundaries

- Never expose Supabase service-role, SMTP, payment secret or webhook signing keys to the browser.
- Validate all editor documents against a versioned schema before saving or publishing.
- Sanitize or disallow unsafe custom HTML. Do not execute customer-authored scripts in the studio origin.
- Form access keys are random, revocable identifiers; apply rate limits, payload limits, field validation and abuse controls.
- Verify Paystack/Stripe webhook signatures and reconcile payment state server-side.
- Prevent SSRF in webhook URL testing and remote image import.
- Use signed, short-lived upload URLs and strict storage policies.

## Render deployment

Run the Next.js application as a Node Web Service, not a static export. Initial commands:

- Build: `npm install && npm run build`
- Start: `npm start`
- Node: `>=20.10.0 <25`

Supabase supplies the managed database/auth/storage. SMTP must be an externally reachable authenticated relay or a separately operated mail server; do not assume Render provides Postfix. Long-running jobs should use a durable queue/worker design rather than relying on a request staying open.

## Phased delivery

- Phase 1: application shell and editor interaction model.
- Phase 2: Supabase schema, auth, projects, page persistence and autosave.
- Phase 3: complete editor controls, responsive styles, reusable sections and version history.
- Phase 4: forms, submissions, upload policy and email queue.
- Phase 5: public rendering, publishing revisions and domains.
- Phase 6: commerce and verified payments.
- Phase 7: plans, analytics, observability, accessibility and hardening.

Each phase must pass typecheck, production build and relevant automated tests before being called complete.
