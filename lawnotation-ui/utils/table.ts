
export type TableData<T> = {
  total: number;
  rows: T[];
  page: number;
  items_per_page: number;
  loading: boolean;
  load: () => Promise<void>;

  columns: Record<string, {
    field?: string,
    sort?: true,
    search?: true,
  }>,

  sort: {
    column: null | keyof TableData<T>['columns'],
    dir: "ASC" | "DESC"
  },
  search: {
    column: null | keyof TableData<T>['columns'],
    query: string,
  },
};

export type CreateTableDataSource = {
  type: 'table',
  select?: string,
  from: string,
  filter?: object,
} | {
  type: 'rpc',
  func: string,
  args?: object
}

export const createTableData = <T>(columns: TableData<unknown>['columns'], src_options: CreateTableDataSource): TableData<T> => {

  const supabase = useSupabaseClient();

  const td: TableData<T> = reactive({
    total: 0,
    rows: [],

    page: 1,
    items_per_page: 10,
    loading: false,

    sort: {column: null, dir: "ASC"},
    search: {column: null, query: ""},

    columns,

    load: async () => {
      td.loading = true;

      switch (src_options.type) {
        case 'table': {
          
          let query = supabase
            .from(src_options.from)
            .select(src_options.select ?? '*', {count: 'exact'})
            .match(src_options.filter ?? {})
            .range(
              (td.page - 1) * td.items_per_page,
              td.items_per_page
            );
          
          if (td.search.column && td.search.query) {
            // Approach 1: using 'or' method (fails due to cast and in general)
            // const search_conds = Object.values(columns).filter(x => x.field).map(x => `${x.field}.ilike.%${td.search}%`).join(",").split(",")[1];
            // query = query.or(search_conds);

            // Approach 2: textSearch method (produces inconsistent results)
            // query = query.textSearch('name', td.search);

            // Approach 3: search on one, valid (text) field
            query = query.like(td.search.column, `%${td.search.query}%`);
          }

          if (td.sort && td.sort.column)
            query = query.order(td.sort.column, {ascending: td.sort.dir === "ASC"})
            
          const { data, error, count } = await query;
          
          if (data && count) {
            td.rows = data as T[];
            td.total = count;
          }

          break;
        }
        case 'rpc': {
          
          throw Error("RPC-tables are not yet fully supported");
          // TODO: *counting*, sorting and filtering

          const { data, error, count } = await supabase
            .rpc(src_options.func, src_options.args)
            .range(
              (td.page - 1) * td.items_per_page,
              td.items_per_page
            );
          
          if (data && count) {
            td.rows = data as T[];
            td.total = count;
          }

          break;
        }
        default:
          throw Error("Invalid table source")
      }     

      td.loading = false;
    }
  });

  return td;
}
