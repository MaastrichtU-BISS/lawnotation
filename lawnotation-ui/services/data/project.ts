import { Project } from "@/types/project";
import crud_data from "./common/crud.supabase";

export const projectDataService = {
  ...crud_data("projects")
}

export default projectDataService;