export default class TextExtractorFactory {
  public static createTextExtractorForFile(file: File) {
    const extension = file.name.split(".").at(-1);

    if (extension === "pdf") {
      return new PdfTextExtractor(file);
    }

    if (extension === "txt") {
      return new PlainTextExtractor(file);
    }

    throw Error("File type not supported");
  }
}

interface TextExtractor {
  getText: Function;
}

class PdfTextExtractor implements TextExtractor {
  file: File;

  constructor(file: File) {
    this.file = file;
  }

  async getText() {
    const formData = new FormData();
    formData.append("pdfFile", this.file);
    return $fetch('/api/text/extract', {
      method: "POST",
      body: formData
    });
  }
}

class PlainTextExtractor implements TextExtractor {
  file: File;

  constructor(file: File) {
    this.file = file;
  }

  async getText() {
    const reader = new FileReader();
    reader.readAsText(this.file);
    return new Promise((resolve) => (reader.onload = (result) => resolve(result)));
  }
}