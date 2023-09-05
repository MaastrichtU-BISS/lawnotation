import relationDataService from "~/services/data/annotation_relations";
import { userIsAuthenticated } from "~/utils/server/guards";

export default eventHandler(async (event) => {
  userIsAuthenticated(event);

  const user = event.context.auth.user;

  return await relationDataService(event).find();
})