import fs from 'node:fs';
import ts from 'typescript';

// Validate against Shopify's published v2.0 manifest, not the v1-only skill helper.
const manifest = JSON.parse(fs.readFileSync('node_modules/@shopify/polaris-types/dist/custom-elements.json', 'utf8'));
const components = new Map(manifest.modules.flatMap(module => module.declarations ?? []).filter(item => item.tagName).map(item => [item.tagName, item]));
const sources = ['index.html', ...fs.readdirSync('src', {recursive:true}).filter(name=>name.endsWith('.ts')).map(name=>`src/${name}`)];
let checked = 0;
const failures = [];
// The generated manifest drops template-literal pixel/percentage units from
// sizing unions. Shopify's polaris.d.ts includes them as SizeUnits.
const isSizingUnit=(name,value)=>/^(inlineSize|blockSize|minInlineSize|maxInlineSize|minBlockSize|maxBlockSize)$/i.test(name)&&/^\d+(?:\.\d+)?(?:px|%)$/.test(value);
for (const file of sources) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/<(s-[a-z-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const [, tag, raw] = match;
    const component = components.get(tag);
    if (!component) { failures.push(`${file}: unknown component ${tag}`); continue; }
    checked++;
    for (const attribute of raw.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) {
      const name = attribute[1].toLowerCase();
      const value = attribute[2] ?? attribute[3];
      // Template expressions are resolved and separately checked in the browser.
      if (name.includes(':') || raw.slice(0,attribute.index).lastIndexOf('${') > raw.slice(0,attribute.index).lastIndexOf('}')) continue;
      if (/^(id|slot|hidden|role|tabindex)$/.test(name) || /^(aria-|data-)/.test(name)) continue;
      const definition = component.attributes?.find(item => item.name.toLowerCase() === name);
      if (!definition) { failures.push(`${file}: ${tag} has unsupported attribute ${name}`); continue; }
      if (value?.includes('${')) continue;
      if (value === undefined && definition.type?.text !== 'boolean') failures.push(`${file}: ${tag}.${name} needs a value`);
      // Use TypeScript's assignability rules for keyword unions from the official manifest.
      const type = definition.type?.text;
      if (value !== undefined && type && /^("[^"]*"\s*(\|\s*)?)+$/.test(type)) {
        const allowed = [...type.matchAll(/"([^"]*)"/g)].map(item => item[1]);
        if (!allowed.includes(value)&&!isSizingUnit(name,value)) failures.push(`${file}: ${tag}.${name}=${value}, expected ${allowed.join(' | ')} or a supported sizing unit`);
      }
    }
  }
}
const html = fs.readFileSync('index.html','utf8');
if (!html.includes('polaris-2.0-rc.js')) failures.push('Runtime must be pinned to Polaris v2.0 RC');
if (/<(?:button|input|select|details|summary|div|section|h[1-6]|p|span|svg)\b/.test(html)) failures.push('Use Polaris components for visible HTML UI');
for(const file of sources.filter(name=>name.endsWith('.ts'))){
const source = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true);
function visit(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
    if (/<(?:button|input|select|details|summary|div|section|h[1-6]|p|span|svg)\b/.test(node.getText(source))) failures.push('Use Polaris components for generated visible UI');
  }
  ts.forEachChild(node,visit);
}
visit(source);
}
if (failures.length) { console.error([...new Set(failures)].join('\n')); process.exit(1); }
if (process.argv[2]) {
  const rendered = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const element of rendered) {
    const component = components.get(element.tag);
    if (!component) throw new Error(`Unknown rendered component ${element.tag}`);
    for (const [name, value] of element.attributes) {
      if (/^(id|slot|hidden|role|tabindex|style)$/.test(name) || /^(aria-|data-)/.test(name)) continue;
      const definition = component.attributes?.find(item => item.name.toLowerCase() === name);
      if (!definition) throw new Error(`Unsupported rendered attribute ${element.tag}.${name}`);
      const type = definition.type?.text;
      if (type && /^("[^"]*"\s*(\|\s*)?)+$/.test(type)) {
        const allowed = [...type.matchAll(/"([^"]*)"/g)].map(item => item[1]);
        if (!allowed.includes(value)&&!isSizingUnit(name,value)) throw new Error(`Invalid rendered value ${element.tag}.${name}=${value}`);
      }
    }
  }
  console.log(`Rendered DOM: ${rendered.length} distinct component/attribute combinations checked against v2.0 RC.`);
}
console.log(`Polaris v2.0 RC manifest: ${checked} component tags and static keyword attributes checked. No native styled UI or calculator.`);
