let _pdfjs: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import("pdfjs-dist");
    _pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${_pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return _pdfjs;
}

export const usePdfToDocx = () => {
  const loadPdf = async (file: File) => {
    const pdfjs = await getPdfjs();
    const buffer = await file.arrayBuffer();
    return pdfjs.getDocument({ data: buffer }).promise;
  };

  const renderPageThumbnail = async (
    pdf: Awaited<ReturnType<typeof loadPdf>>,
    pageNum: number,
    scale = 0.22
  ): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const extractPageText = async (
    pdf: Awaited<ReturnType<typeof loadPdf>>,
    pageNum: number
  ): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    return (content.items as any[])
      .filter((item) => "str" in item)
      .map((item) => item.str + (item.hasEOL ? "\n" : ""))
      .join("")
      .replace(/ {2,}/g, " ")
      .trim();
  };

  const convert = async (
    file: File,
    selectedPages: number[]
  ): Promise<{ docxBlob: Blob; docxFile: File }> => {
    const pdf = await loadPdf(file);
    const sortedPages = [...selectedPages].sort((a, b) => a - b);

    const pageTexts: { pageNum: number; text: string }[] = [];
    for (const pageNum of sortedPages) {
      const text = await extractPageText(pdf, pageNum);
      pageTexts.push({ pageNum, text });
    }

    const { Document, Paragraph, TextRun, Packer } = await import("docx");

    const children: InstanceType<typeof Paragraph>[] = [];
    for (const { pageNum, text } of pageTexts) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `— Page ${pageNum} —`, bold: true })],
        })
      );
      for (const line of text.split("\n").filter((l) => l.trim())) {
        children.push(new Paragraph({ children: [new TextRun(line)] }));
      }
      children.push(new Paragraph({}));
    }

    const doc = new Document({ sections: [{ children }] });
    const docxBlob = await Packer.toBlob(doc);
    const baseName = file.name.replace(/\.pdf$/i, "");
    const pageLabel =
      sortedPages.length === pdf.numPages
        ? "all"
        : sortedPages.join("-");
    const docxFile = new File(
      [docxBlob],
      `${baseName}_pages_${pageLabel}.docx`,
      {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }
    );

    return { docxBlob, docxFile };
  };

  return { loadPdf, renderPageThumbnail, convert };
};
