export { };

import Role from './role';

declare global {
  namespace Cypress {
    interface Chainable {
      login(role: Role): void;
      resetDatabase(): void;
      addProject(projectName: string): void;
      addTask(taskName: string, annotationLevel?: 'word' | 'document'): void;
      selectText(text: string): void;
    }
  }
}