'use strict';

import { window, workspace, TextEditorEdit, Range, Position, TextEditor } from 'vscode';
import { enumerateImports, getCurrentPackageRoot, ImportMeta, Imports } from './importUtils';

export enum SortType {
  NONE = 'none',
  ALPHABETIC = 'alphabetic',
}

export enum GroupType {
  CLUMPED = 'clumped',
  SEPARATE_DEPENDENCIES = 'separate-deps'
}

export function order() {
  let editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  const config = workspace.getConfiguration('haxe.hoister');
  let sortType = matchValueToEnum<SortType>(config.importSortingType, SortType);
  if (!sortType) {
    window.showInformationMessage('Configuration value for `haxe.hoister.importSortingType` is invalid.');
    return;
  }

  let groupType = matchValueToEnum<GroupType>(config.importSeparationType, GroupType);
  if (!groupType) {
    window.showInformationMessage('Configuration value for `haxe.hoister.importSeparationType` is invalid.');
    return;
  }

  let separateWildcards = config.importSeparateWildcards;

  startSorting(editor, sortType, groupType, separateWildcards);
}

export async function startSorting(editor:TextEditor, sortType:SortType, groupType:GroupType, separateWildcards:boolean) {
  const text = editor.document.getText();
  const sourceImports = enumerateImports(text);
  const packageRoot = getCurrentPackageRoot(text);
  const sortedImports = sort(sourceImports, sortType);
  const groupedImports = group(sortedImports, packageRoot, separateWildcards, groupType);

  await editor.edit((builder) => {
    removeImports(builder, sourceImports);
  });

  // There does not seem to exist an option to get this in one edit-pass. Shame
  editor.edit((builder) => {
    clearWhitespace(builder, editor.document.getText(), sourceImports.firstImportLine);
    insertImports(builder, sourceImports.firstImportLine, groupedImports);
  });
}

function removeImports(builder:TextEditorEdit, source:Imports) {
  for (const item of source.unique.values()) {
    builder.delete(new Range(item.lineNumber!, 0, item.lineNumber! + 1, 0));
  }
}

function insertImports(builder:TextEditorEdit, insertPoint:number, source:ImportMeta[][]) {
  for (const group of source) {
    for (const imp of group) {
      let line = `import ${imp.hoisted}`;
      if (imp.alias) {
        line += ` as ${imp.alias}`;
      }
      line += ';\n';
      builder.insert(new Position(insertPoint, 0), line);
    }

    if (group.length > 0) {
      builder.insert(new Position(insertPoint, 0), '\n');
    }
  }

  // builder.insert(new Position(insertPoint, 0), '\n');
}

function matchValueToEnum<E>(value:string, e:any):(E | null) {
  for (const key in e) {
    if (value !== e[key]) {
      continue;
    }

    return <E> e[key];
  }

  return null;
}

function sort(source: Imports, type: SortType): ImportMeta[] {
  const imports = [...source.unique.values()].sort((a, b) => {
    const WILDCARD_WEIGHT = 1e7;
    let aWeigth = 0;
    let bWeigth = 0;
    if (a.shortName === '*') {
      aWeigth -= WILDCARD_WEIGHT;
    }
    if (b.shortName === '*') {
      bWeigth -= WILDCARD_WEIGHT;
    }

    if (a.hoisted > b.hoisted) {
      aWeigth += 1;
    } else if (a.hoisted < b.hoisted) {
      bWeigth += 1;
    }

    return aWeigth - bWeigth;
  });

  return imports;
}

function group(source:ImportMeta[], packageRoot:(string | null), separateWildcards:boolean, type: GroupType): ImportMeta[][] {
  let groups: ImportMeta[][] = [];

  if (type === GroupType.SEPARATE_DEPENDENCIES && packageRoot) {
    // 0? -> wildcards
    // 1  -> dependencies
    // 2  -> own
    groups = [[], [], []];

    for (const imp of source) {
      if (separateWildcards && imp.shortName === '*') {
        groups[0].push(imp);
      } else if (!imp.moduleName.startsWith(packageRoot)) {
        groups[1].push(imp);
      } else {
        groups[2].push(imp);
      }
    }
  } else {
    if (!separateWildcards) {
      return [source];
    }

    groups = [[], []];

    for (const imp of source) {
      if (imp.shortName === '*') {
        groups[0].push(imp);
      } else {
        groups[1].push(imp);
      }
    }
  }

  return groups;
}

function clearWhitespace(builder:TextEditorEdit, text:string, startLine:number) {
  for(let [i, line] of text.split('\n').entries()) {
    if (i < startLine) {
      continue;
    }
    
    line = line.trim();

    if (line === '') {
      builder.delete(new Range(i, 0, i + 1, 0));
    } else {
      break;
    }
  }
}