# BuilderOS

BuilderOS is a visual website, form and commerce builder SaaS.

## Current foundation

The repository contains a Next.js 14 App Router application with Supabase authentication, workspace onboarding, profile/privacy controls, project creation, a sortable visual editor, authenticated cloud autosave, optimistic revision locking, revision snapshots and restore. It also includes a first form builder, hashed access keys, hosted public forms, server-validated submissions, rate limiting and a queued SMTP notification worker. Advanced visual editing, verified custom-domain/SSL provisioning, billing and commerce are still under development.

## Stack

- Next.js 14 / React 18 / TypeScript
- Tailwind CSS
- Zustand-ready client state architecture
- dnd-kit sortable canvas with drag reordering
- Supabase Auth, PostgreSQL, RLS and private avatar storage
- SMTP-backed form notification queue, retry worker, per-project encrypted SMTP settings and public form runtime
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

The connected BuilderOS Supabase project is already provisioned. Migrations 0001–0023 have been applied to the live project. Do not replay migrations against that project.

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
   - `supabase/migrations/0009_seed_initial_page_revisions.sql`
   - `supabase/migrations/0010_atomic_workspace_project_creation.sql`\n   - `supabase/migrations/0011_project_admin_preferences.sql`\n   - `supabase/migrations/0012_first_account_super_admin.sql`\n   - `supabase/migrations/0013_super_admin_app_metadata_claim.sql`\n   - `supabase/migrations/0014_form_runtime_rate_limits_and_job_claiming.sql`\n   - `supabase/migrations/0015_service_role_only_form_runtime_rpcs.sql`\n   - `supabase/migrations/0016_enforce_form_submission_caps_and_private_rate_limit_rls.sql`\n   - `supabase/migrations/0017_service_role_policy_for_private_form_rate_limits.sql`\n   - `supabase/migrations/0018_versioned_public_site_publishing.sql`\n   - `supabase/migrations/0019_atomic_project_snapshot_publishing.sql`\n   - `supabase/migrations/0020_per_project_encrypted_smtp_settings.sql`\n   - `supabase/migrations/0021_workspace_editor_page_deletion_policy.sql`\n   - `supabase/migrations/0023_publishing_rls_and_index_cleanup.sql`
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project Connect dialog.
5. Set `SUPABASE_SERVICE_ROLE_KEY` only as a private server environment variable. Public form rendering/submission, email queue processing, account deletion and platform metrics require it. Never expose it to browser code or prefix it with `NEXT_PUBLIC_`.
6. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` as private Render environment variables. Set a long random `CRON_SECRET`, `RATE_LIMIT_HASH_SECRET` and base64-encoded 32-byte `SMTP_ENCRYPTION_KEY` (generate with `openssl rand -base64 32`). A Render Cron Job should POST to `/api/email/worker` every minute with `Authorization: Bearer <CRON_SECRET>`; the endpoint is not public without that secret.\n7. In Supabase Authentication URL Configuration, set the Site URL to your app origin and add the local and production `/auth/callback` and `/reset-password` URLs to the allowed redirect URLs.
8. Enable email/password authentication and configure SMTP/email templates for confirmation and password recovery.

The account export endpoint streams a private JSON export for the authenticated user, including accessible profile, workspace, project, page, form and submission records. Uploaded binary files and external payment-provider records are not embedded.

The account deletion endpoint verifies the current password, refuses deletion while the user owns a workspace, removes private avatar files, and then deletes the Auth user. Configure the private service-role key in Render before enabling this endpoint.

## Product roadmap

1. Robust editor document model, sortable canvas, responsive properties and revision history.
2. Supabase authentication, workspace onboarding and project persistence/autosave.
3. Full form builder, secure public submission API, anti-abuse controls and SMTP delivery queue.
4. Versioned public site publishing, route rendering and multi-page management are implemented; custom-domain verification and automated SSL provisioning remain.
5. Commerce, verified payments, plans and analytics.

## Deployment

Deploy as a Render Node Web Service. Use `npm install && npm run build` as the build command and `npm start` as the start command. Configure production environment variables in Render—not in committed files.
