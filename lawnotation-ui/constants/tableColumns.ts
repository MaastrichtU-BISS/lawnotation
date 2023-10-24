import { AppRouter } from "~/server/trpc/routers";

export type TableColumn = {
  field: string,
  sortable?: true,
  searchable?: true
} | null;

export const tableColumns: Record<keyof AppRouter['table']['_def']['procedures'], Record<string, TableColumn>> = {
  'labelsets': {
    Id: {
      field: 'id',
      sortable: true
    },
    Name: {
      field: 'name',
      searchable: true,
      sortable: true,
    },
    Description: {
      field: 'desc',
      searchable: true,
      sortable: true,
    },
    Action: null
  },
  
  'projects': {
    Id: {
      field: "id",
      sortable: true,
    },
    Name: {
      field: "name",
      sortable: true,
      searchable: true,
    },
    Action: null,
  },

  'documents': {
    Id: {
      field: "id",
      sortable: true,
    },
    Name: {
      field: "name",
      sortable: true,
      searchable: true,
    },
    Action: null,
  },

  'tasks': {
    Id: {
      field: "id",
      sortable: true,
    },
    Name: {
      field: "name",
      sortable: true,
      searchable: true,
    },
    Description: {
      field: "desc",
      searchable: true,
    },
    Action: null,
  },

  'assignments': {
    Id: {
      field: "id",
      sortable: true,
    },
    Annotator: {
      field: "annotator.email",
      searchable: true,
    },
    Document: {
      field: "document.name",
      searchable: true,
    },
    Status: {
      field: "status",
      sortable: true,
    },
    Difficulty: {
      field: "difficulty_rating",
      sortable: true,
    },
    Action: null,
  },


  'assignedTasks': {
    Id: {
      field: 'id',
      sortable: true,
    },
    Name: {
      field: 'name',
      sortable: true,
      searchable: true,
    },
    Action: null
  },
  
  'assignedAssignments': {
    Order: {
      field: 'seq_pos',
      sortable: true,
    },
    Document: {
      field: 'document.name',
      // sort: true,
      searchable: true,
    },
    Status: {
      field: 'status',
      sortable: true,
    },
    Difficulty: {
      field: 'difficulty_rating',
      sortable: true,
    },
    Action: null
  },
}

export default tableColumns