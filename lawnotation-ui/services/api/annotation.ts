import crud_api from './common/crud';
import { Annotation } from "@/types/annotation"

export const annotationApiService = {
  ...crud_api<Annotation>()('/api/annotation'),
}

export default annotationApiService;