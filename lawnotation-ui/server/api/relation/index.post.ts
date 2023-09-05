import relationDataService from "~/services/data/annotation_relations";
import { userIsAuthenticated } from "~/utils/server/guards";

export default eventHandler(async (event) => {
  userIsAuthenticated(event);

  const user = event.context.auth.user;

  const {fields, from_id, to_id} = await readBody(event);

  return await relationDataService(event).create(...[fields, from_id, to_id]);
})