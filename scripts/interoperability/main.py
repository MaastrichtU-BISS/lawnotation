#!/usr/bin/env python3

import os
import argparse
from doccano import DoccanoConverter

def dir_path(path):
    if not os.path.isdir(path):  
      os.makedirs(path)
    return path

def main():
  parser = argparse.ArgumentParser(
    description="Convert Lawnotation Task to their respective structure, understood by other tools"
  )

  parser.add_argument(
    'input',
    type=argparse.FileType('r', encoding='UTF-8'),
    help="Path for the Lawnotation Task in JSON format to convert"
  )

  parser.add_argument(
    'format',
    type=str,
    choices=[
      'doccano',
      'labelstudio',
    ],
    help="The format to which the task should be converted",
  )

  parser.add_argument(
    'output',
    type=dir_path,
    help="Path of directory to save the converted files"
  )

  args = parser.parse_args()

  # print(args.input.)

  try:  
    if args.format == 'doccano':
      converter = DoccanoConverter(args.input)
    elif args.format == 'labelstudio':
      converter = OtherConverter(args.input)
    else:
      raise Exception("Unknown output format:", args.format)
  except Exception as e:
    print("An error occured when processing the input-file.")
    raise e

  try:
    files = converter.convert()
  except Exception as e:
    print("An error occured when converting the file.")
    raise e

  try:
    for file in files:
      with open(os.path.join(args.output, file['name']), 'w') as f:
        f.write(file['content'])
        print(f"Saved '{file['name']}'")
  except Exception as e:
    print("An error occured when saving the converted files")
    raise e


  args.input.close()

if __name__ == '__main__':
  main()
