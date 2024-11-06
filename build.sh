#!/bin/bash

# Remove the dist directory
rm -rf dist

# Modify the textbox.js file
sed -i 's/\.\/Shape/\.\/shape/g' node_modules/docx2html/lib/docx/html/textbox.js

# Run TypeScript compiler
tsc -b

# Build with Vite
vite build
