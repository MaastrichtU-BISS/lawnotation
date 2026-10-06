import type { AppRouter } from "~/server/trpc/routers";

export type TableColumn = {
  field: string,
  sortable?: true,
  searchable?: true
} | null;

export const tableColumns: Record<keyof AppRouter['table']['_def']['procedures'], Record<string, TableColumn>> = {
  'labelsets': {
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
    Name: {
      field: "name",
      sortable: true,
      searchable: true,
    },
    Description: {
      field: "desc",
      sortable: true,
      searchable: true,
    },
    Action: null,
  },

  'documents': {
    Name: {
      field: "name",
      sortable: true,
      searchable: true,
    },
    Action: null,
  },

  'tasks': {
    Name: {
      field: "name",
      sortable: true,
      searchable: true,
    },
    Description: {
      field: "desc",
      searchable: true,
    },
    Level: {
      field: 'annotation_level'
    },
    Action: null,
  },

  'publications': {
    Task: {
      field: "task_name",
      sortable: true,
    },
    Author: {
      field: "author",
      sortable: true,
    },
    Guidelines: {
      field: "guidelines_url",
    },
    Data: {
      field: "file_url"
    },
    Action: null,
  },

  'assignments': {
    Annotator: {
      field: "annotator.email",
      searchable: true
    },
    Document: {
      field: "document.name",
      searchable: true
    },
    Status: {
      field: "status",
      sortable: true,
    },
    Confidence: {
      field: "difficulty_rating",
      sortable: true,
    },
    Action: null,
  },


  'assignedTasks': {
    Name: {
      field: 'name',
      sortable: true,
      searchable: true,
    },     
    Description: {
      field: "desc",
      searchable: true,
    },
    Level: {
      field: 'annotation_level'
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
    Confidence: {
      field: 'difficulty_rating',
      sortable: true,
    },
    Action: null
  },
}

/**
 * What a table is sorted by before anyone clicks a header. Most are sorted
 * newest first by id, which is no longer shown as a column — ids mean nothing
 * to the people using the tables. Endpoints left out sort by their first
 * sortable column.
 */
export const defaultSortColumn: Partial<Record<keyof typeof tableColumns, string>> = {
  labelsets: "id",
  projects: "id",
  documents: "id",
  tasks: "id",
  publications: "id",
  assignments: "id",
  assignedTasks: "id",
};

export default tableColumns