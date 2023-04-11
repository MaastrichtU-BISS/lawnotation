import { createClient } from "@supabase/supabase-js";

export type Project = {
  id: number,
  name: string,
  desc: string,
  // tasks: Task[];
}

export const useProjectApi = () => {
  const config = useRuntimeConfig();
  const supabase = createClient(config.apiUrl, config.apiAnonKey);

  // Create
  const createProject = async (fields: Omit<Project, 'id'>): Promise<boolean> => {
    const { data, error } = await supabase.from("projects").insert(fields);
    
    if (error)
      throw Error(`Error in createProject: ${error.message}`)
    else
      return true;
  };

  // Read
  const findProject = async (id: string): Promise<Project>   => {
    const { data, error } = await supabase.from("projects").select().eq("id", id).single();

    if (error)
      throw Error(`Error in findProject: ${error.message}`)
    else
      return data as Project
  };

  // Read all
  const findProjects = async (): Promise<Project[]> => {
    const { data, error } = await supabase.from("projects").select();
    
    if (error)
      throw Error(`Error in findProject: ${error.message}`)
    else
      return data as Project[]
  };

  // Update
  const updateProject = async (id: string, fields: Partial<Project>): Promise<boolean> => {
    const { data, error } = await supabase.from("projects").update(fields).eq("id", id);
    
    if (error)
      throw Error(`Error in updateProject: ${error.message}`)
    else
      return true;
  };

  // Update
  const deleteProject = async (id: string) => {
    const { data, error } = await supabase.from("projects").delete().eq("id", id);

    if (error)
      throw Error(`Error in deleteProject: ${error.message}`)
    else
      return true;
  };

  return {createProject, findProject, findProjects, updateProject, deleteProject}
}