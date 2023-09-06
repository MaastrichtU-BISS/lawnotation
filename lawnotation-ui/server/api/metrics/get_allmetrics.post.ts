import * as XLSX from "xlsx";

export default eventHandler(async (event) => {
  const data = await readBody(event);

  let results: { wb: string; name: string }[] = [];

  try {
    try {
      const workbookDifficulty = XLSX.utils.book_new();
      const diff_metric_body = JSON.stringify({
        task_id: data.task_id,
        annotators_length: data.annotators.length,
        annotators: data.annotatorOrEmpty,
        documents: data.documentsOrEmpty,
      });

      const dm = await $fetch("/api/metrics/difficulty", {
        method: "POST",
        body: diff_metric_body,
      });
      const worksheetDifficulty = XLSX.utils.json_to_sheet([
        {
          total: dm.total,
          rated: dm.rated,
          average_stars: dm.average,
          "1_stars": dm.values[1],
          "2_stars": dm.values[2],
          "3_stars": dm.values[3],
          "4_stars": dm.values[4],
          "5_stars": dm.values[5],
          krippendorff: dm.krippendorff?.result,
          p0: dm.krippendorff?.po,
          pe: dm.krippendorff?.pe,
        },
      ]);
      XLSX.utils.book_append_sheet(
        workbookDifficulty,
        worksheetDifficulty,
        "Difficulty Metrics"
      );
      results.push({
        wb: getZippeableBlob(workbookDifficulty),
        name: `_confidence.xlsx`,
      });
    } catch (error) {}
    for (let i = 0; i < data.documents.length; i++) {
      console.log(results.length);
      const document = data.documents[i];
      const workbookMetrics = XLSX.utils.book_new();
      const workbookAnnotations = XLSX.utils.book_new();
      for (let j = 0; j < data.labelsOptions.length; j++) {
        const label = data.labelsOptions[j];
        const sheets: XLSX.WorkSheet[] = await getXlslTab(
          data.task_id,
          label,
          [document],
          data.annotators,
          data.annotatorsOrEmpty,
          data.tolerance,
          data.byWords,
          data.hideNonText,
          data.contained,
          data.documentsData,
          data.documentsOptions
        );
        XLSX.utils.book_append_sheet(workbookMetrics, sheets[0], label);
        XLSX.utils.book_append_sheet(workbookAnnotations, sheets[1], label);
      }
      const filename =
        document + "-" + data.documentsData[document].name.split(".")[0];
      results.push({
        wb: getZippeableBlob(workbookMetrics),
        name: `${filename}_metrics.xlsx`,
      });

      results.push({
        wb: getZippeableBlob(workbookAnnotations),
        name: `${filename}_annotations.xlsx`,
      });
    }

    const workbookMetrics = XLSX.utils.book_new();
    const workbookAnnotations = XLSX.utils.book_new();
    for (let i = 0; i < data.labelsOptions.length; i++) {
      console.log(results.length);
      const label = data.labelsOptions[i];
      const sheets = await getXlslTab(
        data.task_id,
        label,
        data.documentsOrEmpty,
        data.annotators,
        data.annotatorsOrEmpty,
        data.tolerance,
        data.byWords,
        data.hideNonText,
        data.contained,
        data.documentsData,
        data.documentsOptions
      );
      XLSX.utils.book_append_sheet(workbookMetrics, sheets[0], label);
      XLSX.utils.book_append_sheet(workbookAnnotations, sheets[1], label);
    }
    results.push({
      wb: getZippeableBlob(workbookMetrics),
      name: `_metrics.xlsx`,
    });

    results.push({
      wb: getZippeableBlob(workbookAnnotations),
      name: `_annotations.xlsx`,
    });

    return results;
  } catch (error) {}
  return [];
});

const getXlslTab = async (
  task_id: string,
  label: string,
  documents: string[],
  annotators: string[],
  annotatorsOrEmpty: string[],
  tolerance: number,
  byWords: boolean,
  hideNonText: boolean,
  contained: boolean,
  documentsData: any,
  documentsOptions: string[]
) => {
  const rowsMetrics: any[] = [];
  const rowsAnnotations: any[] = [];

  let timeout = 100;
  // while (true) {
  try {
    const metric_body = JSON.stringify({
      task_id: task_id,
      label: label,
      documents: documents,
      annotators: annotators,
      annotatorsOrEmpty: annotatorsOrEmpty,
      tolerance: tolerance,
      byWords: byWords,
      hideNonText: hideNonText,
      contained: contained,
      documentsData: documentsData,
      documentsOptions: documentsOptions,
    });
    const metrics = await $fetch("/api/metrics/get_metrics", {
      method: "POST",
      body: metric_body,
    });
    metrics.map((m) => {
      if (m.result !== undefined)
        rowsMetrics.push({
          metric: m.name,
          annotators: annotators.length > 2 ? "all" : annotators.join(","),
          value: m.result,
          p0: m.po,
          pe: m.pe,
          tolerance: tolerance,
          consider_contained: contained ? "yes" : "no",
        });
    });
    const tables = annotators.length > 2 ? metrics[0].table : metrics[2].table;
    tables?.forEach((r: any) => {
      Object.entries(r.annotators).forEach(([k, v]) => {
        const ann = {
          annotator: k,
          start: r.start,
          end: r.end,
          text: r.text,
          value: v,
        };

        rowsAnnotations.push(
          documents.length != 1
            ? {
                document: r.doc_id + "-" + documentsData[r.doc_id].name,
                ...ann,
              }
            : ann
        );
      });
    });
    // break;
  } catch (error) {
    timeout--;
    console.log("FAILED", error);
  }
  // }

  if (annotators.length > 2) {
    for (let i = 0; i < annotators.length; i++) {
      for (let j = i + 1; j < annotators.length; j++) {
        let ck_timeout = 100;
        // while (true) {
        try {
          const metric_body = JSON.stringify({
            task_id: task_id,
            label: label,
            documents: documents,
            annotators: [annotators[i], annotators[j]],
            annotatorsOrEmpty: [annotators[i], annotators[j]],
            tolerance: tolerance,
            byWords: byWords,
            hideNonText: hideNonText,
            contained: contained,
            documentsData: documentsData,
            documentsOptions: documentsOptions,
          });

          const ck_metrics = await $fetch("/api/metrics/get_metrics", {
            method: "POST",
            body: metric_body,
          });

          ck_metrics.map((m) => {
            if (m.name == "cohens_kappa") {
              rowsMetrics.push({
                metric: m.name,
                annotators: annotators[i] + "," + annotators[j],
                value: m.result,
                p0: m.po,
                pe: m.pe,
                tolerance: tolerance,
                consider_contained: contained ? "yes" : "no",
              });
            }
          });
          // break;
        } catch (error) {
          ck_timeout--;
          console.log("FAILED", error);
        }
        // }
      }
    }
  }

  const worksheetMetrics = XLSX.utils.json_to_sheet(rowsMetrics);
  const worksheetAnnotations = XLSX.utils.json_to_sheet(rowsAnnotations);
  return [worksheetMetrics, worksheetAnnotations];
};

const getZippeableBlob = (workBook: XLSX.WorkBook) => {
  const b64Data = XLSX.write(workBook, {
    bookType: "xlsx",
    type: "base64",
    compression: true,
  });

  const contentType = "application/octet-stream";

  return `data:${contentType};base64,${b64Data}`;
};
