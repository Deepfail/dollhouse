#!/bin/bash
# Fix VS Code Codespace corruption issues

echo "🔧 Fixing VS Code Codespace issues..."

# 1. Clear workspace storage (corrupted state)
echo "📦 Clearing workspace storage..."
rm -rf ~/.vscode-remote/data/User/workspaceStorage/*
rm -rf ~/.vscode-remote/data/User/globalStorage/state.vscdb*

# 2. Clear cached extensions
echo "🧹 Clearing extension cache..."
rm -rf ~/.vscode-remote/data/CachedExtensionVSIXs/*

# 3. Remove workspace file if it exists (can cause issues)
if [ -f "/workspaces/dollhouse/.vscode/workspace.json" ]; then
  echo "🗑️  Removing workspace.json..."
  rm -f /workspaces/dollhouse/.vscode/workspace.json
fi

# 4. Clear any cached data
echo "💾 Clearing cached data..."
rm -rf ~/.vscode-remote/data/User/History/*
rm -rf /tmp/vscode-*

# 5. Fix permissions
echo "🔐 Fixing permissions..."
chmod -R 755 ~/.vscode-remote 2>/dev/null || true
chown -R codespace:codespace ~/.vscode-remote 2>/dev/null || true

echo ""
echo "✅ Done! Now reload VS Code:"
echo "   Press Ctrl+Shift+P → 'Developer: Reload Window'"
echo ""
echo "   If that doesn't work, rebuild the Codespace:"
echo "   Press Ctrl+Shift+P → 'Codespaces: Rebuild Container'"
