import crud from '@/services/common/crud.api';
import { Document } from "@/types/document"

const api = {
  ...crud<Document>()('/api/document'),
}

export default api;