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

def text_line_annotations(custom_attr, line_text, pre_length):
  pattern = r'(\w+)\s*\{([^}]+)\}'

  annotations = []
  matches = re.findall(pattern, custom_attr)
  # print(matches)
  for label, attributes in matches:
    if label == 'readingOrder':
      continue
    attr_dict = {}
    for attr in attributes.split(';'):
      if ':' in attr:
        attr_key, attr_value = attr.split(':')
        attr_dict[attr_key.strip()] = attr_value.strip()
    
    if 'offset' not in attr_dict or 'length' not in attr_dict:
      continue

    start = int(attr_dict['offset'])
    end = start + int(attr_dict['length'])
    continued = 'continued' in attr_dict

    annotations.append({
      'label': label,
      'start' : start + pre_length,
      'end': end + pre_length,
      'continued': continued,
      'text': line_text[start:end]
    })

    # annotations.sort(key=lambda x: x['start'])

  return annotations

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

    def parse_custom(custom):
      # Extract annotations from the 'custom' attribute
      annotations = []
      for match in re.finditer(r"(\w+)\s*\{offset:(\d+); length:(\d+);?( continued:true;?)?\}", custom):
        label, offset, length, continued = match.groups()
        annotations.append({
          "label": label,
          "offset": int(offset),
          "length": int(length),
          "continued": bool(continued)
        })
      return annotations

    # root = ET.fromstring(xml_string)
    lines = []
    complete_text = ""
    ongoing_annotations = {}

    for region in root.findall(".//page:TextRegion", ns):
      for line in region.findall("page:TextLine", ns):
        # Extract text content and annotations
        textequiv = line.find("page:TextEquiv", ns)
        text = textequiv.find("page:Unicode", ns).text.strip()
        
        custom = line.get("custom", "")
        annotations = parse_custom(custom)

        # Record the line's start and end offsets relative to the complete text
        line_start_offset = len(complete_text)
        line_end_offset = line_start_offset + len(text)
        complete_text += text + "\n"  # Add newline to separate lines in the full text

        # Process annotations on this line
        for annotation in annotations:
          label = annotation["label"]
          start_offset = line_start_offset + annotation["offset"]
          end_offset = start_offset + annotation["length"]
          is_continued = annotation["continued"]

          if label in ongoing_annotations:
            # If continuing an annotation, extend it
            ongoing_annotations[label]["end"] = end_offset
            ongoing_annotations[label]["text"] += " " + text[annotation["offset"]:annotation["offset"] + annotation["length"]]
            
            if not is_continued:
              # If continuation ends here, finalize and save
              lines.append(ongoing_annotations.pop(label))
          else:
            # Start a new annotation
            ongoing_annotations[label] = {
              "label": label,
              "start": start_offset,
              "end": end_offset,
              "text": text[annotation["offset"]:annotation["offset"] + annotation["length"]]
            }
            if not is_continued:
              # Finalize immediately if not continued
              lines.append(ongoing_annotations.pop(label))

        # Append any remaining ongoing annotations
        for annotation in ongoing_annotations.values():
          lines.append(annotation)
        
        complete_text += "\n"

    annotations = [
      {
        'label': ann['label'],
        'start': ann['start'],
        'end': ann['end'],
        'text': ann['text'],
        'ls_id': random_string(10),
        'relations': [],
        'confidence_rating': 0
      } for ann in lines
    ]

    annotations.sort(key=lambda x: x['start'])

    return {
      'name': str('.'.join(os.path.basename(file.name).split('.')[:-1])) + '.txt',
      'full_text': document_text,
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