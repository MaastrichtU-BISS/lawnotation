describe('Login user and test basic actions', () => {
  beforeEach('log user in', () => {
    cy.visit('/auth/login')

    cy.wait(1000) // Otherwise (fetch)POST 200 /api/_supabase/session messes up the typing
    cy.get('input[data-test="email-field-to-login"]').type('test@test.com')
    cy.get('button[data-test="login-button"]').click()
    cy.wait(2000)
    
    cy.visit("http://localhost:54324/m/test/")
    cy.get('aside:first').find('button').eq(1).click()
    cy.wait(2000)
    cy.get('.message-list-entry:first').click()
    cy.contains('a', 'Log In').click()
  })

  it('goes to index', () => {
    // (fetch)POST 200 /api/_supabase/session also messes up here
    cy.visit('/').get('a[data-test="assigned-taks-menu-item"]')
  })
})