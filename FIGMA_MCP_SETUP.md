# Figma Dev MCP Setup Guide

## Overview
The Figma Developer MCP is now installed and configured for your VS Code workspace. This allows GitHub Copilot and other AI assistants to access your Figma designs directly.

## What Was Installed
- **Package**: `figma-developer-mcp@0.6.0` (globally installed)
- **Configuration**: Added to `.vscode/settings.json`
- **Environment**: Set up in `.env` and `.env.example`

## Next Steps

### 1. Get Your Figma Access Token
1. Go to [Figma Settings > Personal access tokens](https://www.figma.com/developers/api#access-tokens)
2. Click "Create new token"
3. Give it a descriptive name (e.g., "VS Code MCP Integration")
4. Copy the generated token

### 2. Configure Your Environment
1. Open your `.env` file in this project
2. Replace the empty `FIGMA_ACCESS_TOKEN=` with your actual token:
   ```bash
   FIGMA_ACCESS_TOKEN=figd_your_actual_token_here
   ```

### 3. Restart VS Code
After adding your token, restart VS Code to load the MCP server with the new configuration.

## Features Available

Once configured, you can:
- **Access Figma Files**: Get design data, components, and assets
- **Download Assets**: Export images, icons, and other design elements
- **Analyze Designs**: Get detailed information about components, styles, and layout
- **Generate Code**: AI can help implement designs based on Figma data

## Usage Examples

After setup, you can ask GitHub Copilot questions like:
- "Show me the components from my Figma file [file-id]"
- "Export the icons from this Figma design"
- "Generate React components based on this Figma frame"
- "What are the design tokens used in this Figma file?"

## Troubleshooting

### MCP Server Not Found
If VS Code can't find the MCP server:
1. Check that `figma-developer-mcp` is globally installed: `npm list -g figma-developer-mcp`
2. Verify your global npm path: `npm config get prefix`
3. Restart VS Code completely

### Authentication Issues
- Ensure your Figma token is valid and has the necessary permissions
- Check that the token is properly set in your `.env` file
- Make sure there are no extra spaces or quotes around the token

### Getting Figma File IDs
You can find Figma file IDs in the URL:
- URL: `https://www.figma.com/file/ABC123/My-Design`
- File ID: `ABC123`

## Configuration Details

The MCP server is configured in `.vscode/settings.json`:
```json
{
  "mcp.mcpServers": {
    "figma-developer": {
      "command": "figma-developer-mcp",
      "args": [],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${env:FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

This configuration:
- Uses the globally installed `figma-developer-mcp` command
- Reads the Figma token from your environment variables
- Enables the MCP server for AI assistant integration