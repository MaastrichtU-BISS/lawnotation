import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import type { Labelset } from "~/types";
import { labelsetEditorOrAnnotatorAuthorizer } from "../authorizers";
import { validateLabelset } from "vue-labelset-editor/model";
import { lockedNamesChanged } from "~/server/utils/labelset_lock";
import type { Context } from "../context";

const ZLabelsetFields = z.object({
  name: z.string(),
  desc: z.string(),
  // editor_id: z.string(),
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
    })
  ),
  relation_labels: z.array(z.string()).nullable().optional(),
});

function assertValid(labelset: z.infer<typeof ZLabelsetFields>) {
  const issues = validateLabelset(labelset);
  if (issues.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: issues.map((i) => (i.index === undefined ? i.message : `${i.field} ${i.index + 1}: ${i.message}`)).join("; "),
    });
}

// The one row a query must return, as PostgREST's .single() demanded.
function one<T>(rows: readonly T[]): T {
  if (rows.length !== 1) throw new Error(`expected one row, found ${rows.length}`);
  return rows[0]!;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

type LabelsetUpdates = Partial<z.infer<typeof ZLabelsetFields>>;

// labels is a jsonb column: an array must reach it as JSON, not as a
// Postgres array.
function columnValues(sql: Context["sql"], fields: LabelsetUpdates) {
  const values: Record<string, unknown> = { ...fields };
  if (fields.labels) values.labels = sql.json(fields.labels as any);
  return values;
}

export const labelsetRouter = router({
  /* General Crud Definitions */
  find: protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZLabelsetFields.partial().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sql = ctx.sql;
      const matches = Object.entries(columnValues(sql, input.filter ?? {}))
        .filter(([, value]) => value !== undefined)
        .map(([column, value]) =>
          value === null ? sql`AND ${sql(column)} IS NULL` : sql`AND ${sql(column)} = ${value as any}`
        );
      const range = input.range
        ? sql`LIMIT ${Math.max(input.range[1] - input.range[0] + 1, 0)} OFFSET ${input.range[0]}`
        : sql``;

      try {
        const rows = await sql<Labelset[]>`
          SELECT * FROM labelsets
          WHERE editor_id = ${ctx.user.id} ${matches.length ? matches : sql``}
          ${range}
        `;
        return rows as Labelset[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.find: ${message(error)}`,
        });
      }
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        labelsetEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      try {
        return one(await ctx.sql<Labelset[]>`SELECT * FROM labelsets WHERE id = ${id}`);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.findById: ${message(error)}`,
        });
      }
    }),

  create: protectedProcedure
    .input(ZLabelsetFields)
    .mutation(async ({ ctx, input }) => {
      assertValid(input);
      const row: Record<string, unknown> = { ...columnValues(ctx.sql, input), editor_id: ctx.user.id };
      try {
        return one(
          await ctx.sql<Labelset[]>`
            INSERT INTO labelsets ${ctx.sql(row, ...Object.keys(row))}
            RETURNING *
          `
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.create: ${message(error)}`,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZLabelsetFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.sql<z.infer<typeof ZLabelsetFields>[]>`
        SELECT name, "desc", labels, relation_labels FROM labelsets
        WHERE id = ${input.id} AND editor_id = ${ctx.user.id}
      `;
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const before = current as z.infer<typeof ZLabelsetFields>;
      const after = { ...before, ...input.updates };
      assertValid(after);

      const [{ count }] = await ctx.sql<[{ count: number }]>`
        SELECT count(*)::int AS count FROM tasks
        WHERE labelset_id = ${input.id} OR document_labelset_id = ${input.id}
      `;
      const locked = count ? lockedNamesChanged(before, after) : null;
      if (locked) throw new TRPCError({ code: "BAD_REQUEST", message: locked });

      const values = columnValues(ctx.sql, input.updates);
      const columns = Object.keys(values).filter((column) => values[column] !== undefined);
      try {
        return one(
          columns.length
            ? await ctx.sql<Labelset[]>`
                UPDATE labelsets SET ${ctx.sql(values, ...columns)}
                WHERE id = ${input.id} AND editor_id = ${ctx.user.id}
                RETURNING *
              `
            : await ctx.sql<Labelset[]>`
                SELECT * FROM labelsets WHERE id = ${input.id} AND editor_id = ${ctx.user.id}
              `
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.update: ${message(error)}`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.sql`DELETE FROM labelsets WHERE id = ${input} AND editor_id = ${ctx.user.id}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.delete: ${message(error)}`,
        });
      }
      return true;
    }),
});

export type LabelsetRouter = typeof labelsetRouter;
