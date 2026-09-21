# Supabase

Execute `schema.sql` once in Supabase Studio > SQL Editor. The application accesses these tables only through the server using the `service_role` key.

The Google `sub` is stored as `users.google_sub`, which is the stable identifier used for the upsert. Email is kept as profile data and is not used as the primary identity.
