export { };

declare global {
  namespace Cypress {
    interface Chainable {
      login(): void;
      resetDatabase(): void;
      addProject(projectName: string): void;
      addTask(taskName: string): void;
    }
  }
}