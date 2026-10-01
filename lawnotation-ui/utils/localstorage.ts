// Where the Label Studio editor kept unsaved work. Nothing writes here any
// more; utils/annotator.ts reads what is left once and hands it to the kit.
import CryptoJS from 'crypto-js';

export class AnnotationsLocalStorage {
  /**
   * assignment_id: number
   * the key of the locally stored data
   */
  constructor(assignment_id: number) {
    this.assignment_id = assignment_id.toString();
    this.baseName = "lawnotation-";
    this.key = CryptoJS.SHA256(this.baseName + this.assignment_id);
    const tryGet = this.get();
    this.isStored = tryGet != null;
  }

  private assignment_id: string;
  private baseName: string;
  private key: string;
  isStored: boolean;

  get() {
    const item = localStorage.getItem(this.key);
    if (item) {
      try {
        const bytes = CryptoJS.AES.decrypt(item, this.assignment_id);
        const decryptedValue = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedValue);
      } catch (error) {
        console.log(
          `Error trying to load locally stored annotations: ${error}`
        );
      }
    }
    return null;
  }

  clear() {
    localStorage.removeItem(this.key);
    this.isStored = false;
  }
}
