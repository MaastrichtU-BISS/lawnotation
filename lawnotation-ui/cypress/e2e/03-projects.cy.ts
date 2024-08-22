import Role from '../support/role';

describe('Testing projects and tasks with the editor account', () => {
    beforeEach(() => {
        cy.login(Role.EDITOR);
    });

    it('Add, edit and remove projects and tasks', () => {
        cy.visit('/')
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)

        cy.addProject('Project1')
        cy.addProject('Project2')
        cy.addProject('Project3')
        cy.addProject('Project4')

        cy.get('a[data-test="view-project-link"]').first().click()
        cy.get('button[data-test="open-documents-modal"]').click()
        cy.get('input[data-test="choose-documents"]').selectFile('./cypress/support/Test.txt', { force: true })
        cy.get('button[data-test="upload-documents"]').click()
        cy.get('td').contains('Test.txt').should('exist')

        cy.get('a[data-test="tasks-tab"]').click()
        cy.addTask('Task1')
        cy.addTask('Task2')
        cy.addTask('Task3')
        cy.addTask('Task4')

        cy.get('input[data-test="checkbox"]').eq(0).check()
        cy.get('input[data-test="checkbox"]').eq(2).check()
        cy.get('[data-test="tasks-table"]').find('button[data-test="remove-selected-rows"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-task-link"]').should("have.length", 2)

        cy.get('[data-test="tasks-table"]').find('button[data-test="remove-all-menu-button"]').click()
        cy.get('div[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-task-link"]').should("have.length", 0)

        cy.get('a[data-test="projects-link"]').click()
        cy.get('[data-test="checkbox"]').eq(0).check()
        cy.get('[data-test="checkbox"]').eq(2).check()
        cy.get('button[data-test="remove-selected-rows"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-project-link"]').should("have.length.at.least", 2)

        cy.get('button[data-test="remove-all-menu-button"]').click()
        cy.get('div[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-project-link"]').should("have.length", 0)
    })

    it('Edit a task', () => {
        cy.visit('/')
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)
        cy.addProject('View test')

        cy.get('a[data-test="view-project-link"]').eq(0).click()
        cy.get('button[data-test="open-documents-modal"]').click()
        cy.get('input[data-test="choose-documents"]').selectFile('./cypress/support/Test.txt', { force: true })
        cy.get('button[data-test="upload-documents"]').click()
        cy.get('td').contains('Test.txt').should('exist')

        cy.get('a[data-test="tasks-tab"]').click()
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
        cy.get('button[data-test="remove-all-menu-button"]').click()
        cy.get('div[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-project-link"]').should("have.length", 0)
    })

    it('Add a labelset when creating a new task', () => {
        cy.visit('/')
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)
        cy.addProject('Labelset test')

        cy.get('a[data-test="view-project-link"]').eq(0).click()
        cy.get('a[data-test="tasks-tab"]').click();
        cy.get('button[data-test="open-tasks-modal"]').click();
        cy.get('input[data-test="task-name"]').type("Task with new labelset")
        cy.get('textarea[data-test="task-description"]').type('test task')
        cy.get('input[data-test="annotation-guidelines"]').clear().type('https://example.com')
        cy.get('button[data-test="create-new-labelset"]').click()

        cy.get('input[data-test="labelset-name"]').type('Labelset for task')
        cy.get('textarea[data-test="labelset-description"]').type('test1')
        cy.get('input[data-test="label-name"]').type('test1')
        cy.get('button[data-test="add-label"]').click()
        cy.get('button[data-test="save-labelset"]').click()

        cy.get('a[data-test="new-tab"').click()
        cy.get('div[data-test="select-labelset"]').click()
        cy.get('li[aria-label="Labelset for task"]').first().click()
        cy.get('div[data-test="select-annotation-level"]').find('div[aria-label="document"]').click()
        cy.get('button[data-test="create-tasks"]').click()

        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.get('button[data-test="remove-all-menu-button"]').click()
        cy.get('div[data-test="remove-all"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-project-link"]').should("have.length", 0)

        cy.get('a[data-test="labelset-link"]').click()
        cy.get('[data-test="checkbox"]').eq(0).check()
        cy.get('button[data-test="remove-selected-rows"]').click()
        cy.get('button').contains('Confirm').click()
    })
})