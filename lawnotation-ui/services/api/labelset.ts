import crud from '@/services/common/crud.api';
import { Labelset } from "@/types/labelset"

const api = {
  ...crud<Labelset>()('/api/labelset'),
}

export default api;