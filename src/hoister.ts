'use strict';

import { window, Range, Position, TextEditor, TextEditorEdit } from 'vscode';
import { Imports, ImportMeta, enumerateImports } from './importUtils';

const PRECEDING_TOKENS = [':', '<', ',', '(', '=', 'new'];
const CLASS_REGEX = /(@:\w+\s*)?(^|[:<,(=]|(?:new))(\s*)((([a-z]([0-9a-z_]*)\.?)+)\.([A-Za-z_]\w*)(\.([A-Z_][A-Z_]+))?)\s*([(),>;={]|$)/gm;

export type HoistParams = {
  startIndex: number;
  replaceLength: number;
  lineNumber: number;
} & ImportMeta;

type Conflicts = Map<string, { count: number, conflicts: ImportMeta[] }>;

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

  let index = 0;
  for(let token of PRECEDING_TOKENS) {
    const currentIndex = line.text.lastIndexOf(token, cursorPlacement.character);
    if (currentIndex !== -1 && currentIndex > index) {
      index = currentIndex;
    }
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
  let shortName = match[8];
  let moduleName = match[5];
  let hoisted = `${moduleName}.${shortName}`;
  let enumValue = undefined;
  if (match[10]) {
    enumValue = match[10];
  }

  let precedingOffset = match[2].length;
  if (match[3]) {
    precedingOffset += match[3].length;
  }

  if (match[1]) {
    return null;
  }

  if (match[2] !== 'new' && match[11] === '(') {
    return null;
  }

  return {
    startIndex: match.index! + precedingOffset,
    replaceLength: match[4].length,
    lineNumber,
    hoisted,
    moduleName,
    shortName,
    enumValue
  };
}

export function findConflicts(targets: HoistParams[], imports:Imports): Conflicts {
  let conflicts: Conflicts = new Map();

  for (let target of targets) {
    parseConflict(target, conflicts);
  }

  for (let imp of imports.unique.values()) {
    parseConflict(imp, conflicts, true);
  }

  for (const conflict of conflicts.values()) {
    let aliasNum = 0;
    conflict.conflicts.forEach(el => {
      if (el.alias) {
        const num = parseInt(el.alias.split('_')[1], 10) || 0;
        if (num >= aliasNum) {
          aliasNum = num + 1;
        }
      }
    });

    if (!aliasNum) {
      for (let single of conflict.conflicts) {
        // @TODO: What to do with conflicting wildcards?
        if (imports.wildcards.has(single.moduleName)) {
          aliasNum += 1;
        }
      }
    }

    for (let single of conflict.conflicts) {
      if (imports.wildcards.has(single.moduleName) || single.alias) {
        continue;
      }
     
      if (aliasNum > 0) {
        single.alias = `${single.shortName}_${aliasNum}`;
      }

      aliasNum++;
    }
  }

  return conflicts;
}

function parseConflict(source: ImportMeta, conflicts:Conflicts, importMode:boolean = false) {
  if (!conflicts.has(source.shortName)) {
    if (importMode) {
      return;
    }

    conflicts.set(source.shortName, { count: 0, conflicts: [] });
  }

  const conflictList = conflicts.get(source.shortName)!;
  const namespacedConflicts = conflictList.conflicts;
  const duplicateConflicts = namespacedConflicts.filter(el => el.hoisted === source.hoisted);

  if (duplicateConflicts.length === 0) {
    namespacedConflicts.push(source);
    conflictList.count += 1;
  } else if (duplicateConflicts.length === 1) {
    const conflict = duplicateConflicts[0];
    if (!conflict.alias && source.alias) {
      namespacedConflicts.splice(namespacedConflicts.indexOf(conflict), 1);
      namespacedConflicts.push(source);
      conflictList.count += 1;
    }
  }
}

function applyAlias(target:HoistParams, alias:string) {
  target.hoisted = `${target.moduleName}.${target.shortName} as ${alias}`;
  target.alias = alias;
}

function resolveConflicts(targets:HoistParams[], imports:Imports, conflicts:Conflicts, duplicatesAction:DuplicatesAction) {
  let skipped = 0;
  for (let [i, target] of targets.entries()) {
    if (!conflicts.has(target.shortName)) {
      continue;
    }

    const conflict = conflicts.get(target.shortName)!;
    const alias = findAlias(target, conflict.conflicts);

    let shouldAlias = false;
    if (duplicatesAction === DuplicatesAction.SKIP) {
      if (alias && !(new RegExp(`${target.shortName}_\\d+`).test(<string> alias))) {
        shouldAlias = true;
      } else if (conflict.count > 1) {
        skipped += 1;
        delete targets[i];
      }
    } else if (duplicatesAction === DuplicatesAction.ALIAS) {
      if (!imports.wildcards.has(target.moduleName) && alias) {
        shouldAlias = true;
      }
    }

    if (shouldAlias) {
      applyAlias(target, <string> alias);
    }
  }
  
  if (duplicatesAction === DuplicatesAction.SKIP) {
    for (let i = 0; i < targets.length; ++i) {
      if(targets[i] === undefined) {
        targets.splice(i--, 1);
      }
    }
  }

  return skipped;
}

function findAlias(target:HoistParams, modules:ImportMeta[]) {
  for (let single of modules) {
    if (target.moduleName === single.moduleName) {
      return single.alias;
    }
  }

  return false;
}

async function prepareHoistEdits(editor: TextEditor, sourceTargets: HoistParams[] | HoistParams) {
  let targets:HoistParams[] = [];
  if(!(sourceTargets instanceof Array)) {
    targets = [sourceTargets];
  } else {
    targets = sourceTargets;
  }

  let allImports = enumerateImports(editor.document.getText());
  const conflicts = findConflicts(targets, allImports);

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
    let skipped = resolveConflicts(targets, imports, conflicts, duplicatesAction);

    for (let target of targets) {
      let fullName = target.alias ? target.alias : target.shortName;
      if (target.enumValue) {
        fullName += `.${target.enumValue}`;
      }

      builder.replace(new Range(
        new Position(target.lineNumber, target.startIndex),
        new Position(target.lineNumber, target.startIndex + target.replaceLength)
      ), fullName);
    }

    let [duplicates, inserted] = applyImportsToFile(builder, targets, imports);
    window.showInformationMessage(`Hoisted ${targets.length} imports - created ${inserted} new, skipped ${duplicates} duplicates, and skipped ${skipped} conflicts`);
  })
  ;
}

function applyImportsToFile(builder:TextEditorEdit, targets:HoistParams[], imports:Imports) {
  let inserted = 0;
  let skipped = 0;
  let duplicates = new Set();

  for (const target of targets) {
    if (duplicates.has(target.hoisted) || imports.unique.has(`${target.moduleName}.${target.shortName}`) || imports.wildcards.has(target.moduleName)) {
      skipped += 1;
    } else {
      const line = `import ${target.hoisted};\n`;
      builder.insert(new Position(imports.lastImportLine + 1, 0), line);
      inserted += 1;

      duplicates.add(target.hoisted);
    }
  }

  return [skipped, inserted];
}

function notifyNoneFound() {
  window.showInformationMessage('No hoistable imports found');
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