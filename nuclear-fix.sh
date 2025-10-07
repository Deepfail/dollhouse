#!/bin/bash
# Nuclear option: Complete VS Code reset for Codespaces

echo "💣 Nuclear VS Code Reset - This will fix deep corruption"
echo "⚠️  This will close and reopen VS Code automatically"
echo ""

# Stop all running node processes (extensions)
echo "🛑 Stopping extension processes..."
pkill -f "vscode-server" 2>/dev/null || true
pkill -f "node.*extension" 2>/dev/null || true

# Wait a moment
sleep 2

# Nuke ALL VS Code data
echo "💥 Removing ALL VS Code cached data..."
rm -rf ~/.vscode-remote/data/User/workspaceStorage
rm -rf ~/.vscode-remote/data/User/globalStorage
rm -rf ~/.vscode-remote/data/User/History
rm -rf ~/.vscode-remote/data/User/Cache
rm -rf ~/.vscode-remote/data/User/CachedData
rm -rf ~/.vscode-remote/data/User/CachedExtensions
rm -rf ~/.vscode-remote/data/User/CachedExtensionVSIXs
rm -rf ~/.vscode-remote/data/CachedExtensionVSIXs
rm -rf ~/.vscode-remote/extensions

# Clear logs
echo "🗑️  Clearing logs..."
rm -rf ~/.vscode-remote/data/logs/*

# Clear temp files
echo "🧹 Clearing temp files..."
rm -rf /tmp/vscode-*
rm -rf /tmp/Code*

# Reset workspace
echo "📦 Resetting workspace state..."
rm -rf /workspaces/dollhouse/.vscode/workspace.json 2>/dev/null
rm -rf /workspaces/dollhouse/.vscode/*.code-workspace 2>/dev/null

echo ""
echo "✅ Complete! Now you MUST:"
echo ""
echo "   1. Close this browser tab completely"
echo "   2. Go back to GitHub and reopen the Codespace"
echo "   3. OR in GitHub: Codespace menu → 'Stop Codespace' → 'Start Codespace'"
echo ""
echo "This will give you a completely fresh VS Code state."
