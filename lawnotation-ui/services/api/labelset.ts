import crud_api from './common/crud';
import { Labelset } from "@/types/labelset"

export const labelsetApiService = {
  ...crud_api<Labelset>()('/api/labelset'),
}

export default labelsetApiService;