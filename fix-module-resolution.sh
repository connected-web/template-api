#!/bin/bash

# Fix for broken @connected-web/openapi-rest-api package.json main path
PACKAGE_DIR="node_modules/@connected-web/openapi-rest-api/library/dist"
if [ -f "$PACKAGE_DIR/PackageIndex.js" ] && [ ! -d "$PACKAGE_DIR/src" ]; then
    echo "Fixing @connected-web/openapi-rest-api module resolution..."
    mkdir -p "$PACKAGE_DIR/src"
    ln -sf "../PackageIndex.js" "$PACKAGE_DIR/src/PackageIndex.js"
    ln -sf "../PackageIndex.d.ts" "$PACKAGE_DIR/src/PackageIndex.d.ts"
    echo "Fixed module resolution for @connected-web/openapi-rest-api"
fi