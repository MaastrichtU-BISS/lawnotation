import Role from '../support/role';

describe('Login as annotator and test assignment', () => {
  beforeEach(() => {
    cy.login(Role.ANNOTATOR);
  });

  it('Go to assignment and annotate', () => {
    cy.wait(3000)
    cy.get('button[data-test="start-annotating-button"]').should('not.exist')

    cy.get('[data-test="assigned-tasks-menu-item"]').click()
    cy.get('[data-test="view-task-button"]').click()
    cy.get('span[data-test="progress"').contains("0 / 1").should('exist')
    cy.get('button[data-test="annotate-next-assignment-button"]').click()

    cy.wait(1000)
    cy.get('span[data-test="progress"').contains("1 / 1").should('exist')
    cy.get('span[data-label="Label1"]').should('not.exist')
    cy.get('span').contains('Label1').click()
    cy.selectText('Lorem')
    cy.contains('Lorem').click(10, 10)
    cy.get('span[data-label="Label1"]').contains('Lorem').should('exist')
    cy.get('ul[class="ant-rate"').find('li').last().click()
    
    cy.get('button').contains('Update').should('not.exist')
    cy.get('button').contains('Next').click()
    cy.get('button').contains('Update').should('exist')
  })
})