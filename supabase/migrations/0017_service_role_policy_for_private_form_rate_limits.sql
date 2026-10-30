create policy "service role manages private form rate limits"
on private.form_submission_rate_limits
for all
to service_role
using (true)
with check (true);