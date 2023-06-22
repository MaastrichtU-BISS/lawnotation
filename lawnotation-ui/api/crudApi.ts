import type { NitroFetchRequest } from 'nitropack';
import type { FetchError } from 'ofetch';

const crudApi = <ResT extends (object & {id: string | number}), ReqT extends NitroFetchRequest>(base_url: ReqT) => ({
  
  // Create
  create: async (new_data: Omit<ResT, "id">): Promise<ResT> => {
    const { data, error } = await useFetch<ResT, FetchError<any>, ReqT>(base_url, { method: 'POST', body: { new_data } })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },

  // Read
  findById: async (id: ResT['id']): Promise<ResT>   => {
    const { data, error } = await useFetch<ResT>(`/api/relation/${id}`, { method: 'GET' })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },
  
  // Read many
  find: async (filter: Partial<ResT>, offset: number, limit: number): Promise<ResT[]> => {
    const { data, error } = await useFetch<ResT[]>('/api/relation', { method: 'GET' })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },
  
  // Update
  update: async (id: ResT['id'], updates: Partial<ResT>): Promise<void> => {
    const { error } = await useFetch<ResT>(`/api/relation/${id}`, { method: 'PATCH', body: updates });

    if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
  },
  
  // Delete
  delete: async (id: ResT['id']): Promise<void> => {
    const { error } = await useFetch(`/api/relation/${id}`, { method: 'DELETE', body: {} });

    if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
  }

})

export default crudApi