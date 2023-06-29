import crud from '@/services/common/crud.api';
import { AnnotationRelation } from "@/types/relation"

const api = {
  ...crud<AnnotationRelation>()('/api/relation'),
}

export default api;