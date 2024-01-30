describe('Testing projects and tasks with the editor account', () => {
    before(() => {
        cy.resetDatabase();
    });

    beforeEach(() => {
        cy.login();
    });

    it('Add, edit and remove projects and tasks', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()

        cy.addProject('Project1')
        cy.addProject('Project2')
        cy.addProject('Project3')
        cy.addProject('Project4')

        cy.get('a[data-test="edit-project-link"]').first().click()
        cy.addTask('Task1')
        cy.addTask('Task2')
        cy.addTask('Task3')
        cy.addTask('Task4')

        cy.get('input[data-test="checkbox"]').eq(0).check()
        cy.get('input[data-test="checkbox"]').eq(2).check()
        cy.get('[data-test="tasks-table"]').find('button[data-test="remove-selected-rows"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('button[data-test="view-task-button"]').should("have.length", 2)

        cy.get('[data-test="tasks-table"]').find('button[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('button[data-test="view-task-button"]').should("have.length", 0)

        cy.get('a[data-test="projects-link"]').click()
        cy.get('[data-test="checkbox"]').eq(0).check()
        cy.get('[data-test="checkbox"]').eq(2).check()
        cy.get('button[data-test="remove-selected-rows"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 2)

        cy.get('button[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 0)
    })

    it('Edit a task', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.addProject('Edit test')

        cy.get('a[data-test="edit-project-link"]').eq(0).click()
        cy.addTask('Task1')
        cy.addTask('Task2')

        cy.get('a[data-test="edit-task-link"]').last().click()
        cy.wait(1000)
        cy.get('input[data-test="task-name"]').clear().type('Task3')
        cy.get('textarea[data-test="task-description"]').clear().type('Task description')
        cy.get('textarea[data-test="annotation-guidelines"]').clear().type('Annotation guidelines')
        cy.get('button[data-test="save-changes-button"]').click()
        cy.get('#breadcrumb-holder').find('li').eq(1).click()
        cy.get('td').contains('Task3').should('exist')

        cy.get('a[data-test="projects-link"]').click()
        cy.get('button[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="edit-project-link"]').should("have.length", 0)
    })
})