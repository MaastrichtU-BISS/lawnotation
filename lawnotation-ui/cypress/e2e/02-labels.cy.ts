import Role from '../support/role';

describe('Test label functionality', () => {
  before(() => {
    cy.resetDatabase();
  });

  beforeEach(() => {
    cy.login(Role.EDITOR);
  });

  it('Enters label studio and tests functionality', () => {
    cy.wait(3000)
    cy.get('a[data-test="labelset-link"]').click()
    cy.wait(2000)
    cy.get('button[data-test="create-new-labelset"]').click()
    cy.get('input[data-test="labelset-name"]').type('test1')
    cy.get('textarea[data-test="labelset-description"]').type('test1')
    cy.get('input[data-test="label-name"]').type('test1')
    cy.get('button[data-test="add-label"]').click()
    cy.get('button[data-test="create-labelset"]').click()
    cy.get('a[data-test="edit-labelset"]').first().click() // start editing label
    cy.get('input[data-test="edit-labelset-name"]').clear().type('test1.1')
    cy.get('textarea[data-test="edit-labelset-description"]').clear().type('test1.1')
    cy.get('input[data-test="label-name"]').type('test101')
    cy.get('button[data-test="Add-label"]').click()
    cy.get('button[data-test="Save-changes"]').click()
    cy.get('a[data-test="labelset-link"]').click()
    cy.get('a[data-test="edit-labelset"]').first().click() // start deleting label
    cy.get('svg[data-test="delete-label"]').first().click()
    cy.get('a[data-test="labelset-link"]').click()
  })
})