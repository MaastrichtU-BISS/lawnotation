export type TableColumn = {
  field: string,
  sortable?: true,
  searchable?: true
} | null;

export const tableColumns: Record<string, Record<string, TableColumn>> = {
  'labelset': {
    'Id': {
      field: 'id',
      sortable: true
    },
    'Name': {
      field: 'name',
      searchable: true,
      sortable: true,
    },
    'Description': {
      field: 'desc',
      searchable: true,
      sortable: true,
    },
    'Action': null
  }
}

export default tableColumns