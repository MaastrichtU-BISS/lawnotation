import type { LSSerializedAnnotations } from "~/types";
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
  }

  private assignment_id: string;
  private baseName: string;
  private key: string;

  store(annotations: LSSerializedAnnotations) {
    const encryptedValue = CryptoJS.AES.encrypt(JSON.stringify(annotations), this.assignment_id);
    localStorage.setItem(this.key, encryptedValue.toString());
  }

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
  }
}
