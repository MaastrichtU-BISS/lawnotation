import crud_api from './common/crud';
import { Task } from "@/types/task"

const taskApiService = {
  ...crud_api<Task>()('/api/task'),
}

export default taskApiService;