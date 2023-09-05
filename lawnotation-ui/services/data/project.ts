import { Project } from "@/types/project";
import crud_data from "./common/crud.supabase";
import { H3Event } from 'h3';
import createSupabaseClient from "./common/client.supabase";

export const projectDataService = (event: H3Event) => {
  const client = createSupabaseClient(event);

  return {
    ...crud_data(client, 'projects')
  }
}

export default projectDataService;