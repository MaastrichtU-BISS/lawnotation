import crud from '@/services/common/crud.api';
import { Project } from "@/types/project"

const api = {
  ...crud<Project>()('/api/project'),
}

export default api;