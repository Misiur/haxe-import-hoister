const SKIP_REGEX = /^package|using|#|\*|\//i;

export interface Imports {
  unique: Map<string, ImportMeta>
  wildcards: Set<string>
  firstImportLine: number
  lastImportLine: number
}

export interface ImportMeta {
  hoisted: string
  moduleName: string
  shortName: string
  lineNumber?: number
  enumValue?: string
  alias?: string
}

export function enumerateImports(text: string): Imports {
  const lines = text.split('\n').map(el => el.trim());

  const unique = new Map<string, ImportMeta>();
  const wildcards = new Set<string>();
  let lastImportLine = 0;
  let firstImportLine = 0;

  for (const [i, line] of lines.entries()) {
    if (!line.startsWith('import')) {
      if (line === '' || SKIP_REGEX.test(line)) {
        continue;
      }

      break;
    }

    if (firstImportLine == 0) {
      firstImportLine = i;
    }

    const lineParts = line.split(' ');
    if (!lineParts.every(part => part !== 'in')) {
      continue;
    }
    let name = lineParts[1];
    name = name.split(';')[0].trim();

    const parts = name.split('.');
    const lastPart = parts.slice(-1)[0];
    const modulePath = parts.slice(0, -1).join('.');
    if (wildcards.has(modulePath) || unique.has(name)) {
      continue;
    }

    if (lastPart === '*') {
      wildcards.add(modulePath);
    }

    const item: ImportMeta = {
      moduleName: modulePath,
      shortName: lastPart,
      hoisted: name,
      lineNumber: i
    };

    if (lineParts.length > 2) {
      item.alias = lineParts.slice(-1)[0].split(';')[0];
    } else {
      item.alias = lastPart;
    }

    unique.set(name, item);
    lastImportLine = i;
  }

  return {
    firstImportLine,
    lastImportLine,
    unique,
    wildcards
  };
}

export function getCurrentPackageRoot(source: string): string | null {
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('package')) {
      const parts = trimmed.split(' ');
      if (parts.length === 1) {
        return null;
      }

      return parts[1].split('.')[0].split(';')[0];
    }
  }

  return null;
}
