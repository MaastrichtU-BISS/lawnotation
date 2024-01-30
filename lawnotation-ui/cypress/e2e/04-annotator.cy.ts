import Role from '../support/role';

describe('Login annotator and test basic actions', () => {
  beforeEach(() => {
    cy.login(Role.ANNOTATOR);
  });

  it('goes to index', () => {
    cy.wait(3000)
    cy.get('a[data-test="assigned-tasks-menu-item"]')
    cy.get('button[data-test="start-annotating-button"]').should('not.exist')
  })
})