describe('Login annotator and test basic actions', () => {
  beforeEach(() => {
    cy.login();
  });

  it('goes to index', () => {
    // (fetch)POST 200 /api/_supabase/session also messes up here
    cy.wait(2000)
    cy.visit('/').get('a[data-test="assigned-tasks-menu-item"]')
    cy.get('button[data-test="start-annotating-button"]').should('not.exist')
  })
})