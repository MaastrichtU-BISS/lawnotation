import { createSupabaseClient } from "./client.supabase"
import { Database } from "~/types/supabase";

const crud_data = <
  TableName extends keyof Database['public']['Tables'],
  TableRow = Database['public']['Tables'][TableName]['Row']
>(tablename: TableName) => {
  const client = createSupabaseClient();
  
  const create = async (fields: Partial<TableRow>) => {
    const { data, error } = await client.from(tablename).insert(fields).select().single();

    if (error)
      throw Error(`Error in crud data create for ${tablename}: ${error.message}`)
    else
      return data;
  };
  
  // @ts-ignore: type inference works 
  const findById = async (id: TableRow['id']) => {
    const { data, error } = await client.from(tablename).select().eq("id", id).single();

    if (error)
      throw Error(`Error in crud data findById for ${tablename}: ${error.message}`)
    else
      return data
  };
  
  const find = async ({filter, range}: {filter: Partial<TableRow>, range?: [number, number]}) => {
    let query = client.from(tablename).select().match(filter);
    if (range)
      query = query.range(range[0], range[1])

    const { data, error } = await query;
    
    if (error)
      throw Error(`Error in crud data find for ${tablename}: ${error.message}`)
    else
      return data
  };
  
  const update = async (id: TableRow['id'], fields: Partial<TableRow>): Promise<boolean> => {
    const { error } = await client.from(tablename).update(fields).eq("id", id);
    
    if (error)
      throw Error(`Error in crud data update for ${tablename}: ${error.message}`)
    else
      return true;
  };
  
  // 'delete' is a reserved keyword
  const deleteMethod = async (id: TableRow['id']): Promise<boolean> => {
    const { error } = await client.from(tablename).delete().eq("id", id);

    if (error)
      throw Error(`Error in crud data delete for ${tablename}: ${error.message}`)
    else
      return true;
  };

  return { create, findById, find, update, delete: deleteMethod }
}

export default crud_data;