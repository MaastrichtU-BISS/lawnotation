# Interoperability

This directory contains some scripts that enable users to easily convert tasks exported from Lawnotation to equivalent formats supported by different platforms.

## Usage

1. Prerequisites
The scripts are written in Python, so make sure that Python is installed. No further dependencies are required at time of writing.

2. If prefered, place the exported task from Lawnotation in this folder, to avoid determining the correct path of the task

3. Open a terminal in this folder

4. Run the file main.py with python, with the correct arguments:
   - `python main.py input.json <output format> <output directory>`
   - Replace `<output format>` with one of the [supported formats](#supported-formats).
   - Replace `<output directory>` with a folder path.

## Supported formats

### Doccano

- From Lawnotation to Doccano:
  - One Lawnotation Task will map to one or more Doccano JSON files.

> [!NOTE]
> Doccano does not support HTML documents. Therefore, such documents will be ignored.

Example:
```
mkdir out-doccano
python main.py example.json doccano out-doccano
```