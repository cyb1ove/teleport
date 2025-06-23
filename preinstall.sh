#!/bin/bash

# Exit on any error
set -e

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Clone the GramJS repository
echo "📥 Cloning GramJS repository..."
if ! git clone https://github.com/gram-js/gramjs.git; then
    echo "❌ Error: Failed to clone GramJS repository"
    exit 1
fi

# Navigate to the cloned repository
cd gramjs

# Install dependencies
echo "📦 Installing dependencies..."
if ! npm install; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

# Build the telegram.js bundle
echo "🔨 Building telegram.js bundle..."

if ! NODE_ENV=production npx webpack; then
    echo "❌ Error: Failed to build telegram.js bundle"
    exit 1
fi

# Check if the bundle was created
if [ ! -f "browser/telegram.js" ]; then
    echo "❌ Error: telegram.js bundle not found in browser/"
    exit 1
fi

# Copy the bundle to the project
echo "📂 Copying telegram.js bundle to project..."
cp browser/telegram.js ../public/telegram.js

# Clean up
echo "🧹 Cleaning up..."
cd ..
rm -rf gramjs