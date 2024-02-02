import Role from './role';

Cypress.Commands.add("login", (role: Role) => {
  cy.visit('/auth/login')

  cy.wait(1000) // Otherwise (fetch)POST 200 /api/_supabase/session messes up the typing
  cy.get('input[data-test="email-field-to-login"]').type(`${role}@test.com`)
  cy.get('button[data-test="login-button"]').click()
  cy.wait(2000)

  cy.origin('http://localhost:54324', { args: { role } }, ({ role }) => {
    cy.visit(`http://localhost:54324/m/${role}/`)
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
  cy.get('input[data-test="project-name"]').clear().type(projectname)
  cy.get('textarea[data-test="project-description"]').clear().type('Testing project functionality')
  cy.get('button[data-test="add-project"]').click()
});

Cypress.Commands.add('addTask', (taskname) => {
  cy.get('input[data-test="task-name"]').clear().type(taskname)
  cy.get('textarea[data-test="task-description"]').clear().type('test task')
  cy.get('textarea[data-test="annotation-guidelines"]').clear().type('1.{enter}2.{enter}3.{enter}')
  cy.get('select[data-test="select-labelset"]').select(1)
  cy.get('button[data-test="create-tasks"]').click()
})

Cypress.Commands.add('selectText', function(text) {
  cy.contains(text).then(($el) => {
    const el = $el[0];
    const document = el.ownerDocument;
    
    const range = document.createRange();
    range.selectNodeContents(el);

    const fullText = el.textContent || "";
    const startIndex = fullText.indexOf(text);
    const endIndex = startIndex + text.length;

    if (startIndex !== -1 && endIndex !== -1) {
      range.setStart(el.firstChild, startIndex);
      range.setEnd(el.firstChild, endIndex);

      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      $el.trigger('mouseup');
      // cy.document().trigger('selectionchange');
    } else {
      throw new Error(`The text "${text}" was not found in the element`);
    }
  });
});
