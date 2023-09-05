import crud_api from './common/crud';
import { Document } from "@/types/document"

export const documentApiService = {
  ...crud_api<Document>()('/api/document'),

  findDocumentsByProjectId: async (project_id: number) => {
    try {
      const data = await $fetch<Document[]>(`/api/document/findDocumentsByProjectId/${project_id}`, { method: 'GET' })
      return data;
    } catch (e) {
      if (e instanceof Error)
        throw Error(`Error in findDocumentsByProjectId: ${e.message}`)
    }
  },
  
  findSharedDocumentsByTask: async (task_id: number) => {
    try {
      const data = await $fetch<Document[]>(`/api/document/findSharedDocumentsByTask/${task_id}`, { method: 'GET' })
      return data;
    } catch (e) {
      if (e instanceof Error)
        throw Error(`Error in findSharedDocumentsByTask: ${e.message}`)
    }
  },

}

export default documentApiService;