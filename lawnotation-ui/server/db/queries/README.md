# Named queries

Queries the server runs from more than one place, or that have a name worth
keeping, live here as typed TypeScript functions, grouped by the table they are
about. They replace the SQL functions the Supabase setup stored in the database
and called by name (`supabase.rpc("get_all_docs_from_task", …)`).

- Each function takes the client (`ctx.sql`, or a transaction) as its first
  argument and its parameters as plain arguments, and returns typed rows.
- Values are interpolated through postgres.js tagged templates, so they are
  always sent as bound parameters, never pasted into the SQL text.
- The SQL is versioned and reviewed with the code that calls it; the database
  only holds tables, constraints and indexes (`db/migrations`).

One-off queries can stay inline in their tRPC procedure.
