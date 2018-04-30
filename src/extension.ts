'use strict';

import * as vscode from 'vscode';
import { hoist, HoistMode } from './hoister';

export function activate(context: vscode.ExtensionContext) {
    console.log('haxe-import-hoister activated');

    context.subscriptions.push(
        vscode.commands.registerCommand('hoister.hoistCurrent', () => hoist(HoistMode.CURRENT)),
        vscode.commands.registerCommand('hoister.hoistLine', () => hoist(HoistMode.LINE)),
        vscode.commands.registerCommand('hoister.hoistFile', () => hoist(HoistMode.FILE)),
    );
}

export function deactivate() {
}