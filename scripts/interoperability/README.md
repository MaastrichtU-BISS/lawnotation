# Interoperability

This directory contains some scripts that enable users to easily convert tasks exported from Lawnotation to equivalent formats supported by different platforms, or the other way around.

## Usage

1. Prerequisites
The scripts are written in Python, so make sure that Python 3 is installed. No further dependencies are required at time of writing. Note that depending on your environment, the command for `python` might need to include a version number, such as `python3`.

1. If prefered, place the exported task from Lawnotation in this folder, to ease finding the correct path of the task.

2. Open a terminal in this folder

3. Run the file main.py with python, with the supported arguments:
   - Help:
     - `python main.py --help` for an overview of the compatible arguments
  - Convert from other format **to Lawnotation task**
     - `python main.py -f <source format> -i <input> -o <output task>`
     - Replace `<format>` with one of the [supported formats](#supported-formats) that can be used for converting to lawnotation.
     - Replace `<input>` with the source file in the chosen format
     - Replace `<output task>` with the desired location for the generated Lawnotation Task
   - Convert **form Lawnotation task** to another format
     - `python main.py -t <target format> -i <input task(s)> -o <output file(s)>`
     - Replace `<format>` with one of the [supported formats](#supported-formats) that can be used for converting from lawnotation tasks.
     - Replace `<input task(s)>` with the source Lawnotation task json file
     - Replace `<output file(s)>` with the desired location or folder for the generated files


## Supported formats

- From other **to Lawnotation**:
  - [Doccano](#doccano)
- **From Lawnotation** to other:
  - [Transkribus](#transkribus)

### Doccano

- From Lawnotation to Doccano:
  - One Lawnotation Task will map to one or more Doccano JSON files.
  - `<output>` is a folder

> [!NOTE]
> Doccano does not support HTML documents. Therefore, such documents will be ignored.

Example:
```
python3 main.py -t doccano -i docs-in/lawnotation-task.json -o docs-out/doccano-test
```

### Transkribus

- From Transkribus to Lawnotation:
  - One or more transkribus files map to one lawnotation task file
  - `<output>` is a file

Example:
```
python3 main.py -t doccano -i docs-in/transkribus/page/*.xml -o docs-out/lawnotation-task.json
```
