describe('Navigate to projects and test functionality ', () => {
    beforeEach(() => {
        cy.login();
    });

    it('Enter projects and Add, Delete and Edit ', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()

        cy.addProject('Project1')
        cy.addProject('Project2')
        cy.addProject('Project3')
        cy.addProject('Project4')

        cy.get('a[data-test="edit-project-link"]').eq(0).click()
        cy.addTask('Task1')
        cy.addTask('Task2')
        cy.addTask('Task3')
        cy.addTask('Task4')

        cy.get('input[data-test="checkbox"]').eq(0).check()
        cy.get('input[data-test="checkbox"]').eq(2).check()
        cy.get('button[data-test="remove-selected-rows"]').eq(1).click({ force: true })   //test if the project is deleted
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="View-task"]').should("have.length", 2)

        cy.get('button[data-test="remove-all"]').eq(1).click({ force: true })  //test if the project is deleted
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="View-task"]').should("have.length", 0)

        cy.get('a[data-test="projects-link"]').click()
        cy.get('[data-test="checkbox"]').eq(0).check()
        cy.get('[data-test="checkbox"]').eq(2).check()
        cy.get('button[data-test="remove-selected-rows"]').eq(0).click({ force: true })  //test if the project is deleted
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 2)  //test if the project is deleted
        
        cy.get('button[data-test="remove-all"]').click({ force: true })
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 0) //test if the project is deleted
    })

    it('Edits a project', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.addProject('Edit test')
        
        cy.get('a[data-test="edit-project-link"]').eq(0).click()
        cy.addTask('Task1')
        cy.addTask('Task2')

        cy.get('button[data-test="Documents"]').click()
        cy.get('input[data-test="upload-documents"]').selectFile('./cypress/support/Test.txt')
        cy.get('td').contains('Test.txt').should('exist')
        
        cy.get('a[data-test="projects-link"]').click()
        cy.get('button[data-test="remove-all"]').click({ force: true })
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 0) 
    })
})