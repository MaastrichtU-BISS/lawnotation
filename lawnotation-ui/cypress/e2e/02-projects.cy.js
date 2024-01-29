describe('Navigate to projects and test functionality ', () => {
    beforeEach(() => {
        cy.login();
    });

    it('Enter projects and Add, Delete and Edit ', () => {
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)
        cy.addProject('Deletetest')
        cy.addProject('Deletetest')
        cy.addProject('Deletetest')
        cy.addProject('Deletetest')
        cy.get('a[data-test="Edit-project-link"]').eq(0).click()
        cy.addTask('delete test')
        cy.addTask('delete test')
        cy.addTask('delete test')
        cy.addTask('delete test')
        cy.wait(1000)
        cy.get('[data-test="Checkbox"]').eq(0).check()
        cy.wait(1000)
        cy.get('[data-test="Checkbox"]').eq(2).check()
        cy.wait(1000)
        cy.get('button[data-test="remove-selected-rows"]').eq(1).click({ force: true })   //test if the project is deleted
        cy.wait(1000)
        cy.get('button').contains('Confirm').click()
        cy.wait(1000)
        cy.reload()
        cy.get('a[data-test="View-task"]').should("have.length", 2)
        cy.wait(1000)
        cy.get('button[data-test="remove-all"]').eq(1).click({ force: true })  //test if the project is deleted
        cy.get('button').contains('Confirm').click()
        cy.reload()
        cy.get('a[data-test="View-task"]').should("have.length", 0)
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)
        cy.get('[data-test="Checkbox"]').eq(0).check()
        cy.wait(1000)
        cy.get('[data-test="Checkbox"]').eq(2).check()
        cy.wait(1000)
        cy.get('button[data-test="remove-selected-rows"]').eq(0).click({ force: true })  //test if the project is deleted
        cy.reload()
        cy.get('a[data-test="Edit-project-link"]').should("have.length", 2)  //test if the project is deleted
        cy.reload()
        cy.wait(1000)
        cy.get('button[data-test="remove-all"]').eq(1).click({ force: true })
        cy.wait(1000)
        cy.get('button').contains('Confirm').click()
        cy.reload()
        cy.get('a[data-test="Edit-project-link"]').should("have.length", 0) //test if the project is deleted
        cy.reload()
        cy.wait(1000)
    })

    it('Edits a project', () => {
        cy.get('a[data-test="projects-link"]').click()
        cy.addProject('Edittest')
        cy.get('a[data-test="Edit-project-link"]').eq(0).click()
        cy.addTask('test')
        cy.addTask('test')
        cy.get('button[data-test="Documents"]').click()
        cy.get('input[type=file]').selectFile('./cypress/support/Test.txt')
        cy.get('td').contains('Test.txt').should('exist')
        cy.get('a[data-test="projects-link"]').click
    })
})