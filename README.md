# MCP Workspace

Workspace de développement pour connecteurs MCP (Model Context Protocol) personnalisés. Écosystème complet pour recherche académique, gestion bibliographique et analyse stratégique avec dashboard de visualisation.

## Architecture Resiliente V3.3.2

**NOUVEAU** : Architecture résistante aux mises à jour Claude Desktop avec forçage de chemin intégré et dashboard autonome Electron/React.

## Structure du Projet

```
mcp-workspace/
├── arxiv-server/              # Connecteur arXiv pour recherche académique
├── hal-mcp/                   # Connecteur HAL (archives ouvertes françaises)
├── linkedin-strategic/        # Analyse écosystème financement européen
├── project-context-manager/   # Gestionnaire de contexte (RÉSILIENT)
├── context-dashboard-v2/      # Dashboard Electron/React autonome
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
  - **227 conversations archivées** sur 6 projets
  - **Sauvegarde automatique** (10 backups rotatifs)
  - **Règles d'archivage** : Full (15k car) / Summary (4k car)

### **Dashboard de Visualisation**
- **Context Manager Dashboard** : Application Windows autonome
  - Interface graphique Electron/React/Material-UI
  - Visualisation temps réel des projets et conversations
  - Système de backup local et export
  - Tri et filtrage des conversations (Full/Summary)
  - Édition inline des projets
  - Installateur Windows NSIS (79MB)

## Installation et Configuration

### Prérequis
- Node.js 18+
- Claude Desktop
- Windows 10/11 (pour le dashboard)
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

## Context Manager Dashboard

### Installation Rapide

#### Option 1: Installer l'application compilée
1. Télécharger `Context Manager Dashboard Setup.exe` depuis les releases
2. Exécuter l'installateur
3. L'application sera disponible dans le menu Windows

#### Option 2: Lancer depuis les sources
```bash
cd context-dashboard-v2
npm install
npm run dev-all  # Mode développement
npm run dist-win # Créer l'installateur
```

### Fonctionnalités Dashboard

- **Vue d'ensemble** : Métriques en temps réel (projets, conversations, stockage)
- **Gestion projets** : Édition des noms et descriptions sans toucher aux IDs
- **Conversations** : Visualisation triée par type (Full/Summary) et date
- **Backup système** : 
  - Backup local avec notification
  - Export complet avec dialogue Windows
  - Ouverture directe du dossier de sauvegarde
- **Analyse debug** : Statistiques détaillées des archives
- **Mode portable** : Fonctionne sans installation depuis `win-unpacked/`

### Architecture Technique Dashboard

```
context-dashboard-v2/
├── electron/           # Backend Electron (IPC handlers)
├── src/
│   ├── components/
│   │   ├── Common/        # Layout, menu
│   │   ├── Dashboard/     # Métriques, santé
│   │   ├── Projects/      # Cartes projets éditables
│   │   └── Conversations/ # Liste et détails
│   └── App.jsx
├── dist/               # Build production React
└── dist-electron/     # Application compilée
```

## Projets Actifs

| Projet | Technologies | Phase | Conversations |
|--------|-------------|-------|---------------|
| **Heart Of Glass** | IMU, Audio Processing, Ludopédagogie | Development | 58+ |
| **Intégration MCP Claude** | TypeScript, Node.js, WebSocket | Initial-setup | 18+ |
| **AllamBik** | Python, Kindle, Text Processing | Production-ready | 7+ |
| **Logiciel masque sablage verre** | Blender, Python, SVG, 3D→2D | Initial-setup | 5+ |
| **Zotero** | Zotero API, Bibliography Management | Initial-setup | 8+ |
| **Budget retraite** | Épargne, Investissement, Fiscalité | Initial-setup | 6+ |

## Fonctionnalités Sécurisées

### Project Context Manager V3.3.2
- **Forçage de chemin** dans le code source TypeScript
- **Résistance garantie** aux mises à jour Claude Desktop
- **Archivage intelligent** : Full (15k car) / Summary (4k car)
- **Sauvegarde automatique** avant modifications
- **Migration automatique** données legacy
- **Anti-duplication** lors d'archivages multiples

### Dashboard Sécurité
- **Lecture seule** par défaut (édition limitée aux noms/descriptions)
- **IDs jamais modifiés** pour préserver l'intégrité
- **Backup avant édition** automatique
- **Export complet** possible à tout moment
- **Mode debug** avec F12 pour diagnostic

### Sécurité des Données
- **Stockage centralisé** : `C:\Users\DAVE666\ClaudeContextManager`
- **Chiffrement** des tokens API
- **Isolation** des environnements par connecteur
- **Backup rotatif** automatique (10 sauvegardes)
- **Manual backups** via dashboard

## Démarrage Rapide

### 1. Cloner le Repository
```bash
git clone https://github.com/HelloDave666/mcp-workspace.git
cd mcp-workspace
```

### 2. Installation des Connecteurs MCP
```bash
# Project Context Manager
cd project-context-manager && npm install && npm run build && cd ..

# Connecteurs de recherche
cd arxiv-server && npm install && cd ..
cd hal-mcp && npm install && cd ..
cd zotero-mcp && npm install && cd ..

# Analyse stratégique
cd linkedin-strategic && npm install && cd ..
```

### 3. Installation du Dashboard
```bash
cd context-dashboard-v2
npm install
npm run dist-win  # Créer l'installateur Windows
```

### 4. Configuration
- Copiez `config-files/claude_desktop_config.json` vers `%APPDATA%\Claude\`
- Configurez vos tokens API dans chaque connecteur
- Lancez le dashboard depuis le menu Windows ou `dist-electron/win-unpacked/`

## Métriques de Performance

- **227 conversations** archivées et indexées
- **6 projets actifs** avec contexte complet  
- **1.17 Mo** de données structurées
- **10 sauvegardes** rotatives automatiques
- **0 perte de données** lors mises à jour Claude
- **Dashboard 79MB** application autonome
- **117 conversations Full** / **110 Summary**

## Scripts et Commandes Utiles

### Dashboard
```bash
# Développement
npm run dev-all         # Lance React + Electron
npm run dev            # React seul

# Production
npm run build          # Build React
npm run dist-win       # Créer installateur Windows

# Scripts batch créés
rebuild-app.bat        # Reconstruction rapide
update-app.bat         # Mise à jour avec nettoyage
```

### Maintenance Système
```bash
# Vérifier la santé
scripts/check-health.bat

# Sauvegarder manuellement
scripts/backup-data.bat

# Nettoyer les logs
scripts/clean-logs.bat
```

## Handlers IPC Dashboard

| Handler | Description | Retour |
|---------|-------------|--------|
| `get-projects` | Récupère projets et conversations avec mapping archive_type | JSON complet |
| `get-storage-health` | État et métriques du stockage | Taille, backups, chemin |
| `rename-project` | Édition nom/description projet | Success/Error |
| `create-backup` | Sauvegarde locale horodatée | Chemin du backup |
| `export-backup` | Export avec dialogue Windows | Chemin d'export |
| `analyze-conversations` | Analyse debug des archives | Statistiques détaillées |
| `open-folder` | Ouvre un dossier dans l'explorateur | Success/Error |

## Roadmap

### Version 3.4.0 (En cours)
- Export automatique vers Obsidian
- Intégration Notion API
- Analytics avancées des conversations
- Recherche full-text dans le dashboard

### Version 4.0.0 (Future)
- AI-powered conversation summarization
- Multi-user collaboration
- Cloud synchronization
- Mobile companion app
- Dashboard web responsive

## Troubleshooting

### Dashboard page blanche
- Vérifier que le build React est dans `dist/`
- Relancer `npm run build` puis `npm run dist-win`

### Conversations Full non détectées
- Vérifier le champ `archiveType` dans projects.json
- Utiliser l'analyse debug (menu → Analyser les conversations)

### Erreur de build Electron
- Electron doit être dans `devDependencies`
- Vérifier l'encodage UTF-8 sans BOM de package.json

## Contribution

Les contributions sont les bienvenues ! Consultez le guide de contribution dans `CONTRIBUTING.md`.

## Changelog

### v3.3.2 + Dashboard v1.0.0 (Janvier 2025)
- **NEW** : Dashboard Electron/React autonome
- **NEW** : Installateur Windows NSIS (79MB)
- **NEW** : Visualisation temps réel des projets
- **NEW** : Système de backup avec notifications
- **NEW** : Tri des conversations Full/Summary
- **UPDATE** : Règles archivage 15k/4k caractères
- **FIX** : Détection correcte du champ archiveType
- **FIX** : Forçage du chemin de données dans TypeScript

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

**Dernière mise à jour** : Janvier 2025 - v3.3.2 avec Dashboard v1.0.0