describe('Navigate to assignments and test functionality ', () => {
    beforeEach(() => {
        cy.login();
    });

    it('Test assignments', () => {
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)
        // cy.addProject('Assignments test')
        cy.wait(1000)
        cy.get('a[data-test="Edit-project-link"]').eq(0).click()
        cy.get('a[data-test="View-task"]').eq(0).click()
        cy.wait(1000)
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
        cy.get('span').contains('test1').click()
        cy.wait(1000)
        // cy.contains('Lorem').dblclick({force: true}) 
    })
})