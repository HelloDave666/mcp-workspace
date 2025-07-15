# Configuration Claude Desktop MCP

## Configuration Active
Fichier : `claude_desktop_config.json`

**5 connecteurs MCP actifs :**
- `arxiv-server` - Import articles académiques
- `linkedin-strategic` - Analyse réseau professionnel  
- `project-context-manager` - Gestionnaire de contexte
- `zotero-mcp` - Gestion bibliographique
- `github` - Intégration GitHub officielle

## Installation
Copier le contenu de `claude_desktop_config.json` vers :
C:\Users\DAVE666\AppData\Roaming\Claude\claude_desktop_config.json

Puis redémarrer Claude Desktop.

## Compilation des serveurs
```bash
# Compiler tous les serveurs personnalisés
cd C:/Users/DAVE666/mcp-workspace/arxiv-server && npm run build
cd C:/Users/DAVE666/mcp-workspace/linkedin-strategic && npm run build  
cd C:/Users/DAVE666/mcp-workspace/project-context-manager && npm run build
cd C:/Users/DAVE666/mcp-workspace/zotero-mcp && npm run build