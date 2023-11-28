Cypress.Commands.add("login", () => {
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
});

Cypress.Commands.add('resetDatabase', () => {
  cy.task('resetDatabase');
});

Cypress.Commands.add('addProject', (projectname) => {
  cy.get('input[data-test="Project-name"]').clear().type(projectname)
  cy.get('textarea[data-test="Project-description"]').clear().type('Testing project functionality')
  cy.get('button[data-test="Add-project"]').click()
});

Cypress.Commands.add('addTask', (taskname) =>{
  cy.get('input[data-test="Task-name"]').clear().type(taskname)
  cy.get('textarea[data-test="Task-description"]').clear().type('test task')
  cy.get('textarea[data-test="Annotation Guidelines"]').clear().type('1.{enter}2.{enter}3.{enter}')
  cy.get('select[data-test="Select-labelset"]').select("test1.1") // this probably wont pass if the database resets 
  cy.get('button[data-test="Create-tasks"]').click()
})
