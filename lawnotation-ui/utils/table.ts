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
    column: null | TableData<T>['columns'][keyof TableData<T>['columns']]['field']
    dir: "ASC" | "DESC"
  },
  search: {
    column: null | TableData<T>['columns'][keyof TableData<T>['columns']]['field'],
    query: string,
  },
};

export type CreateTableDataSource = {
  type: 'table',
  select?: string,
  from: string,
  filter?: object | (() => object),
} | {
  type: 'rpc',
  func: string,
  args?: object
}

export const createTableData = <T>(columns: TableData<unknown>['columns'], src_options: CreateTableDataSource, default_sort?: TableData<T>['sort']): TableData<T> => {

  const supabase = useSupabaseClient();

  const default_search_column = Object.values(columns).filter(x => x.search).map(x => x.field)[0] ?? null;
  const default_sort_column = Object.values(columns).filter(x => x.sort).map(x => x.field)[0] ?? null; 

  const td: TableData<T> = reactive({
    total: 0,
    rows: [],

    page: 1,
    items_per_page: 10,
    loading: false,

    sort: default_sort ?? {column: default_sort_column, dir: "ASC"},
    search: {column: default_search_column, query: ""},

    columns,

    load: async () => {
      td.loading = true;
      
      const offset = (td.page - 1) * td.items_per_page;
      const limit = td.items_per_page;

      switch (src_options.type) {
        case 'table': {

          const filter: object = (typeof src_options.filter === "function" ? src_options.filter() : src_options.filter) ?? {}
          
          let query = supabase
            .from(src_options.from)
            .select(src_options.select ?? '*', {count: 'exact'})
            .match(filter)
            .range(offset, offset + limit - 1);
          
          if (td.search.column && td.search.query) {
            // Approach 1: using 'or' method (fails due to cast and in general)
            // const search_conds = Object.values(columns).filter(x => x.field).map(x => `${x.field}.ilike.%${td.search}%`).join(",").split(",")[1];
            // query = query.or(search_conds);

            // Approach 2: textSearch method (produces inconsistent results)
            // query = query.textSearch(td.search.column, td.search.query);

            // Approach 3: search on one, valid (text) field
            query = query.ilike(td.search.column, `%${td.search.query}%`);
          }
          
          if (td.sort && td.sort.column) {
            let sort_column = td.sort.column;

            const sort_options: any = {ascending: td.sort.dir === "ASC"};
            if (td.sort.column.includes('.')) {
              sort_options.foreignTable = td.sort.column.split('.')[0];
              sort_column = td.sort.column.split('.')[1];
            }
            
            query = query.order(sort_column, sort_options)
          }
            
          const { data, error, count } = await query;
          
          if (data !== null && count !== null && !error) {
            td.rows = data as T[];
            td.total = count;
          }

          if (error)
            throw Error(`Error in tablequery from ${src_options.from}: ${error.message}`)

          break;
        }
        case 'rpc': {
          
          throw Error("RPC-tables are not yet supported");
          // TODO: *counting*, sorting and filtering
          /*
          const { data, error } = await supabase
            .rpc(src_options.func, src_options.args)
            .range(
              (td.page - 1) * td.items_per_page,
              td.items_per_page
            );
          
          if (data !== null && count !== null && !error) {
            td.rows = data as T[];
            td.total = count;
          }
          */
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
