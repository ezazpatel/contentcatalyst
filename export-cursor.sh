#!/bin/bash

# Create a temporary directory for the export
mkdir -p cursor-export
cd cursor-export

# Create directory structure
mkdir -p client/src/{components/{ui,},pages,hooks,lib}
mkdir -p server
mkdir -p shared

# Copy root configuration files
cp ../package.json .
cp ../package-lock.json .
cp ../tsconfig.json .
cp ../vite.config.ts .
cp ../tailwind.config.ts .
cp ../postcss.config.js .
cp ../theme.json .
cp ../.gitignore .

# Copy client files
cp ../client/index.html client/
cp -r ../client/src/App.tsx client/src/
cp -r ../client/src/main.tsx client/src/
cp -r ../client/src/index.css client/src/
cp -r ../client/src/components/* client/src/components/
cp -r ../client/src/pages/* client/src/pages/
cp -r ../client/src/hooks/* client/src/hooks/
cp -r ../client/src/lib/* client/src/lib/

# Copy server files
cp ../server/*.ts server/

# Copy shared files
cp ../shared/schema.ts shared/

# Create zip archive
zip -r ../cursor-export.zip .

# Clean up
cd ..
rm -rf cursor-export

echo "Export complete! The files are in cursor-export.zip"
