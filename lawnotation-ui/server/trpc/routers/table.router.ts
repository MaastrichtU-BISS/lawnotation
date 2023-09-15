import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'

export type TableDataSourceColumns = { 
  columns: Record<
    string,
    {
      field?: string;
      sortable?: true;
      searchable?: true;
      remove?: false
    }
  >
}

export type SupabaseDataSource = {
      type: "supabase_table";
      select?: string;
      from: string;
      filter?: object | (() => object);
    }


export type TableDataSource = TableDataSourceColumns
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

      page: z.number(),
      items_per_page: z.number()
    })
  )
  .output(
    z.object({
      // columns: z.record(z.string(), z.object({
      //   field: z.string(),
      //   sortable: z.boolean(),
      //   searchable: z.boolean()
      // }))
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
        const filter: object = (typeof source.filter === "function"
          ? source.filter()
          : source.filter) ?? {};

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
  'labelset': createTableProcedure({
    type: 'supabase_table',
    from: 'labelsets',
    columns: {
      'Name': {
        field: 'name',
        searchable: true,
        sortable: true,
      }
    }
  })
    
})

export type TableRouter = typeof tableRouter 