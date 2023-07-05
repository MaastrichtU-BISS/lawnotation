import crud_api from './common/crud';
import { Assignment } from "@/types/assignment"

export const assignmentApiService = {
  ...crud_api<Assignment>()('/api/assignment'),
}

export default assignmentApiService;