# MCP Workspace

Workspace de développement pour connecteurs MCP (Model Context Protocol) personnalisés. Écosystème complet pour recherche académique, gestion bibliographique et analyse stratégique.

## Architecture Resiliente V3.3.2

**NOUVEAU** : Architecture résistante aux mises à jour Claude Desktop avec forçage de chemin intégré.

## Structure du Projet

```
mcp-workspace/
├── arxiv-server/              # Connecteur arXiv pour recherche académique
├── hal-mcp/                   # Connecteur HAL (archives ouvertes françaises)
├── linkedin-strategic/        # Analyse écosystème financement européen
├── project-context-manager/   # Gestionnaire de contexte (RÉSILIENT)
├── zotero-mcp/               # Intégration Zotero bibliographique
├── github/                   # Intégration GitHub (si configuré)
├── config-files/             # Configurations Claude Desktop
└── scripts/                  # Scripts de démarrage et maintenance
```

## Connecteurs MCP Disponibles

### **Recherche Académique**
- **arXiv Server** : Recherche directe dans les archives arXiv
- **HAL-MCP** : Accès aux archives ouvertes françaises (116,942+ documents)
- **Zotero-MCP** : Gestion bibliographique complète

### **Analyse Stratégique** 
- **LinkedIn Strategic** : Analyse écosystème financement européen CRAFT
- **GitHub** : Gestion repositories et code

### **Gestion de Projet**
- **Project Context Manager V3.3.2** : Archivage conversations et contexte
  - **Stockage centralisé résistant** : `C:\Users\DAVE666\ClaudeContextManager`
  - **Résistance mises à jour** Claude Desktop
  - **223 conversations archivées** sur 5 projets
  - **Sauvegarde automatique** (10 backups rotatifs)

## Installation et Configuration

### Prérequis
- Node.js 18+
- Claude Desktop
- Accès API (Zotero, LinkedIn, etc.)

### Configuration Claude Desktop

```json
{
  "mcpServers": {
    "project-context-manager": {
      "command": "node",
      "args": ["C:/Users/DAVE666/mcp-workspace/project-context-manager/build/index.js"],
      "env": {
        "NODE_ENV": "production",
        "CLAUDE_CONTEXT_DATA_PATH": "C:\\Users\\DAVE666\\ClaudeContextManager"
      }
    },
    "arxiv-server": {
      "command": "node", 
      "args": ["C:/Users/DAVE666/mcp-workspace/arxiv-server/server.js"]
    },
    "hal-mcp": {
      "command": "node",
      "args": ["C:/Users/DAVE666/mcp-workspace/hal-mcp/server.js"]
    },
    "zotero-mcp": {
      "command": "node",
      "args": ["C:/Users/DAVE666/mcp-workspace/zotero-mcp/server.js"]
    },
    "linkedin-strategic": {
      "command": "node",
      "args": ["C:/Users/DAVE666/mcp-workspace/linkedin-strategic/server.js"]
    }
  }
}
```

## Projets Actifs

| Projet | Technologies | Phase | Conversations |
|--------|-------------|-------|---------------|
| **Heart Of Glass** | IMU, Audio Processing, Ludopédagogie | Development | 58+ |
| **MCP Integration** | TypeScript, Node.js, WebSocket | Setup | 12+ |
| **AllamBik** | Python, Kindle, OCR | Production | 7+ |
| **Masque Sablage** | Blender, 3D→2D, Manufacturing | Setup | 5+ |
| **Zotero** | API, Bibliography, Research | Setup | 8+ |

## Fonctionnalités Sécurisées

### Project Context Manager V3.3.2
- **Forçage de chemin** dans le code source TypeScript
- **Résistance garantie** aux mises à jour Claude Desktop
- **Archivage intelligent** (complet/résumé)
- **Sauvegarde automatique** avant modifications
- **Migration automatique** données legacy

### Sécurité des Données
- **Stockage centralisé** : `%APPDATA%\ClaudeContextManager`
- **Chiffrement** des tokens API
- **Isolation** des environnements par connecteur
- **Backup rotatif** automatique

## Démarrage Rapide

### 1. Cloner le Repository
```bash
git clone https://github.com/HelloDave666/mcp-workspace.git
cd mcp-workspace
```

### 2. Installation des Dépendances
```bash
# Pour chaque connecteur
cd project-context-manager && npm install && npm run build && cd ..
cd arxiv-server && npm install && cd ..
cd hal-mcp && npm install && cd ..
cd zotero-mcp && npm install && cd ..
cd linkedin-strategic && npm install && cd ..
```

### 3. Configuration
- Copiez `config-files/claude_desktop_config.json` vers `%APPDATA%\Claude\`
- Configurez vos tokens API dans chaque connecteur

### 4. Démarrage
```bash
# Utiliser les scripts de démarrage
scripts/start-all-mcp.bat
```

## Métriques de Performance

- **223 conversations** archivées et indexées
- **5 projets actifs** avec contexte complet  
- **1.09 Mo** de données structurées
- **10 sauvegardes** rotatives automatiques
- **0 perte de données** lors mises à jour Claude

## Maintenance et Debugging

### Scripts Utiles
```bash
# Vérifier la santé du système
scripts/check-health.bat

# Sauvegarder manuellement
scripts/backup-data.bat

# Nettoyer les logs
scripts/clean-logs.bat
```

### Logs et Debugging
- **Logs centralisés** : `logs/`
- **Monitoring santé** : Project Context Manager
- **Alertes automatiques** en cas de problème

## Intégrations Externes

### APIs Configurées
- **Zotero API** : Gestion bibliographique (87 éléments)
- **arXiv API** : Recherche académique automatisée
- **HAL API** : Archives ouvertes françaises
- **LinkedIn API** : Analyse réseaux professionnels
- **GitHub API** : Gestion code et repositories

### Services de Recherche
- **Recherche sémantique** dans les conversations
- **Indexation automatique** des nouveaux contenus
- **Recommandations contextuelles** basées sur l'historique

## Roadmap

### Version 3.4.0 (Prochaine)
- Interface web de monitoring
- Export automatique vers Obsidian
- Intégration Notion API
- Analytics avancées des conversations

### Version 4.0.0 (Future)
- AI-powered conversation summarization
- Multi-user collaboration
- Cloud synchronization
- Mobile companion app

## Contribution

Les contributions sont les bienvenues ! Consultez le guide de contribution dans `CONTRIBUTING.md`.

## Changelog

### v3.3.2 (Août 2025)
- **CRITICAL FIX** : Forçage du chemin de données dans le source TypeScript
- Récupération complète des 5 projets et 223 conversations
- Architecture 100% résistante aux mises à jour Claude Desktop
- Nouvelles fonctions de gestion avancée des projets

### v3.3.1 (Juillet 2025)
- Correction erreurs JSON et échappement sécurisé
- Compatibilité Claude Desktop 0.10.38
- Migration automatique données legacy

### v3.3.0 (Juin 2025)
- Stockage centralisé résilient
- Système de sauvegarde automatique
- Détection et migration données dispersées

## Licence

MIT License - Voir `LICENSE` pour plus de détails.

---

**Repository** : [https://github.com/HelloDave666/mcp-workspace](https://github.com/HelloDave666/mcp-workspace)

**Maintenu par** : David Arnaud (@HelloDave666)

**Dernière mise à jour** : Août 2025 - Architecture V3.3.2 Resilient