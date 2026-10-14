#!/usr/bin/env python3
"""Compare private local exports without printing records or credentials."""
import hashlib, json, pathlib, sys, zipfile
def digest(value):
    return hashlib.sha256(value).hexdigest()
with zipfile.ZipFile(sys.argv[1]) as archive:
    result = {'tables': {}, 'files': {}}
    names = archive.namelist()
    if len(names) != len(set(names)):
        raise ValueError('Duplicate archive names')
    for name in names:
        if name.endswith('/documents.jsonl') and not name.endswith('_tables/documents.jsonl'):
            rows = [json.loads(line) for line in archive.read(name).splitlines() if line.strip()]
            rows.sort(key=lambda row: row['_id'])
            result['tables'][name] = {'count': len(rows), 'sha256': digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())}
        elif '/_storage/' in '/' + name and not name.endswith('/') and not name.endswith('.jsonl'):
            result['files'][name] = digest(archive.read(name))
pathlib.Path(sys.argv[2]).write_text(json.dumps(result, sort_keys=True, indent=2))
if len(sys.argv) == 4 and result != json.loads(pathlib.Path(sys.argv[3]).read_text()):
    raise ValueError('Restored records or file bytes differ')
print(json.dumps({'tables': len(result['tables']), 'documents': sum(t['count'] for t in result['tables'].values()), 'files': len(result['files']), 'comparison': 'passed' if len(sys.argv) == 4 else 'captured'}))
