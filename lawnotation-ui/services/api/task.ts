import crud from '@/services/common/crud.api';
import { Task } from "@/types/task"

const api = {
  ...crud<Task>()('/api/task'),
}

export default api;