import { Labelset } from "@/types/labelset"
import crud_data from "./common/crud.supabase"

export const labelsetDataService = {
  ...crud_data('labelsets')
}

export default labelsetDataService;