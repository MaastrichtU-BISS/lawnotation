export default eventHandler(async (event) => {
  const data = await readBody(event);
//   var data = {
//     annotators: ['ann1', 'ann2', 'ann3'],
//     labels: ['A', 'B'],
//     annotations: [
//         {
//             label: "A",
//             start: 10,
//             end: 21,
//             annotator: "ann1"
//         },
//         {
//             label: "B",
//             start: 25,
//             end: 31,
//             annotator: "ann1"
//         },
//         {
//             label: "A",
//             start: 35,
//             end: 41,
//             annotator: "ann1"
//         },
//         {
//             label: "A",
//             start: 10,
//             end: 21,
//             annotator: "ann2"
//         },
//         {
//             label: "B",
//             start: 25,
//             end: 31,
//             annotator: "ann2"
//         },
//         {
//             label: "A",
//             start: 35,
//             end: 42,
//             annotator: "ann2"
//         },
//         {
//             label: "B",
//             start: 10,
//             end: 21,
//             annotator: "ann3"
//         },
//         {
//             label: "B",
//             start: 25,
//             end: 31,
//             annotator: "ann3"
//         },
//         {
//             label: "A",
//             start: 35,
//             end: 42,
//             annotator: "ann3"
//         },
//     ]

//   };
  const table = createContingencyTable(data.annotations, data.labels, data.annotators);
  return computeFleissKappa(table);
});

type RangeLabel = {
    start: string,
    end: string,
    label: string,
    annotators: any
};

type FleissKappaResult = {
    p0: number,
    pe: number,
    result: number,
    table: RangeLabel[]
};

function containsRangeLabel(list: RangeLabel[], range: RangeLabel, tolerance: number = 0) : number {
    for (let i = 0; i < list.length; i++) {
        const x = list[i];
        if (x.start == range.start && x.end == range.end && x.label == range.label)
            return i;
    }
    return -1;
}

function createContingencyTable(annotations: any[], labels: string[], annotators: string[]) : RangeLabel[] {

    var ranges: RangeLabel[] = [];
    
    annotations.forEach(x => {
        const ann: RangeLabel = { start: x.start, end: x.end, label: x.label, annotators: {} };
        const index = containsRangeLabel(ranges, ann);
        if(index < 0) {
            ranges.push(ann);
            annotators.forEach(a => {
                ranges[ranges.length - 1].annotators[a] = x.annotator == a ? 1 : 0;
            });
        } else {
            ranges[index].annotators[x.annotator]++;
        }
    });

    return ranges;
}

function computeFleissKappa(table: RangeLabel[]) : FleissKappaResult {
    var nN: number = table.length * Object.entries(table[0].annotators).length;
    var total_sum: number = 0;
    var pe: number = 0;

    table.forEach(range => {
        Object.entries(range.annotators).forEach(([k,v]) => {
            pe += (v as number / nN) * (v as number / nN);
            total_sum += v as number;
        });
    });

    var p0: number = total_sum / nN;

    var kappa: number = (p0 - pe) / (1 - pe);

    return {
        p0: p0,
        pe: pe,
        result: kappa,
        table: table
    } as FleissKappaResult;
}