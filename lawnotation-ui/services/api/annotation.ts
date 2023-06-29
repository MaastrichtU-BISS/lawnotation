import crud from '@/services/common/crud.api';
import { Annotation } from "@/types/annotation"

const api = {
  ...crud<Annotation>()('/api/annotation'),
}

export default api;