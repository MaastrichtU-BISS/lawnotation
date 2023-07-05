import crud_api from './common/crud';
import { Document } from "@/types/document"

export const documentApiService = {
  ...crud_api<Document>()('/api/document'),
}

export default documentApiService;