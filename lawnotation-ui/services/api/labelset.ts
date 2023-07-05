import crud_api from '@/services/common/api/crud.';
import { Labelset } from "@/types/labelset"

export const labelsetApiService = {
  ...crud_api<Labelset>()('/api/labelset'),
}

export default labelsetApiService;