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

        cy.get('a[data-test="view-project-link"]').first().click()
        cy.addTask('Task')

        cy.get('a[data-test="documents-tab"]').click()
        cy.get('button[data-test="open-documents-modal"]').click()
        cy.get('input[data-test="choose-documents"]').selectFile('./cypress/support/Test.txt', { force: true })
        cy.get('button[data-test="upload-documents"]').click()
        cy.get('td').contains('Test.txt').should('exist')

        cy.get('a[data-test="tasks-tab"]').click()
        cy.get('a[data-test="view-task-link"]').click()
        cy.contains('Create assignments').should('exist')
        cy.get('input[data-test="annotator-emails"]').type('annotator@example.com,')
        cy.get('input[data-test="annotator-emails"]').type('annotator1@example.com,')
        cy.get('button[data-test="create-assignments"]').click()

        cy.get('span[data-pc-section="label"]').contains('annotator@example.com').should('exist')
        cy.get('span[data-pc-section="label"]').contains('annotator1@example.com').should('not.exist')
        cy.get('td').contains('Test.txt').should('exist')
        cy.get('#breadcrumb-holder').find('li').eq(1).click()
        cy.get('a[data-test="view-task-link"]').click()
        cy.get('td').contains('annotator@example.com').should('exist')
        cy.get('td').contains('annotator1@example.com').should('not.exist')
        cy.get('td').contains('Test.txt').should('exist')
        
        cy.get('a').contains('View').first().click()
        cy.get('span').contains('Label1').should('exist')
        cy.get('div').contains('Lorem').should('exist')
    })
})