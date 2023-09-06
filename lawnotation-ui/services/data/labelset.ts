import { Labelset } from "@/types/labelset"
import crud_data from "./common/crud.supabase"
import createSupabaseClient from "./common/client.supabase";
import { H3Event } from 'h3';

export const labelsetDataService = (event: H3Event) => {
  const client = createSupabaseClient(event);

  return {
    ...crud_data(client, 'labelsets')
  }
}

export default labelsetDataService;