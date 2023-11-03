describe('Login annotator and test basic actions', () => {
  beforeEach('log user in', () => {
    cy.visit('/auth/login')

    cy.wait(1000) // Otherwise (fetch)POST 200 /api/_supabase/session messes up the typing
    cy.get('input[data-test="email-field-to-login"]').type('annotator@test.com')
    cy.get('button[data-test="login-button"]').click()
    cy.wait(2000) 
    
    cy.origin('http://localhost:54324', () => {

    cy.visit("http://localhost:54324/m/annotator/")
    cy.get('aside:first').find('button').eq(1).click()
    cy.wait(2000)
    cy.get('.message-list-entry:first').click()
    cy.contains('a', 'Log In').click()
  })
  })

  it('goes to index', () => {
    // (fetch)POST 200 /api/_supabase/session also messes up here
    cy.wait(2000)
    cy.visit('/').get('a[data-test="assigned-tasks-menu-item"]')
    cy.get('button[data-test="start-annotating-button"]').should('not.exist')
  })
})