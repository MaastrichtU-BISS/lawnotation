import { Assignment, useAssignmentApi } from "./assignment.js"

export class AssignmentIterator {
  private readonly assignmentApi;
  public assignments: Assignment[];
  public index: number;

  public constructor() {
    this.assignmentApi = useAssignmentApi();
    this.assignments = [];
    this.index = 0;
  }

  public async loadAssignments(annotator_id: string, task_id: number): Promise<void> {
    this.assignments = await this.assignmentApi.findAssignmentsByUserAndTask(annotator_id, task_id);
  }

  public getCurrent(): Assignment | undefined {
      if(this.index < this.assignments.length) {
          return this.assignments[this.index];
      } 
      return undefined;
  }

  public moveNext(): boolean {
      if(this.index < this.assignments.length - 1) {
          this.index++;
          return true;
      }
      return false;
  }
}