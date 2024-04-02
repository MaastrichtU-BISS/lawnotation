import Role from './role';

Cypress.Commands.add("login", (role: Role) => {
  cy.session([role], () => {
    cy.visit('/auth/login')

    cy.wait(1000)
    cy.get('input[data-test="email-field-to-login"]').type(`${role}@example.com`)
    cy.get('button[data-test="login-button"]').click()
    cy.wait(4000)

    cy.request(`http://127.0.0.1:54324/api/v1/mailbox/${role}`).then((response) => {
      return response.body.pop().id;
    }).then((mailId) => {
      return cy.request(`http://127.0.0.1:54324/serve/mailbox/${role}/${mailId}`).then((response) => {
        return response.body.html
      })
    }).then(html => {
      return Cypress.$(html).find('span').text();
    }).then(code => cy.get('input[data-test="token-field-to-login"]').type(code))

    cy.get('button[data-test="login-button"]').click()

    cy.location('pathname')
      .should('eq', '/')
  },
  {
    validate() {
      cy.visit('http://localhost:3000')
      // this should be changed to a 200 request for 
    },
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

Cypress.Commands.add('selectText', function (text) {
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

