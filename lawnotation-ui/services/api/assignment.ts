import crud from '@/services/common/crud.api';
import { Assignment } from "@/types/assignment"

const api = {
  ...crud<Assignment>()('/api/assignment'),
}

export default api;