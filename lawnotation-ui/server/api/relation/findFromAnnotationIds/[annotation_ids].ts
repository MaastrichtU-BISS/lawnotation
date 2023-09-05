import relationDataService from "~/services/data/annotation_relations";
import { userIsAuthenticated } from "~/utils/server/guards";

export default eventHandler(async (event) => {
  userIsAuthenticated(event);
  const user = event.context.auth.user;

  const ids: number[] = (getRouterParam(event, 'annotation_ids') as string)
    .split(',')
    .map(x => +x);

  return await relationDataService(event).findFromAnnotationIds(ids);
})