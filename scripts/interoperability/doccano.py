from io import TextIOWrapper
import json
from converter import Converter
from interface import Task

"""
Doccano

In the import process in Doccano, the following example is presented as a 'jsonl' file.
  {"text": "EU rejects German call to boycott British lamb.", "label": [[0, 2, "ORG"]]}
  {"text": "Peter Blackburn", "label": [[0, 15, "PERSON"]]}
  {"text": "President Obama", "label": [[10, 15, "PERSON"]]}

In the examples folder of the backend data_import route, the following example for sequence label is provided:
  {"text": "exampleA", "label": [[0, 1, "LOC"]], "meta": {"wikiPageID": 1}}
  {"text": "exampleB", "label": [], "meta": {"wikiPageID": 2}}
  {"label": [[0, 1, "PER"]], "meta": {"wikiPageID": 3}}

It appears as if the rows represent documents, and the labels represent all the annotations in the document.
The annotations are represented by a 3-tuple, with the format [start-index, end-index, label].

Since one dataset file appears to contain the annotations of a single annotator the output is split on an annotator level.
This hypothesis is confirmed by producing an export, which results in a file for each annotator.
"""

class DoccanoConverter(Converter):

  def convert_to(self, input: TextIOWrapper):
    task = json.load(input)

    out_datasets = {}

    for in_doc in task['documents']:
      if in_doc['name'][-5:] == ".html":
        print(f"Skipping document '{in_doc['name']}'; HTML documents are not supported in Doccano")
        continue

      for in_assignment in in_doc['assignments']:

        out_labels = []

        for in_annotation in in_assignment['annotations']:
          out_labels.append([
            in_annotation['start'],
            in_annotation['end'],
            in_annotation['label']
          ])

        out_dataset = {
          'text': in_doc['full_text'],
          'label': out_labels
        }

        if in_assignment['annotator'] in out_datasets:
          out_datasets[in_assignment['annotator']].append(out_dataset)
        else:
          out_datasets[in_assignment['annotator']] = [out_dataset]

    out_files = [
      {
        'name': f"annotator-{annotator}.json",
        'content': "\n".join([json.dumps(doc) for doc in dataset]) # jsonl format
      }
      for annotator, dataset in out_datasets.items()
    ]

    return out_files
