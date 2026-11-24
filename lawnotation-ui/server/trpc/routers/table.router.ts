import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import type { Context } from '~/server/trpc/context';
import { projectEditorAuthorizer, taskEditorAuthorizer, type AuthorizerDefinition } from '../authorizers';
import type postgres from 'postgres';
import type { Sql } from '~/server/db/client';
import { TRPCForbidden } from '../errors';

type Fragment = postgres.Fragment;

/**
 * A table read from one database table, aliased `t`. Plain column names in
 * filters, search and sort refer to columns of `t`; dotted names (as the
 * table columns on the client use them, e.g. "document.name") must be listed
 * in `fields`.
 */
type SqlDataSource = {
    type: "sql_table",
    from: string,
    // The select list; `t.*` when left out.
    select?: (sql: Sql, ctx: Context) => Fragment,
    joins?: (sql: Sql) => Fragment,
    // Conditions the server always adds.
    where?: (sql: Sql, ctx: Context) => Fragment,
    fields?: Record<string, (sql: Sql) => Fragment>,
    search_columns?: Record<string, string[]>,
    // filter can be defined on server (like user_id) and on client (like project_id)
    filter?: object | (( { ctx }: { ctx: Context } ) => object),

    authorizer?: {
      filter_key: string,
      resolver: AuthorizerDefinition
    }
  }

type TableDataSource =
  & SqlDataSource;
  // | {
  //     type: "supabase_rpc";
  //     func: string;
  //     args?: object;
  //   }
  // | {
  //     type: "custom";
  //   };

const createTableProcedure = <T>(source: TableDataSource) => protectedProcedure
  .input(
    z.object({
      sort: z.object({
        column: z.string().nullable(),
        dir: z.union([z.literal('ASC'), z.literal('DESC')])
      }).default({column: null, dir: 'ASC'}),
      search: z.object({
        column: z.string().nullable().optional(),
        query: z.string()
      }).default({query: ""}),

      filter: z.record(z.string(), z.any()).optional(),
      or: z.string().optional(),

      page: z.number().min(1).default(1),
      items_per_page: z.number().default(10)
    })
  )
  .output(
    z.object({
      rows: z.array(z.any()),
      total: z.number()
    })
  )
  .query(async ({ ctx, input }) => {

    const offset = (input.page - 1) * input.items_per_page;
    const limit = input.items_per_page;

    // let data;
    // let total;
    switch (source.type) {
      case "sql_table": {

        if (source.authorizer != undefined) {
          if (!input.filter)
            throw Error("Table uses authorization but no filter is provided")
          if (!(source.authorizer.filter_key in input.filter))
            throw Error("Table requires authorization but key is not found in filter")

          const authorizerResult = await source.authorizer.resolver(input.filter[source.authorizer.filter_key], ctx.user.id, ctx)
          if (!authorizerResult)
            throw TRPCForbidden()
        }

        const filter: Record<string, any> = {
          ...input.filter,                          // first, lower prioirity, is the input filter
          ...(typeof source.filter === "function"   // secondly, the server-configured filter is merged
            ? source.filter({ctx})
            : source.filter) ?? {},
        }

        const sql = ctx.sql;

        // A column of `t`, or one of the source's dotted fields.
        const field = (name: string): Fragment => {
          if (name.includes(".")) {
            const f = source.fields?.[name];
            if (!f)
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Error in tablequery from ${source.from}: unknown column ${name}`
              });
            return f(sql);
          }
          return sql`t.${sql(name)}`;
        };

        const conds: Fragment[] = [];
        if (source.where) conds.push(source.where(sql, ctx));
        for (const [key, value] of Object.entries(filter)) {
          if (value === undefined) continue;
          conds.push(sql`${field(key)} = ${value}`);
        }

        if (input.search.query) {
          // Search on the source's search columns (any of them may match), or
          // else on the one, valid (text) column the client picked.
          const pattern = `%${input.search.query}%`;
          if(source.search_columns !== undefined) {
            for (let [table, columns] of Object.entries(source.search_columns)) {
              const ors = columns.map((col) =>
                sql`${field(table == 'flat' ? col : `${table}.${col}`)} ilike ${pattern}`
              );
              if (ors.length)
                conds.push(sql`(${ors.reduce((acc, x) => sql`${acc} or ${x}`)})`);
            }
          } else if(input.search.column) {
            conds.push(sql`${field(input.search.column)} ilike ${pattern}`);
          }
        }

        const where = conds.length
          ? sql`where ${conds.reduce((acc, x) => sql`${acc} and ${x}`)}`
          : sql``;

        const order = input.sort.column
          ? sql`order by ${field(input.sort.column)} ${input.sort.dir === "ASC" ? sql`asc` : sql`desc`}`
          : sql``;

        const from = sql`from ${sql(source.from)} as t ${source.joins ? source.joins(sql) : sql``}`;

        try {
          const [data, [{ total }]] = await Promise.all([
            sql`
              select ${source.select ? source.select(sql, ctx) : sql`t.*`}
              ${from}
              ${where}
              ${order}
              limit ${limit} offset ${offset}
            `,
            sql<[{ total: number }]>`select count(*)::int as total ${from} ${where}`,
          ]);

          return {
            rows: data as unknown as T[],
            total
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Error in tablequery from ${source.from}: ${error.message}`
          });
        }
      }

      default:
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Invalid table definition`
        });
    }
  })

export const tableRouter = router({
  'labelsets': createTableProcedure({
    type: 'sql_table',
    from: 'labelsets',
    filter: ({ctx}) => ({ editor_id: ctx.user!.id })
  }),

  'projects': createTableProcedure({
    type: 'sql_table',
    from: 'projects',
    filter: ({ctx}) => ({ editor_id: ctx.user!.id })
  }),

  'documents': createTableProcedure({
    type: 'sql_table',
    from: 'documents',
    authorizer: {
      filter_key: 'project_id',
      resolver: projectEditorAuthorizer
    }
  }),

  // Each task with `assignments: [{ count }]`, the number of its assignments.
  'tasks': createTableProcedure({
    type: 'sql_table',
    from: 'tasks',
    select: (sql) => sql`
      t.*,
      json_build_array(json_build_object(
        'count', (select count(*) from assignments as a where a.task_id = t.id)
      )) as assignments
    `,
    authorizer: {
      filter_key: 'project_id',
      resolver: projectEditorAuthorizer
    }
  }),

  'publications': createTableProcedure({
    type: 'sql_table',
    from: 'publications',
    search_columns: {flat: ['author','task_name', 'task_description', 'labels_name', 'labels_description', 'contact']}
  }),

  // `annotator` is null for an assignment without annotator; only assignments
  // with a document are listed.
  'assignments': createTableProcedure({
    type: 'sql_table',
    from: 'assignments',
    select: (sql) => sql`
      t.id, t.task_id, t.status, t.confidence_rating, t.seq_pos, t.annotator_number, t.origin,
      case when u.id is null then null else json_build_object('id', u.id, 'email', u.email) end as annotator,
      json_build_object('id', d.id, 'name', d.name, 'source', d.source) as document
    `,
    joins: (sql) => sql`
      left join users as u on (u.id = t.annotator_id)
      inner join documents as d on (d.id = t.document_id)
    `,
    fields: {
      'annotator.id': (sql) => sql`u.id`,
      'annotator.email': (sql) => sql`u.email`,
      'document.id': (sql) => sql`d.id`,
      'document.name': (sql) => sql`d.name`,
      'document.source': (sql) => sql`d.source`,
    },
    authorizer: {
      filter_key: 'task_id',
      resolver: taskEditorAuthorizer
    }
  }),

  // The tasks the user has assignments in, each with `assignment`: the ids
  // of those assignments.
  'assignedTasks': createTableProcedure({
    type: 'sql_table',
    from: 'tasks',
    select: (sql, ctx) => sql`
      t.id, t.name, t."desc", t.annotation_level, t.document_labelset_id,
      (
        select json_agg(json_build_object('id', a.id))
        from assignments as a
        where a.task_id = t.id and a.annotator_id = ${ctx.user!.id}
      ) as assignment
    `,
    where: (sql, ctx) => sql`exists (
      select 1 from assignments as a where a.task_id = t.id and a.annotator_id = ${ctx.user!.id}
    )`,
  }),

  'assignedAssignments': createTableProcedure({
    type: 'sql_table',
    from: 'assignments',
    select: (sql) => sql`
      t.id, t.task_id,
      json_build_object('id', u.id, 'email', u.email) as annotator,
      json_build_object('id', d.id, 'name', d.name, 'source', d.source) as document,
      t.status, t.confidence_rating, t.seq_pos
    `,
    joins: (sql) => sql`
      inner join users as u on (u.id = t.annotator_id)
      inner join documents as d on (d.id = t.document_id)
    `,
    fields: {
      'annotator.id': (sql) => sql`u.id`,
      'annotator.email': (sql) => sql`u.email`,
      'document.id': (sql) => sql`d.id`,
      'document.name': (sql) => sql`d.name`,
      'document.source': (sql) => sql`d.source`,
    },
    filter: ({ctx}) => ({
      'annotator.id': ctx.user?.id,
      status: 'done'
    })
  })
})

export type TableRouter = typeof tableRouter
