import * as assert from 'assert';
import * as hoister from '../hoister';
import { window, workspace, TextEditor, Uri } from 'vscode';
import { basename } from 'path';

const SOURCE_FILE = 'mockHaxe.hx';
const ALIASED_FILE = 'mockAliasedHoistedHaxe.hx';

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
    const imports = hoister.enumerateImports(editor);
    let targets: hoister.HoistParams[] = [];
    for (let [i, text] of editor.document.getText().split('\n').entries()) {
      targets = targets.concat(hoister.matchPattern(text, i));
    }
    const conflicts = hoister.listConflicts(targets);
    hoister.applyHoistsToFile(editor, targets, imports, conflicts, hoister.DuplicatesAction.ALIAS);

    const aliasedDocument = await workspace.openTextDocument(getByFilename(files, ALIASED_FILE));
    
    assert.equal(editor.document.getText(), aliasedDocument.getText());
  });
});