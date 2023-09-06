import crud_api from './common/crud';
import { Document } from "@/types/document"

export const documentApiService = {
  ...crud_api<Document>()('/api/document'),

  findDocumentsByProjectId: async (project_id: number) => {
    const data = await $fetch<Document[]>(`/api/document/findDocumentsByProjectId/${project_id}`, { method: 'GET' })
    if (typeof data === "undefined")
      throw Error('Method findDocumentsByProjectId did not return any data')
    return data;
  },
  
  findSharedDocumentsByTaskId: async (task_id: number) => {
    const data = await $fetch<Document[]>(`/api/document/findSharedDocumentsByTaskId/${task_id}`, { method: 'GET' })
    if (typeof data === "undefined")
      throw Error('Method findSharedDocumentsByTaskId did not return any data')
    return data;
  },

}

export default documentApiService;