import documentDataService from "~/services/data/document";
import { userIsAuthenticated } from "~/utils/server/guards";

export default eventHandler(async (event) => {
  userIsAuthenticated(event);

  const user = event.context.auth.user;
  const id = getRouterParam(event, 'project_id');

  return await documentDataService(event).findDocumentsByProjectId(id);
})