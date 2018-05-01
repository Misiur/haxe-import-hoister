import * as assert from 'assert';
import * as hoister from '../hoister';
import * as sorter from '../sorter';
import * as importUtils from '../importUtils';
import { window, workspace, TextEditor, Uri } from 'vscode';
import { basename } from 'path';

const SOURCE_FILE = 'mockHaxe.hx';
const ALIASED_FILE = 'mockAliasedHoistedHaxe.hx';
const ALIASED_ORDERED_FILE = 'mockAliasedOrderedHaxe.hx';

function getByFilename(files:Uri[], fileName:string) {
  return files.find(file => basename(file.path) === fileName)!;
}

describe('Hoister tests', () => {
  let editor:TextEditor;
  let files:Uri[];

  before(async () => {
    files = await workspace.findFiles('*.hx');
    editor = await window.showTextDocument(getByFilename(files, SOURCE_FILE));
  });

  it('should not break on updates', async () => {
    const document = editor.document.getText();
    const imports = importUtils.enumerateImports(document);
    let targets: hoister.HoistParams[] = [];
    for (let [i, text] of document.split('\n').entries()) {
      targets = targets.concat(hoister.matchPattern(text, i));
    }
    const conflicts = hoister.findConflicts(targets, imports);
    hoister.applyHoistsToFile(editor, targets, imports, conflicts, hoister.DuplicatesAction.ALIAS);

    const aliasedDocument = await workspace.openTextDocument(getByFilename(files, ALIASED_FILE));
    
    assert.equal(editor.document.getText(), aliasedDocument.getText());

    await sorter.startSorting(editor, sorter.SortType.ALPHABETIC, sorter.GroupType.SEPARATE_DEPENDENCIES, true);
    const orderedDocument = await workspace.openTextDocument(getByFilename(files, ALIASED_ORDERED_FILE));
    assert.equal(editor.document.getText(), orderedDocument.getText());
  });
});