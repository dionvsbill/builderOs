# Form submission and email delivery contract

## Public endpoint

`POST /api/submit/:access_key` accepts JSON or multipart form data. The URL key is generated with a cryptographically secure random generator and is displayed only once at creation; persist only a SHA-256 digest in `forms.access_key_hash`.

### Processing sequence

1. Enforce request body, field count, file count and file-size limits before parsing large payloads.
2. Hash the presented key and find an active published form using a constant-time-safe comparison strategy.
3. Apply IP and form-level rate limits; verify honeypot and optional CAPTCHA token.
4. Validate submitted fields against the stored, versioned form schema on the server. Never trust client-side validation.
5. Persist the submission and file metadata. Upload files to a private Supabase Storage bucket using server-generated paths.
6. Insert email delivery jobs in the same database transaction as the submission where possible.
7. Return a stable submission ID and accepted status. Do not wait for SMTP delivery before acknowledging a successfully stored submission.
8. A worker claims due jobs, sends through configured SMTP using Nodemailer, records message ID and outcome, and retries transient errors with exponential backoff.

## Response shape

Success: `{ "ok": true, "submission_id": "uuid", "message": "Submission received" }`

Validation error: `{ "ok": false, "error": "validation_failed", "fields": { "email": "Enter a valid email address" } }`

Invalid, revoked or paused key: return a generic not-found response so keys cannot be enumerated.

## Email security

- SMTP credentials and sender identity are server-only environment variables.
- Validate and normalize recipient addresses; prevent header injection.
- Do not allow arbitrary sender/from addresses supplied by submitters. Use a verified platform sender and set reply-to only from validated form data.
- Escape user-submitted content in HTML email templates.
- Limit attachment size and MIME types; never trust filename extensions alone.
- Log delivery metadata, not secrets or full sensitive form payloads.
- Use idempotency keys or unique job identifiers to prevent duplicate sends.
- SMTP delivery is best-effort and must not roll back a persisted submission.

## Required environment

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

The platform must be configured with a real authenticated SMTP relay. A Postfix-ready integration can be supported, but Render does not automatically provide an outbound Postfix server.
