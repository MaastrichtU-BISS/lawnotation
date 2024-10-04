#!/usr/bin/env python3

import os
import sys
import argparse
from doccano import DoccanoConverter
from transkribus import TranskribusConverter

def dir_path(path):
    if not os.path.isdir(path):  
      os.makedirs(path)
    return path

def main():
  
  converters = {
    'doccano': DoccanoConverter,
    'transkribus': TranskribusConverter,
    # 'labelstudio': ... 
  }

  choices_from = [k for k,v in converters.items() if hasattr(v, 'convert_from') and callable(v.convert_from)]
  choices_to = [k for k,v in converters.items() if hasattr(v, 'convert_to') and callable(v.convert_to)]

  parser = argparse.ArgumentParser(
    description="Convert annotation data form or to a format understood by Lawnotation. Either the argument --from or --to is required, but not both."
  )

  group = parser.add_mutually_exclusive_group(required=True)

  parser.add_argument(
    '-i',
    '--input',
    type=argparse.FileType('r', encoding='UTF-8'),
    help="Path for the Lawnotation Task in JSON format to convert",
    nargs="*",
    required=True
  )

  parser.add_argument(
    '-o',
    '--output',
    # type=dir_path,
    type=str,
    help="Path of directory to save the converted files",
    required=True
  )

  group.add_argument(
    '-f',
    '--from',
    type=str,
    choices=[
      'transkribus'
    ],
    help=f"Input format to convert from. Supported options: {', '.join(choices_from)}",
    metavar='FROM'
  )

  group.add_argument(
    '-t',
    '--to',
    type=str,
    choices=[
      'doccano',
      'labelstudio',
    ],
    help=f"Output format to convert to. Supported options: {', '.join(choices_to)}",
    metavar='TO'
  )

  args = parser.parse_args(None if sys.argv[1:] else ['--help'])
  # print(args)
  # return

  converter_name = getattr(args, 'to') or getattr(args, 'from')
  direction = 'to' if getattr(args, 'to') else 'from' if getattr(args, 'from') else None
  converter = converters[getattr(args, 'to') or getattr(args, 'from')]
  converter_instance = converter()

  func = getattr(converter_instance, f"convert_{direction}")

  # print('Converting', direction, converter_name)
  
  result = func(args.input)

  # if not isinstance(args.input, list):
  #   result = func(args.input)
  # else:
  #   result = []
  #   for input in args.input:
  #     iteration_result = func(input)
  #     if isinstance(iteration_result, list):
  #       result.append(*iteration_result)
  #     else:
  #       result.append(iteration_result)

  try:
    if isinstance(result, list):
      # multiple files, output should be dir
      out_dir = dir_path(args.output)
      for file in result:
        with open(os.path.join(out_dir, file['name']), 'w') as f:
          f.write(file['content'])
          print(f"Saved '{file['name']}'")
    else:
      # single file, output should be file
      with open(args.output, 'w') as f:
        f.write(result)
  except Exception as e:
    print("An error occured when saving the converted files")
    raise e

  if isinstance(args.input, list):
    for input in args.input:
      input.close()
  else:
    args.input.close()

if __name__ == '__main__':
  main()
