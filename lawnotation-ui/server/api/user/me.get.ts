import { userIsAuthenticated } from '~/utils/server/guards';

export default eventHandler(async (event) => {
  userIsAuthenticated(event);

  const user = event.context.auth.user;

  return { ...user }
})