describe('Navigate to assignments and test functionality ', () => {
    beforeEach(() => {
        cy.login();
    });

    it('Test assignments', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.addProject('Assignments test')

        cy.get('a[data-test="edit-project-link"]').first().click()
        cy.addTask('Task')

        cy.get('button[data-test="documents-tab"]').click()
        cy.get('input[data-test="upload-documents"]').selectFile('./cypress/support/Test.txt')
        cy.get('td').contains('Test.txt').should('exist')
        
        cy.get('button[data-test="tasks-tab"]').click()
        cy.get('a[data-test="View-task"]').click()
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