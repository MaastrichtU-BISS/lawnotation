import type { LSSerializedAnnotations } from "~/types";

export class AnnotationsLocalStorage {
  /**
   * assignment_id: number
   * the key of the locally stored data
   */
  constructor(assignment_id: number) {
    this.assignment_id = assignment_id;
    this.baseName = "lawnotation-";
  }

  private assignment_id: number;
  private baseName: string;

  store(annotations: LSSerializedAnnotations) {
    localStorage.setItem(
      this.baseName + this.assignment_id,
      JSON.stringify(annotations)
    );
  }

  get() {
    const item = localStorage.getItem(this.baseName + this.assignment_id);
    if (item) {
      try {
        return JSON.parse(item);
      } catch (error) {
        console.log(
          `Error trying to load locally stored annotations: ${error}`
        );
      }
    }
    return null;
  }

  clear() {
    localStorage.removeItem(this.baseName + this.assignment_id);
  }
}
