describe('Navigate to projects and test functionality ', () => {
    before(() => {
        cy.resetDatabase();
    });

    beforeEach(() => {
        cy.login();
    });

    it('Enter projects and Add, Delete and Edit ', () => {
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)

        cy.addProject('Project1')
        cy.addProject('Project2')
        cy.addProject('Project3')
        cy.addProject('Project4')

        cy.get('a[data-test="edit-project-link"]').eq(0).click()
        cy.addTask('Task1')
        cy.addTask('Task2')
        cy.addTask('Task3')
        cy.addTask('Task4')

        cy.wait(1000)
        cy.get('input[data-test="checkbox"]').eq(0).check()
        cy.wait(1000)
        cy.get('input[data-test="checkbox"]').eq(2).check()
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
        cy.get('[data-test="checkbox"]').eq(0).check()
        cy.wait(1000)
        cy.get('[data-test="checkbox"]').eq(2).check()
        cy.wait(1000)
        cy.get('button[data-test="remove-selected-rows"]').eq(0).click({ force: true })  //test if the project is deleted
        cy.reload()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 2)  //test if the project is deleted
        
        cy.reload()
        cy.wait(1000)
        cy.get('button[data-test="remove-all"]').eq(1).click({ force: true })
        cy.wait(1000)
        cy.get('button').contains('Confirm').click()
        cy.reload()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 0) //test if the project is deleted
        cy.reload()
        cy.wait(1000)
    })

    it('Edits a project', () => {
        cy.get('a[data-test="projects-link"]').click()
        cy.addProject('Edittest')
        cy.get('a[data-test="edit-project-link"]').eq(0).click()
        cy.addTask('test')
        cy.addTask('test')
        cy.get('button[data-test="Documents"]').click()
        cy.get('input[type=file]').selectFile('./cypress/support/Test.txt')
        cy.get('td').contains('Test.txt').should('exist')
        cy.get('a[data-test="projects-link"]').click
    })
})