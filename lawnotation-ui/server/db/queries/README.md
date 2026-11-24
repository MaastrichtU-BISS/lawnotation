# Named queries

The server's SQL lives here, as typed TypeScript functions grouped by the table
or feature they are about. tRPC procedures, authorizers and utils call these
functions and keep only input validation, authorization, error handling and
response shaping. They replace both the SQL functions the Supabase setup stored
in the database and called by name (`supabase.rpc("get_all_docs_from_task", …)`)
and the supabase-js query builder calls.

- Each function takes the client (`ctx.sql`, or a transaction) as its first
  argument and its parameters as plain arguments, and returns typed rows.
- Values are interpolated through postgres.js tagged templates, so they are
  always sent as bound parameters, never pasted into the SQL text.
- The SQL is versioned and reviewed with the code that calls it; the database
  only holds tables, constraints and indexes (`db/migrations`).

- Shared building blocks are in `helpers.ts`: `one` (exactly one row),
  `matching` (`and column = value` per field), `range`, `columnsOf` and
  `insertRows` (chunked multi-row insert returning rows in order).
- Modules import only types (`import type`) from `~/types` and `~/utils/enums`,
  so they stay free of runtime dependencies on the rest of the app.

The one exception is `server/trpc/routers/table.router.ts`: its table
definitions are declarative (a source table, joins, filter and search columns)
and the router builds the paged query from them.
