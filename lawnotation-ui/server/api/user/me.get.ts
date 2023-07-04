import { userIsAuthenticated } from '~/utils/server/guards';

export default eventHandler(async (event) => {
  userIsAuthenticated(event);

  return { user: event.context.auth.user }
})