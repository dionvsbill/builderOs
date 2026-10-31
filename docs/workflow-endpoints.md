# BuilderOS workflow endpoints

## Public endpoint

POST /api/workflows/{type}/{accessKey}

Supported types: contact, booking, registration, newsletter, application, custom.

The access key is the public key of an existing published BuilderOS form. The endpoint hashes the key and looks up the published form. The raw key is not stored in the database.

Example JSON body:

{
  "values": {
    "full_name": "Ama Mensah",
    "email": "ama@example.com",
    "message": "Please contact me about your services."
  }
}

Field keys must match field IDs or labels in the published form schema. The endpoint validates required fields, email format, numeric values, select options, request size and rate limits. A non-empty website honeypot returns a successful no-op response.

## Configure the form

Set forms.settings.workflow_type to contact, booking, registration, newsletter, application or custom. Forms without this setting are treated as custom. A form explicitly configured for a workflow type cannot be submitted through a different type.

To queue owner email notifications, set:
- settings.notification_enabled = true
- settings.notification_email = the owner's notification address
- settings.success_message = the visitor confirmation message (optional)

Submissions are saved in form_submissions. Owner notifications are queued in email_delivery_jobs. Delivery requires the existing BuilderOS email worker to be running and SMTP configured.

## Published form block

Add a form block to the page. Its content must include a human-readable intro, followed by workflow and access key parameters separated by a pipe. Example:

Contact our team|workflow=contact&accessKey=YOUR_PUBLISHED_FORM_ACCESS_KEY

The current published renderer displays a contact-style form with name, email, phone and message fields. For a different schema, configure the fields to match those field IDs or labels.

## Current scope and important boundaries

Booking requests are recorded as submissions; this endpoint does not yet reserve calendar inventory, prevent overlapping appointments or synchronize an external calendar. Registration is a form submission, not a visitor login/account provisioning flow. Newsletter opt-in currently records a submission; it does not yet implement unsubscribe, double opt-in or campaign delivery. Application file uploads are not enabled here. Payments must use server-side verified provider webhooks and are not performed by this endpoint.

Never expose SMTP passwords, service-role keys or private provider credentials in browser code.
