import crud_api from './common/crud';
import { Project } from "@/types/project"

const projectApiService = {
  ...crud_api<Project>()('/api/project'),
}

export default projectApiService;