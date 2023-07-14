import { userHasRole, userIsAuthenticated } from "~/utils/server/guards"

export default eventHandler(async (event) => {
  userIsAuthenticated(event);
  userHasRole(event, "editor")
  
  const query = getQuery(event)
  console.log("ID: ", query.id);

})