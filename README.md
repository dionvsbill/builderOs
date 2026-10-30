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

Requires Node.js >=20.10 and <25.

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

## Environment

Copy `.env.example` to `.env.local` and add credentials only when the corresponding backend integration is implemented. Never expose service-role, SMTP, Paystack secret or Stripe secret keys in browser code.

## Product roadmap

1. Robust editor document model, sortable canvas, responsive properties and revision history.
2. Supabase authentication, project persistence and autosave.
3. Form builder, secure submission API and SMTP delivery queue.
4. Versioned publishing and multi-tenant domain routing.
5. Commerce, verified payments, plans and analytics.

## Deployment

Deploy as a Render Node Web Service. Use `npm install && npm run build` as the build command and `npm start` as the start command. Configure production environment variables in Render—not in committed files.
