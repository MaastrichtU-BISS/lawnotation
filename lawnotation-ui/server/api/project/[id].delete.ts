import projectDataService from "~/services/data/project";
import { userIsAuthenticated } from "~/utils/server/guards";

export default eventHandler(async (event) => {
  userIsAuthenticated(event);
  const user = event.context.auth.user;
  
  const id = getRouterParam(event, 'id');

  return await projectDataService(event).delete(id);
})