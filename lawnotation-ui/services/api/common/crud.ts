import type { NitroFetchRequest } from 'nitropack';

// The reason for doing <A>() => <B>(v: B) => ({...}), is that it is apparently a function
// with multiple generics can't have some generics infered from arguments and some generics passed.
export const crud_api = <ResT extends (object & {id: string | number})>() => <ReqT extends NitroFetchRequest>(base_url: ReqT) => ({
  
  // Create
  create: async (new_data: Omit<ResT, "id">): Promise<ResT> => {
    const { data, error } = await useFetch<ResT>(base_url, { method: 'POST', body: { new_data } })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },
  
  // Read many
  find: async ({filter, offset, limit}: {filter: Partial<ResT>, offset: number, limit: number}): Promise<ResT[]> => {
    const { data, error } = await useFetch<ResT[]>(base_url, { method: 'GET' })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },

  // Read
  findById: async (id: ResT['id']): Promise<ResT>   => {
    const { data, error } = await useFetch<ResT>(`${base_url}/${id}`, { method: 'GET' })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },
  
  // Update
  update: async (id: ResT['id'], updates: Partial<ResT>): Promise<void> => {
    const { error } = await useFetch<ResT>(`${base_url}/${id}`, { method: 'PATCH', body: updates });

    if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
  },
  
  // Delete
  delete: async (id: ResT['id']): Promise<void> => {
    const { error } = await useFetch(`${base_url}/${id}`, { method: 'DELETE' });

    if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
  }

})

export default crud_api