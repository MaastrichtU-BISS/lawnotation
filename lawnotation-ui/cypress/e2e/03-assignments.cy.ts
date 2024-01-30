describe('Assign a project to the annotator account as the editor', () => {
    before(() => {
        cy.resetDatabase();
    });

    beforeEach(() => {
        cy.login();
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
        cy.contains('Create assignments').then(($body) => {
            if ($body.text().includes('Create assignments') && $body.is(':visible')) {
                cy.get('input[id="annotator_email"]').type('annotator@test.com')
                cy.get('button').contains('Add').click()
                cy.get('button').contains('Create Assignments').click()
                cy.get('a').contains('View').eq(0).click()
            }
            else {
                cy.get('a').contains('View').eq(0).click()
            }
        })
        cy.get('span').contains('Label1')
        cy.get('div').contains('Lorem')
    })
})