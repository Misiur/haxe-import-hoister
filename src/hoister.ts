'use strict';

import { window, Range, Position, TextEditor } from 'vscode';

const PRECEDING_TOKENS = [':', '<', ','];
const CLASS_REGEX = /[:<\,](\s?)((([a-z]([0-9a-z_]+)\.?)+)\.([A-Za-z_]\w*)(\.([A-Z_][A-Z_]+))?)\s?(?:[\),>;=\{]|$)/g;
const SKIP_REGEX = /^package|using|#|\*|\//i;

export type HoistParams = {
  startIndex:number;
  replaceLength:number;
  lineNumber:number;
  hoisted:string;
  moduleName:string;
  shortName:string;
};

type Conflicts = Map<string, { count:number, conflicts:HoistParams[] }>;

type Imports = {
  unique:Set<string>;
  wildcards:Set<string>;
  lastImportLine:number;
};

export enum HoistMode {
  CURRENT = 'current',
  LINE = 'line',
  FILE = 'file'
}

export enum DuplicatesAction {
  SKIP = 'skip',
  FORCE = 'force',
  ALIAS = 'alias'
}

function hoistCurrent(editor: TextEditor) {
  const cursorPlacement = editor.selection.active;
  const line = editor.document.lineAt(cursorPlacement.line);

  let index = -1;
  for(let token of PRECEDING_TOKENS) {
    index = line.text.lastIndexOf(token, cursorPlacement.character);
    if (index !== -1) {
      break;
    }
  }

  if (index === -1) {
    notifyNoneFound();
    return;
  }

  const match = CLASS_REGEX.exec(line.text.substr(index));
  if (match) {
    const parsedName = parseName(line.lineNumber, match);
    if (parsedName !== null) {
      parsedName.startIndex += index;
      prepareHoistEdits(editor, parsedName);
    }
  } else {
    notifyNoneFound();
  }
}

function hoistLine(editor: TextEditor) {
  const cursorPlacement = editor.selection.active;
  const line = editor.document.lineAt(cursorPlacement.line);
  const text = line.text;

  let targets: HoistParams[] = matchPattern(text, line.lineNumber);

  if (targets.length === 0) {
    notifyNoneFound();
    return;
  }

  prepareHoistEdits(editor, targets);
}

function hoistFile(editor:TextEditor) {
  const content = editor.document.getText();
  let targets: HoistParams[] = [];
  for(let [lineNumber, text] of content.split('\n').entries()) {
    targets = targets.concat(matchPattern(text, lineNumber));
  }

  if (targets.length === 0) {
    notifyNoneFound();
    return;
  }

  prepareHoistEdits(editor, targets);
}

export function matchPattern(text:string, lineNumber:number) {
  let match: RegExpExecArray | null;
  let targets: HoistParams[] = [];
  while (match = CLASS_REGEX.exec(text)) {
    const parsedName = parseName(lineNumber, match);
    if (parsedName !== null) {
      targets.push(parsedName);
    }
    CLASS_REGEX.lastIndex -= 1;
  }

  return targets;
}

function parseName(lineNumber: number, match:RegExpMatchArray):HoistParams|null {
  let shortName = match[6];
  let moduleName = match[3];
  let hoisted = `${moduleName}.${shortName}`;
  if (match[8]) {
    shortName += `.${match[8]}`;
  }

  let precedingOffset = 1;
  if (match[1]) {
    precedingOffset += 1;
  }

  return {
    startIndex: match.index! + precedingOffset,
    replaceLength: match[2].length,
    lineNumber,
    hoisted,
    moduleName,
    shortName
  };
}

export function listConflicts(targets: HoistParams[]): Conflicts {
  let conflicts: Conflicts = new Map();
  for (let target of targets) {
    if (!conflicts.has(target.shortName)) {
      conflicts.set(target.shortName, { count: 0, conflicts: [] });
    }

    const conflictList = conflicts.get(target.shortName)!;
    if (conflictList.conflicts.filter(el => (el.hoisted === target.hoisted)).length === 0) {
      conflictList.conflicts.push(target);
      conflictList.count += 1;
    }
  }

  for (let [key, conflict] of conflicts.entries()) {
    if (conflict.count === 1) {
      conflicts.delete(key);
    }
  }

  return conflicts;
}

async function prepareHoistEdits(editor: TextEditor, sourceTargets: HoistParams[] | HoistParams) {
  let targets:HoistParams[] = [];
  if(!(sourceTargets instanceof Array)) {
    targets = [sourceTargets];
  } else {
    targets = sourceTargets;
  }

  let allImports = enumerateImports(editor);

  const conflicts = listConflicts(targets);

  let conflictMessages = [];

  for(let [shortName, modules] of conflicts.entries()) {
    if (modules.count === 1) {
      continue;
    }

    conflictMessages.push(shortName);
  }

  let duplicatesAction = DuplicatesAction.SKIP;
  if (conflictMessages.length > 0) {
    let pickerPlaceholder = `Please pick an action for conflicts (for classes ${conflictMessages.map(m => `"${m}"`).join(', ')})`;
    const value = await window.showQuickPick([{
        id: DuplicatesAction.SKIP,
        label: "Skip hoisting duplicates",
      }, {
        id: DuplicatesAction.FORCE,
        label: "Force hoisting of duplicate modules",
        description: "Some of the data will be lost",
      }, {
        id: DuplicatesAction.ALIAS,
        label: "Automatically assign aliases to all duplicates"
      }],
      {
          placeHolder: pickerPlaceholder
      }
    );

    if (!value) {
      return;
    }
    
    duplicatesAction = value.id;
  }

  applyHoistsToFile(editor, targets, allImports, conflicts, duplicatesAction);
}

export function applyHoistsToFile(editor: TextEditor, targets:HoistParams[], imports:Imports, conflicts:Conflicts, duplicatesAction: DuplicatesAction) {
  editor.edit((builder) => {
    let total = 0;
    let unchangedTotal = 0;
    let duplicateImports = new Set();
    let lastConflictMeta = {
      aliasNumber: 0,
      moduleName: '',
    };

    for (let target of targets) {
      let shortName = target.shortName;
      let hoistedName = target.hoisted;
      const containedWithinAWildcard = imports.wildcards.has(target.moduleName);

      if (conflicts.has(target.shortName)) {
        const conflict = conflicts.get(target.shortName)!;
        if (duplicatesAction === DuplicatesAction.SKIP) {
          unchangedTotal += 1;
          continue;
        } else if (duplicatesAction === DuplicatesAction.ALIAS) {
          let i = conflict.count - conflict.conflicts.length;
          if (target.moduleName === lastConflictMeta.moduleName) {
            i = lastConflictMeta.aliasNumber;
          }
          lastConflictMeta = {
            aliasNumber: i,
            moduleName: target.moduleName,
          };
          if (!containedWithinAWildcard) {
            if (i !== 0) {
              const alias = `_${i}`;
              shortName += alias;
              hoistedName += ` as ${shortName}`;
            }
          }
          conflict.conflicts.shift();
        }
      }

      builder.replace(new Range(
        new Position(target.lineNumber, target.startIndex),
        new Position(target.lineNumber, target.startIndex + target.replaceLength)
      ), shortName);

      if (!duplicateImports.has(hoistedName) && !imports.unique.has(hoistedName) && !containedWithinAWildcard) {
        total += 1;
        duplicateImports.add(hoistedName);

        builder.insert(new Position(imports.lastImportLine + 1, 0), `import ${hoistedName};\n`);
      } else {
        unchangedTotal += 1;
      }
    }

    window.showInformationMessage(`Created ${total} imports, skipped ${unchangedTotal} already existing, or conflicting.`);
  })
  ;
}

function notifyNoneFound() {
  window.showInformationMessage('No hoistable imports found');
}

export function enumerateImports(editor: TextEditor): Imports {
  const lines = editor.document.getText().split("\n").filter(el => el !== '').map(el => el.trim());

  let unique = new Set();
  let wildcards = new Set();
  let lastImportLine = 0;

  for (let [i, line] of lines.entries()) {
    if(!line.startsWith('import')) {
      if (line === '' || SKIP_REGEX.test(line)) {
        continue;
      }

      break;
    }

    const name = line.split(' ')[1].slice(0, -1).trim();
    const parts = name.split('.');
    const lastPart = parts[parts.length - 1];
    const modulePath = parts.slice(0, -1).join('.');
    if (wildcards.has(modulePath) || unique.has(name)) {
      continue;
    }

    if (lastPart === '*') {
      wildcards.add(modulePath);
    }

    unique.add(name);
    lastImportLine = i;
  }

  return {
    lastImportLine,
    unique,
    wildcards
  };
}

export function hoist(type: HoistMode) {
  let editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  CLASS_REGEX.lastIndex = 0;

  switch (type) {
    case HoistMode.CURRENT: return hoistCurrent(editor);
    case HoistMode.LINE: return hoistLine(editor);
    case HoistMode.FILE: return hoistFile(editor);
    default: throw new Error('Invalid hoist mode activated');
  }
}