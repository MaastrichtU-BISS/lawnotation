import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import { Context } from '~/server/trpc/context';

export type SupabaseDataSource = {
      type: "supabase_table";
      select?: string;
      from: string;
      // filter can be defined on server (like user_id) and on client (like project_id)
      filter?: object | (( { ctx }: { ctx: Context } ) => object);
    }


export type TableDataSource = 
  // TableDataSourceColumns
  & SupabaseDataSource;
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
      }),
      search: z.object({
        column: z.string().nullable(),
        query: z.string()
      }),
      filter: z.record(z.string(), z.any()).optional(),

      page: z.number(),
      items_per_page: z.number()
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
      case "supabase_table": {
        const filter: object = {
          ...input.filter,                          // first, lower prioirity, is the input filter
          ...(typeof source.filter === "function"   // secondly, the server-configured filter is merged
            ? source.filter({ctx})
            : source.filter) ?? {},
        }

        let query = ctx.supabase
          .from(source.from)
          .select(source.select ?? "*", { count: "exact" })
          .match(filter)
          .range(offset, offset + limit - 1);

        if (input.search.column && input.search.query) {
          // Approach 1: using 'or' method (fails due to cast and in general)
          // const search_conds = Object.values(columns).filter(x => x.field).map(x => `${x.field}.ilike.%${td.search}%`).join(",").split(",")[1];
          // query = query.or(search_conds);
          // Approach 2: textSearch method (produces inconsistent results)
          // query = query.textSearch(td.search.column, td.search.query);
          // Approach 3: search on one, valid (text) field
          query = query.ilike(input.search.column, `%${input.search.query}%`);
        }

        if (input.sort.column) {
          let sort_column = input.sort.column;

          const sort_options: any = { ascending: input.sort.dir === "ASC" };
          if (input.sort.column.includes(".")) {
            sort_options.foreignTable = input.sort.column.split(".")[0];
            sort_column = input.sort.column.split(".")[1];
          }

          query = query.order(sort_column, sort_options);
        }

        const { data, error, count } = await query;

        // console.log(filter)

        if (error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Error in tablequery from ${source.from}: ${error.message}`
          });

        if (data !== null && count !== null && !error) {
          return {
            rows: data as T[],
            total: count
          };
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
    type: 'supabase_table',
    from: 'labelsets',
    filter: ({ctx}) => ({ editor_id: ctx.user!.id })
  }),

  'projects': createTableProcedure({
    type: 'supabase_table',
    from: 'projects',
    filter: ({ctx}) => ({ editor_id: ctx.user!.id })
  }),

  'documents': createTableProcedure({
    type: 'supabase_table',
    from: 'documents',
    // filter: ({ctx, input}) => ({ project_id: project.value?.id }),
  }),

  'tasks': createTableProcedure({
    type: 'supabase_table',
    from: 'tasks',
    // filter: ({ctx, input}) => ({ project_id: project.value?.id }),
  }),

  'assignments': createTableProcedure({
    type: 'supabase_table',
    from: 'assignments',
    select: 'id, task_id, annotator:users!inner (id, email), document:documents!inner (id, name, source), status, difficulty_rating, seq_pos'
    // filter: ({ctx, input}) => ({ project_id: project.value?.id }),
  }),

  'assignedTasks': createTableProcedure({
    type: 'supabase_table',
    from: 'tasks',
    select: 'id, name, assignment:assignments!inner(id)',
    filter: ({ctx}) => ({'assignment.annotator_id': ctx.user!.id}),
  }),

  'assignedAssignments': createTableProcedure({
    type: 'supabase_table',
    from: 'assignments',
    select: 'id, task_id, annotator:users!inner (id, email), document:documents!inner (id, name, source), status, difficulty_rating, seq_pos',
    filter: ({ctx}) => ({
      'annotator.id': ctx.user?.id,
      status: 'done'
    })
  })
})

export type TableRouter = typeof tableRouter