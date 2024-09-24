import json

from interface import Task

class Converter:
  input: Task
  def __init__(self, input):
    self.input = json.load(input)
