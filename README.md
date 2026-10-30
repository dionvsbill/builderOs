# BuilderOS

BuilderOS is a visual website, form and commerce builder SaaS.

## Current foundation

The repository now contains a Next.js 14 App Router application and an interactive editor shell. The editor currently supports inserting starter elements, selecting layers, inline text editing, editing text properties, reordering layers, and undo/redo. This is the first implementation slice—not a claim that persistence, publishing, SMTP delivery, billing or commerce are complete.

## Stack

- Next.js 14 / React 18 / TypeScript
- Tailwind CSS
- Zustand-ready client state architecture
- dnd-kit dependencies for the upcoming sortable canvas implementation
- Supabase planned for authentication, PostgreSQL and storage
- Nodemailer planned for server-side SMTP delivery
- Render Node Web Service deployment target

## Local development

Requires Node.js >=22 and <25.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validation

```bash
npm run typecheck
npm run build
```

## Supabase setup

The connected BuilderOS Supabase project is already provisioned. Its migrations 0001–0008 have been applied and the 14 public tables have Row Level Security enabled. Do not re-run the migrations against that live project.

For a separate development or staging project:

1. Create a Supabase project.
2. Apply the migrations in order:
   - `supabase/migrations/0001_initial_workspace_schema.sql`
   - `supabase/migrations/0002_forms_and_delivery.sql`
   - `supabase/migrations/0003_secure_workspace_onboarding.sql`
   - `supabase/migrations/0004_account_profile_privacy_lifecycle.sql`
   - `supabase/migrations/0005_allow_deletion_request_resubmission.sql`
   - `supabase/migrations/0006_security_performance_hardening.sql`
   - `supabase/migrations/0007_atomic_page_revision_saves.sql`
   - `supabase/migrations/0008_atomic_starter_workspace_creation.sql`
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project Connect dialog.
5. Set `SUPABASE_SERVICE_ROLE_KEY` only as a private server environment variable to enable account deletion. Never expose it to browser code or prefix it with `NEXT_PUBLIC_`.
6. In Supabase Authentication URL Configuration, set the Site URL to your app origin and add the local and production `/auth/callback` and `/reset-password` URLs to the allowed redirect URLs.
7. Enable email/password authentication and configure SMTP/email templates for confirmation and password recovery.

The account export endpoint streams a private JSON export for the authenticated user, including accessible profile, workspace, project, page, form and submission records. Uploaded binary files and external payment-provider records are not embedded.

The account deletion endpoint verifies the current password, refuses deletion while the user owns a workspace, removes private avatar files, and then deletes the Auth user. Configure the private service-role key in Render before enabling this endpoint.

## Product roadmap

1. Robust editor document model, sortable canvas, responsive properties and revision history.
2. Supabase authentication, workspace onboarding and project persistence/autosave.
3. Form builder, secure submission API and SMTP delivery queue.
4. Versioned publishing and multi-tenant domain routing.
5. Commerce, verified payments, plans and analytics.

## Deployment

Deploy as a Render Node Web Service. Use `npm install && npm run build` as the build command and `npm start` as the start command. Configure production environment variables in Render—not in committed files.
