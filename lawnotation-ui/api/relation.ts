import { Annotation } from './annotation';

export type Relation = {
  id: number,
  from_id: number,
  to_id: number,
  ls_to: string,
  ls_from: string,
  direction: string,
  labels: string[]
}

export type LSSerializedRelation = {
  from_id: string,
  to_id: string,
  direction: string,
  labels: string[],
  type: string
};

export default {

  convert_ls2db: (rel: LSSerializedRelation, from_id: number, to_id: number): Omit<Relation, "id"> => {
    return {
      ls_from: rel.from_id,
      ls_to: rel.to_id,
      direction: rel.direction,
      labels: rel.labels,
      from_id: from_id,
      to_id: to_id,
    };
  },

  convert_db2ls: (rel: Relation): LSSerializedRelation => {
    return {
      from_id: rel.ls_from,
      to_id: rel.ls_to,
      labels: rel.labels,
      direction: rel.direction,
      type: 'relation'
    };
  },
  
  // Create
  create: async (new_data: Omit<Relation, "id">): Promise<Relation> => {
    const { data, error } = await useFetch<Relation>('/api/relation', { method: 'POST', body: { new_data } })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },

  findById: async (id: Relation['id']): Promise<Relation>   => {
    const { data, error } = await useFetch<Relation>(`/api/relation/${id}`, { method: 'GET' })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },
  
  // Read many
  find: async (filter: Partial<Relation>, offset: number, limit: number): Promise<Relation[]> => {
    const { data, error } = await useFetch<Relation[]>('/api/relation', { method: 'GET' })

    if (data.value && !error.value)
      return data.value;
    else if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
    else
      throw Error(`Error in ${getFunctionCaller()}: no data received`);
  },
  
  // Update
  update: async (id: Relation['id'], updates: Partial<Relation>): Promise<void> => {
    const { error } = await useFetch<Relation>(`/api/relation/${id}`, { method: 'PATCH', body: updates });

    if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
  },
  
  // Delete
  delete: async (id: Relation['id']): Promise<void> => {
    const { error } = await useFetch(`/api/relation/${id}`, { method: 'DELETE', body: {} });

    if (error.value)
      throw Error(`Error in ${getFunctionCaller()}: ${error.value.message}`)
  }
}