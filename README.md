# haxe-import-hoister

Reimplementation of sublime's plugin import hoisting functionality. Can parse whole file at once, one line, or only closest fully-qualified name. When conflicts are detected, choose an option from the quick pick menu on how to handle them.

## Known issues

When hoisting a single qualified name, this extension won't be able to detect that a wildcard might already include a conflicting name.

## Release Notes

### 0.0.1

Initial release of the extension

### 0.0.2

Fixed aliases resolution in most cases

### 0.0.3

Added import sorting with new commands