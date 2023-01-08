'use strict';

import * as vscode from 'vscode';
import { hoist, HoistMode } from './hoister';
import { order } from './sorter';

export function activate(context: vscode.ExtensionContext): void {
  console.log('haxe-import-hoister activated');

  context.subscriptions.push(
    vscode.commands.registerCommand('hoister.hoistCurrent', () => { hoist(HoistMode.CURRENT); }),
    vscode.commands.registerCommand('hoister.hoistLine', () => { hoist(HoistMode.LINE); }),
    vscode.commands.registerCommand('hoister.hoistFile', () => { hoist(HoistMode.FILE); }),
    vscode.commands.registerCommand('sorter.order', () => { order(); })
  );
}

export function deactivate(): void {
}
