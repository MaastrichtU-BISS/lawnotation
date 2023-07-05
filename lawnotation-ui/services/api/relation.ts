import crud_api from './common/crud';
import { AnnotationRelation } from "@/types/relation"

const relationApiService = {
  ...crud_api<AnnotationRelation>()('/api/relation'),
}

export default relationApiService;