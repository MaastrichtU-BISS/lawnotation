import Role from '../support/role';

describe('Login as annotator and see there are no assignments yet', () => {
  before(() => {
    cy.resetDatabase();
  });

  beforeEach(() => {
    cy.login(Role.ANNOTATOR);
  });

  it('Go to homepage and assigned tasks', () => {
    cy.wait(3000)
    cy.get('button[data-test="start-annotating-button"]').should('not.exist')
    cy.get('a[data-test="assigned-tasks-menu-item"]').click()
    cy.get('td').should('not.exist')
  })
})