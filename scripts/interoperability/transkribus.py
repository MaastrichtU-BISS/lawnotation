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
    annotations = []

    tree = ET.parse(file)
    root = tree.getroot()
    ns = {'page': 'http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15'}

    for text_region in root.findall('.//page:TextRegion', ns):
      
      cont_annotations = [] # continuing annotations
      line_annotations = []

      for text_line in text_region.findall('page:TextLine', ns):
        
        line_text = ''
        for text_equiv in text_line:
          if element_tag(text_equiv) == 'TextEquiv':
            for content_el in text_equiv.findall('page:Unicode', ns):
              line_text += content_el.text

        pre_doc_length = len(document_text)
        new_line_annotations = text_line_annotations(text_line.get('custom'), line_text, pre_doc_length)
        

        for line_ann_i in range(len(new_line_annotations)):
          line_ann = new_line_annotations[line_ann_i]
          if line_ann['continued']:
            if line_ann['start'] == pre_doc_length:
              # start == 0: a continued annotation from previous line, or an annotation that spans to the next line

              # the continuing annotation for this iteration is the one in the stack with the same label
              cont_ann_id, cont_ann = next((id, x) for id, x in enumerate(cont_annotations) if x['label'] == line_ann['label'])

              if cont_ann and not line_ann['end'] == pre_doc_length + len(line_text):
                del cont_annotations[cont_ann_id]
                # combine last annotations
                # line_ann['start'] = 0 - len(continuing_ann['text']) - 1
                line_ann['text'] = cont_ann['text'] + '\n' + line_text[0:line_ann['end']]
                # line_annotations.append()
                # if line_ann['end'] == len(line_text):
                #   del continuing_annotations[continuing_ann_id]
                line_annotations.append({
                  'start': cont_ann['start'],
                  'end': line_ann['end'],
                  'text': 'AGGR'+line_ann['text'],
                  'label': cont_ann['label']
                })

            if line_ann['end'] == pre_doc_length + len(line_text):
              # end == length: a continued annotation that spans until the next line
              cont_annotations.append(line_ann)
              
          else:
            line_annotations.append(line_ann)


        # put every textline on new line
        document_text += line_text + '\n'
        
        # split text regions by extra newline
        document_text += '\n'
      

      # if line_annotations[-1]['continued'] and \
      #   line_annotations[-1]['end'] == len(line_text):
      #     continuing_ann = line_annotations.pop()

      annotations.extend([
        {
          'label': ann['label'],
          'start': ann['start'],
          'end': ann['end'],
          'text': ann['text'],
          'ls_id': random_string(10),
          'relations': [],
          'confidence_rating': 0
        } for ann in line_annotations if ann is not None
      ])

      annotations.sort(key=lambda x: x['start'])
    
    return {
      'name': str('.'.join(os.path.basename(file.name).split('.')[:-1])) + '.txt',
      # 'name': os.path.basename(file.name),
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