import Role from '../support/role';

describe('Assign a project to annotators as the editor', () => {
    before(() => {
        cy.resetDatabase();
    });

    beforeEach(() => {
        cy.login(Role.EDITOR);
    });

    // annotator1@example.com does not exist in the db yet, so manually check inbucket whether an invite was sent
    it('Create project, add task and document, and assign to annotator accounts', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.wait(1000)
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
        cy.get('input[data-test="annotator-emails"]').type('annotator@example.com,annotator1@example.com')
        cy.get('button[data-test="create-assignments"]').click()

        cy.get('span[data-pc-section="label"]').contains('annotator@example.com').should('exist')
        cy.get('span[data-pc-section="label"]').contains('annotator1@example.com').should('not.exist')
        cy.get('td').contains('Test.txt').should('exist')
        cy.get('#breadcrumb-holder').find('li').eq(1).click()
        cy.get('a[data-test="view-task-link"]').click()
        cy.get('td').contains('annotator@example.com').should('exist')
        cy.get('td').contains('annotator1@example.com').should('not.exist')
        cy.get('td').contains('Test.txt').should('exist')
    })

    it('Editor can view the task', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.get('a[data-test="view-project-link"]').first().click()
        cy.get('a[data-test="view-task-link"]').first().click()
        cy.get('a[data-test="view-assignment-link"]').first().click()
        cy.wait(3000)
        cy.get('span').contains('Label1').should('exist')
        cy.get('div').contains('Lorem').should('exist')
    })

    it('Editor can use the task buttons', () => {
        cy.wait(3000)
        cy.get('a[data-test="projects-link"]').click()
        cy.get('a[data-test="view-project-link"]').first().click()
        cy.get('a[data-test="view-task-link"]').first().click()
        cy.wait(3000)
        cy.get('button[data-test="export-publish-button"').click()

        cy.get('button[data-test="export-button"').should('exist')
        cy.get('button[data-test="start-publishing-button"').should('be.disabled')

        cy.get('input[data-test="ann_guidelines-checkbox"').should('be.checked').should('be.disabled')
        cy.get('input[data-test="labelset-checkbox"').should('be.checked').should('be.disabled')
        cy.get('input[data-test="documents-checkbox"').should('not.be.checked')
        cy.get('input[data-test="annotations-checkbox"').should('not.be.checked')

        cy.get('input[data-test="annotations-checkbox"').check()
        cy.get('input[data-test="documents-checkbox"').should('be.checked')
        cy.get('input[data-test="annotations-checkbox"').should('be.checked')

        cy.get('button[data-test="export-button"').click()
        cy.get('button[data-test="start-publishing-button"').should('not.be.disabled').click()
        cy.get('button[data-test="continue-button"').click()

        cy.get('button[data-test="publish-button"').should('be.disabled')
        cy.get('button[data-test="back-button"').click()
        cy.get('button[data-test="back-button"').click()

        cy.get('input[data-test="ann_guidelines-checkbox"').should('be.checked')
        cy.get('input[data-test="labelset-checkbox"').should('be.checked')
        cy.get('input[data-test="documents-checkbox"').should('be.checked')
        cy.get('input[data-test="annotations-checkbox"').should('be.checked')
        cy.get('button[data-test="start-publishing-button"').should('not.be.disabled')

        cy.get('input[data-test="documents-checkbox"').uncheck()
        cy.get('input[data-test="annotations-checkbox"').should('not.be.checked')
        cy.get('input[data-test="documents-checkbox"').should('not.be.checked')
        cy.get('button[data-test="start-publishing-button"').should('be.disabled')

        cy.get('button[data-test="export-button"').click()
        cy.get('button[data-test="start-publishing-button"').should('not.be.disabled').click()
        cy.get('button[data-test="continue-button"').click()
        cy.get('input[data-test="file-url-input"').type('test')
        cy.get('input[data-test="author-input"').type('test')
        cy.get('button[data-test="publish-button"').should('not.be.disabled')

        cy.get('button[data-pc-section="closebutton"').click({ force: true })

        cy.get('button[data-test="kebab-button"').click()
        cy.get('div[data-test="duplicate-task"').click()
        cy.get('button[data-test="metrics-button"').click()

        cy.get('a[data-test="projects-link"]').click()
        cy.get('a[data-test="view-project-link"]').first().click()
        cy.get('a[data-test="view-task-link"]').should("have.length", 2)

        cy.get('input[data-test="checkbox"]').eq(0).check()
        cy.get('[data-test="tasks-table"]').find('button[data-test="remove-selected-rows"]').click()
        cy.get('button').contains('Confirm').click()
        cy.get('a[data-test="view-task-link"]').should("have.length", 1)
    })
})