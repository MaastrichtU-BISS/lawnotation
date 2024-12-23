import string
import os, sys
import json
import re
import random
from converter import Converter
from interface import Document, Task
import xml.etree.ElementTree as ET

def element_tag(element):
    return element.tag.split('}', 1)[1] if '}' in element.tag else element.tag

def generate_random_hex_color():
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

def random_string(length):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

class TranskribusConverter(Converter):

  # class Task(TypedDict):
  #   name: str
  #   desc: str
  #   labelset: List[Label]
  #   ann_guidelines: str
  #   documents: List[Document]
  #   counts: Counts
  #   annotation_level: str
  # class Document:
  #   name: str
  #   full_text: str
  #   assignments: List[Assignment]

  def process_document(self, file, doc_num) -> Document:
    
    document_text = ''
    # annotations = []

    tree = ET.parse(file)
    root = tree.getroot()
    ns = {'page': 'http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15'}

    def parse_custom(custom, text):
      # Extract annotations from the 'custom' attribute
      annotations = []
      for match in re.finditer(r"(\w+)\s*\{offset:(\d+); length:(\d+);?( continued:true;?)?\}", custom):
        label, offset, length, continued = match.groups()
        offset = int(offset)
        length = int(length)
        continued = bool(continued)
        annotations.append({
          "label": label,
          "offset": offset,
          "length": length,
          "continued": continued,
          "text": text[offset:offset+length]
        })
      return annotations

    # root = ET.fromstring(xml_string)
    result = []
    complete_text = ""
    cont_annotations = {}

    for region in root.findall(".//page:TextRegion", ns):

      for line in region.findall("page:TextLine", ns):
        # Extract text content and annotations
        textequiv = line.find("page:TextEquiv", ns)
        text = textequiv.find("page:Unicode", ns).text.strip()
        
        custom = line.get("custom", "")
        annotations = parse_custom(custom, text)

        # print(text)
        # print(annotations)

        # Record the line's start and end offsets relative to the complete text
        line_start_offset = len(complete_text)
        line_end_offset = line_start_offset + len(text)
        complete_text += text + "\n"  # Add newline to separate lines in the full text

        ## TRAILING (check 13 and 18)
        for cont_ann in cont_annotations.copy().values():
          label_found = False
          for ann in annotations:
            if ann['label'] == cont_ann['label']: label_found = True
          if not label_found:
            pop_ann = cont_annotations.pop(cont_ann['label'])
            if 'multiregion' in pop_ann and pop_ann['multiregion'] == True:
              pop_ann['end'] -= 1
              pop_ann['text'] = pop_ann['text'][:-1]
            result.append(pop_ann)
        ## END TRAILING

        # Process annotations on this line
        for annotation in annotations:
          label = annotation["label"]
          start_offset = line_start_offset + annotation["offset"]
          end_offset = start_offset + annotation["length"]
          is_continued = annotation["continued"]

          if is_continued:
            if annotation['offset'] == 0 and label in cont_annotations:
              # Continuing previous line, adding to cont_
              cont_annotations[label]['text'] += '\n' + annotation['text']
              cont_annotations[label]['end'] += annotation['length'] + 1
            
            if end_offset == line_end_offset and label not in cont_annotations:
              # Continuing to next line
              cont_annotations[label] = {
                'label': label,
                'text': annotation['text'],
                'start': start_offset,
                'end': end_offset
              }

            elif end_offset < line_end_offset and label in cont_annotations:
              # Continued until this line

              result.append(cont_annotations.pop(label))

          else:
            result.append({
              'label': label,
              'text': annotation['text'],
              'start': start_offset,
              'end': end_offset
            })
        
      # Append any remaining ongoing annotations
      # for annotation in cont_annotations.values():
      #   result.append(annotation)
      
      complete_text += "\n"
      # for annotations spanning multiple textregions:
      for label in cont_annotations.keys(): cont_annotations[label]['text'] += '\n'
      for label in cont_annotations.keys(): cont_annotations[label]['end'] += 1
      for label in cont_annotations.keys(): cont_annotations[label]['multiregion'] = True
    
    annotations = [
      {
        'label': ann['label'],
        'start': ann['start'],
        'end': ann['end'],
        'text': ann['text'],
        'ls_id': random_string(10),
        'relations': [],
        'confidence_rating': 0
      } for ann in result
    ]

    annotations.sort(key=lambda x: x['start'])

    return {
      'name': str('.'.join(os.path.basename(file.name).split('.')[:-1])) + '.txt',
      'full_text': complete_text,
      'assignments': [{
        'annotator': 1,
        'order': doc_num + 1,
        'difficulty_rating': 0,
        'annotations': annotations
      }]
    }
  
  def convert_from(self, files):
    if not isinstance(files, list):
      files = [*files]

    labelset = set()
    count_docs = 0
    count_annotations = 0

    docs = []
    for file in files:
      doc = self.process_document(file, count_docs)
      docs.append(doc)
      count_docs += 1
      count_annotations += len(doc['assignments'][0]['annotations'])
      
      labels = [
        ann['label'] 
        for ann in doc['assignments'][0]['annotations']
      ]
      for label in labels:
        if label not in labelset:
          labelset.add(label)

    task: Task = {
      'name': 'Converted from Transkribus',
      'desc': 'This task is generated from Transkribus using the interoperability tools',
      'ann_guidelines': '',
      'labelset': {
        'name': 'Generated Labelset',
        'desc': 'Automatically generated labelset from Transkribus file',
        'labels': [
          {'name': label, 'color': generate_random_hex_color()}
          for label in labelset
        ]
      },
      'documents': docs,
      'counts': {
        'documents': count_docs,
        'assignments': count_docs,
        'annotators': 1,
        'annotations': count_annotations,
        'relations': 0
      },
      'annotation_level': 'symbol'
    }

    task_json = json.dumps(task, indent=2)

    return task_json