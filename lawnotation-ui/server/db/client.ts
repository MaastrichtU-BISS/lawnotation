import postgres from "postgres";

if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is not defined");

/**
 * The one database client of the server. Every query runs as the database
 * owner: authorization is done by the tRPC authorizers before a query runs,
 * there is no row level security to lean on.
 *
 * bigint columns (all ids, positions, counts) come back as JavaScript numbers,
 * as they did through PostgREST; postgres.js returns them as strings by
 * default, which would change the shape of every API response. Ids stay far
 * below 2^53.
 */
const sql = postgres(process.env.DATABASE_URL, {
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  types: {
    bigint: {
      to: 20,
      from: [20],
      serialize: (value: number | bigint | string) => String(value),
      parse: (value: string) => Number(value),
    },
  },
  transform: { undefined: null },
});

export type Sql = typeof sql;
export default sql;
