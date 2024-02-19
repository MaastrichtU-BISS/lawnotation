import Role from '../support/role';

describe('Assign a project to the annotator account as the editor', () => {
    before(() => {
        cy.resetDatabase();
    });

    beforeEach(() => {
        cy.login(Role.EDITOR);
    });

    it('Create project, add task and document, and assign to the annotator account', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.addProject('Assignments test')

        cy.get('a[data-test="edit-project-link"]').first().click()
        cy.addTask('Task')

        cy.get('button[data-test="documents-tab"]').click()
        cy.get('input[data-test="upload-documents"]').selectFile('./cypress/support/Test.txt')
        cy.get('td').contains('Test.txt').should('exist')

        cy.get('button[data-test="tasks-tab"]').click()
        cy.get('button[data-test="view-task-button"]').click()
        cy.contains('Create assignments').should('exist')
        cy.get('input[id="annotator_email"]').type('annotator@test.com')
        cy.get('button').contains('Add').click()
        cy.get('input[id="annotator_email"]').type('annotator1@test.com')
        cy.get('button').contains('Add').click()
        cy.get('button').contains('Create Assignments').click()

        cy.get('td').contains('annotator@test.com').should('exist')
        cy.get('td').contains('annotator1@test.com').should('not.exist')
        cy.get('td').contains('Test.txt').should('exist')
        cy.get('#breadcrumb-holder').find('li').eq(1).click()
        cy.get('button[data-test="view-task-button"]').click()
        cy.get('td').contains('annotator@test.com').should('exist')
        cy.get('td').contains('annotator1@test.com').should('not.exist')
        cy.get('td').contains('Test.txt').should('exist')
        
        cy.get('a').contains('View').first().click()
        cy.get('span').contains('Label1').should('exist')
        cy.get('div').contains('Lorem').should('exist')
    })
})