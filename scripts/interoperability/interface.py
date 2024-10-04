
from typing import List, TypedDict

"""
The following classes are based on the TypeScript definition of Lawnotation's Tasks:

interface Task {
  "name": string,
  "desc": string,
  "labelset": {
    "name": string,
    "color": string
  }[],
  "ann_guidelines": string,
  "documents": {
    "name": string,
    "full_text": string,
    "assignments": {
      "annotations": {
        "start": number,
        "end": number,
        "label": string,
        "text": string,
        "relations": {
          "to": number,
          "direction": string,
          "labels": string[]
        }[],
        "ls_id": string,
        "confidence_rating": number,
      }
    }[]
  }[],
  "counts": {
    "documents": number,
    "assignments": number,
    "annotators": number,
    "annotations": number,
    "relations": number,
  },
  "annotation_level": string
}
"""
class Label(TypedDict):
    name: str
    color: str
class Labelset(TypedDict):
    name: str
    desc: str
    labels: List[Label]
class Relation(TypedDict):
    to: int
    direction: str
    labels: List[str]
class Annotation(TypedDict):
    start: int
    end: int
    label: str
    text: str
    relations: List[Relation]
    ls_id: str
    confidence_rating: float
class Assignment(TypedDict):
    annotations: List[Annotation]
class Document(TypedDict):
    name: str
    full_text: str
    assignments: List[Assignment]
class Counts(TypedDict):
    documents: int
    assignments: int
    annotators: int
    annotations: int
    relations: int
class Task(TypedDict):
    name: str
    desc: str
    labelset: Labelset
    ann_guidelines: str
    documents: List[Document]
    counts: Counts
    annotation_level: str
