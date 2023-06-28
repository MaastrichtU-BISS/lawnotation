import { userIsAuthenticated } from '~/utils/server';

export default eventHandler(async (event) => {
  userIsAuthenticated(event);

  return { user: event.context.auth.user }
})