#!/bin/bash
# Fix VS Code Codespace corruption issues - AGGRESSIVE cleanup

echo "🔧 Fixing VS Code Codespace issues (AGGRESSIVE mode)..."

# 1. Clear workspace storage (corrupted state)
echo "📦 Clearing workspace storage..."
rm -rf ~/.vscode-remote/data/User/workspaceStorage/*
rm -rf ~/.vscode-remote/data/User/globalStorage/state.vscdb*
rm -rf ~/.vscode-remote/data/User/globalStorage/*.json

# 2. Clear cached extensions and their storage
echo "🧹 Clearing extension cache and storage..."
rm -rf ~/.vscode-remote/data/CachedExtensionVSIXs/*
rm -rf ~/.vscode-remote/extensions/*
rm -rf ~/.vscode-remote/extensionsCache/*

# 3. Remove workspace files that can cause issues
echo "🗑️  Removing problematic workspace files..."
rm -f /workspaces/dollhouse/.vscode/workspace.json
rm -rf /workspaces/dollhouse/.vscode-test

# 4. Clear all cached data
echo "� Clearing cached data..."
rm -rf ~/.vscode-remote/data/User/History/*
rm -rf ~/.vscode-remote/data/logs/*
rm -rf /tmp/vscode-*
rm -rf /tmp/vscodesockets/*

# 5. Clear Git/GitHub extension caches
echo "� Clearing GitHub extension caches..."
rm -rf ~/.vscode-remote/data/User/globalStorage/github.vscode-pull-request-github/*
rm -rf ~/.vscode-remote/data/User/globalStorage/github.vscode-github-actions/*
rm -rf ~/.vscode-remote/data/User/globalStorage/eamodio.gitlens/*

# 6. Kill any stuck VS Code processes
echo "⚡ Killing stuck processes..."
pkill -f "vscode-server" 2>/dev/null || true
pkill -f "node.*extensionHost" 2>/dev/null || true

# 7. Fix permissions
echo "🔐 Fixing permissions..."
chmod -R 755 ~/.vscode-remote 2>/dev/null || true
chown -R $(whoami):$(whoami) ~/.vscode-remote 2>/dev/null || true

echo ""
echo "✅ Done! VS Code will now need to reinstall extensions."
echo ""
echo "NEXT STEPS:"
echo "1. Close this terminal"
echo "2. Press Ctrl+Shift+P"
echo "3. Type 'Codespaces: Rebuild Container'"
echo "4. Select 'Full Rebuild'"
echo ""
echo "This will take 5-10 minutes but should fix all issues."
