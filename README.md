# MCP Workspace

Workspace de développement pour connecteurs MCP (Model Context Protocol) personnalisés. Écosystème complet pour recherche académique, gestion bibliographique et analyse stratégique avec dashboard de visualisation maintenant équipé d'un system tray Windows.

## Architecture Resiliente V3.3.4

NOUVEAU : Context Dashboard v2.0 avec system tray Windows complet, démarrage automatique et fonctionnement en arrière-plan. Architecture résistante aux mises à jour Claude Desktop avec forçage de chemin intégré.

## Structure du Projet
```
mcp-workspace/
├── arxiv-server/              # Connecteur arXiv pour recherche académique
├── hal-mcp/                   # Connecteur HAL (archives ouvertes françaises)
├── linkedin-strategic/        # Analyse écosystème financement européen
├── project-context-manager/   # Gestionnaire de contexte (RÉSILIENT)
├── context-dashboard-v2/      # Dashboard Electron/React avec SYSTEM TRAY
├── zotero-mcp/               # Intégration Zotero bibliographique v1.1.0
├── github/                   # Intégration GitHub (si configuré)
├── config-files/             # Configurations Claude Desktop
└── scripts/                  # Scripts de démarrage et maintenance
```

## Connecteurs MCP Disponibles

### Recherche Académique
- **arXiv Server** : Recherche directe dans les archives arXiv
- **HAL-MCP** : Accès aux archives ouvertes françaises (116,942+ documents)
- **Zotero-MCP v1.1.0** : Gestion bibliographique complète avec lecture des notes
  - Lecture complète des notes attachées aux items
  - Récupération du contenu des highlights/annotations
  - Support complet des exports AllamBik (228+ highlights testés)
  - Fonctions de lecture : `get_item_with_notes`, `get_note_content`, `get_item_details`, `list_item_children`
  - Configuration et authentification API Zotero
  - Import direct depuis arXiv
  - Export bibliographique multi-format

### Analyse Stratégique
- **LinkedIn Strategic** : Analyse écosystème financement européen CRAFT
- **GitHub** : Gestion repositories et code

### Gestion de Projet
- **Project Context Manager V3.3.2** : Archivage conversations et contexte
  - Stockage centralisé résistant : `C:\Users\DAVE666\ClaudeContextManager`
  - 228 conversations archivées sur 6 projets
  - Sauvegarde automatique (10 backups rotatifs)
  - Règles d'archivage : Full (15k car) / Summary (4k car)

### Dashboard de Visualisation v2.1
- **Context Manager Dashboard** : Application Windows autonome avec system tray
  - NOUVEAU : System Tray Windows
    - Icône permanente dans la barre des tâches
    - Menu contextuel avec statistiques temps réel
    - Vue rapide au double-clic
    - Démarrage automatique avec Windows 11
    - Minimisation en arrière-plan (ne ferme pas l'app)
    - Notifications balloon
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
      "args": ["C:/Users/DAVE666/mcp-workspace/zotero-mcp/build/index.js"]
    },
    "linkedin-strategic": {
      "command": "node",
      "args": ["C:/Users/DAVE666/mcp-workspace/linkedin-strategic/server.js"]
    }
  }
}
```

## Context Manager Dashboard v2.1

### Installation Rapide

#### Option 1: Installer l'application compilée (RECOMMANDÉ)
1. Télécharger `Context Manager Dashboard Setup.exe` depuis les releases
2. Exécuter l'installateur
3. L'application sera disponible dans le menu Windows
4. Au premier lancement, choisir si vous voulez le démarrage automatique

#### Option 2: Lancer depuis les sources
```bash
cd context-dashboard-v2
npm install
npm install auto-launch  # Pour le system tray
npm run dev-all          # Mode développement
npm run dist-win         # Créer l'installateur avec system tray
```

### Fonctionnalités Dashboard v2.1

#### Interface Principale
- **Vue d'ensemble** : Métriques en temps réel (projets, conversations, stockage)
- **Gestion projets** : Édition des noms et descriptions sans toucher aux IDs
- **Conversations** : Visualisation triée par type (Full/Summary) et date
- **Backup système** : Backup local, export complet, ouverture dossier
- **Analyse debug** : Statistiques détaillées des archives

#### System Tray (NOUVEAU)
- **Icône système** : Présence permanente dans la barre des tâches Windows
- **Menu contextuel** (clic droit) :
  - Statistiques en temps réel
  - Vue rapide des métriques
  - Création de sauvegarde
  - Rafraîchissement des données
  - Démarrage automatique (on/off)
  - Ouvrir le dossier de données
  - Quitter l'application
- **Vue rapide** (double-clic) : Fenêtre flottante avec stats
- **Comportements** :
  - Clic simple : Ouvre/ferme le dashboard
  - Fermer (X) : Minimise dans le tray (ne ferme pas)
  - Démarrage Windows : Se lance minimisé
- **Mise à jour auto** : Stats rafraîchies toutes les 30 secondes

### Architecture Technique Dashboard
```
context-dashboard-v2/
├── electron/           # Backend Electron avec system tray
│   ├── main.cjs       # Logique principale + tray + auto-launch
│   └── preload.cjs    # Bridge sécurisé
├── src/
│   ├── components/
│   │   ├── Common/        # Layout, menu
│   │   ├── Dashboard/     # Métriques, santé
│   │   ├── Projects/      # Cartes projets éditables
│   │   └── Conversations/ # Liste et détails
│   └── App.jsx
├── public/
│   ├── icon.png       # Icône system tray (256x256)
│   └── icon.ico       # Icône Windows
├── dist/              # Build production React
└── dist-electron/     # Application compilée avec installateur
```

## Projets Actifs

| Projet | Technologies | Phase | Conversations |
|--------|-------------|-------|---------------|
| **Heart Of Glass** | IMU, Audio Processing, Ludopédagogie | Development | 58+ |
| **Intégration MCP Claude** | TypeScript, Node.js, WebSocket, Electron | Development | 19+ |
| **AllamBik** | Python, Kindle, Text Processing | Production-ready | 7+ |
| **Logiciel masque sablage verre** | Blender, Python, SVG, 3D→2D | Initial-setup | 5+ |
| **Zotero** | Zotero API, Bibliography Management | Production | 9+ |
| **Budget retraite** | Épargne, Investissement, Fiscalité | Initial-setup | 6+ |

## Fonctionnalités Sécurisées

### Project Context Manager V3.3.2
- **Forçage de chemin** dans le code source TypeScript
- **Résistance garantie** aux mises à jour Claude Desktop
- **Archivage intelligent** : Full (15k car) / Summary (4k car)
- **Sauvegarde automatique** avant modifications
- **Migration automatique** données legacy
- **Anti-duplication** lors d'archivages multiples

### Dashboard Sécurité v2.1
- **Lecture seule** par défaut (édition limitée aux noms/descriptions)
- **IDs jamais modifiés** pour préserver l'intégrité
- **Backup avant édition** automatique
- **Export complet** possible à tout moment
- **Mode debug** avec F12 pour diagnostic
- **Auto-launch sécurisé** : Demande permission au premier lancement
- **Protection contre double lancement** : Nettoyage automatique du registre

### Sécurité des Données
- **Stockage centralisé** : `C:\Users\DAVE666\ClaudeContextManager`
- **Chiffrement** des tokens API
- **Isolation** des environnements par connecteur
- **Backup rotatif** automatique (10 sauvegardes)
- **Manual backups** via dashboard ou system tray

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
cd zotero-mcp && npm install && npx tsc && cd ..

# Analyse stratégique
cd linkedin-strategic && npm install && cd ..
```

### 3. Installation du Dashboard avec System Tray
```bash
cd context-dashboard-v2
npm install
npm install auto-launch  # IMPORTANT pour le system tray
npm run dist-win        # Créer l'installateur Windows complet
```

### 4. Configuration
- Copiez `config-files/claude_desktop_config.json` vers `%APPDATA%\Claude\`
- Configurez vos tokens API dans chaque connecteur
- Installez le dashboard depuis `dist-electron/Context Manager Dashboard Setup.exe`
- Au premier lancement, choisissez si vous voulez le démarrage automatique

## Métriques de Performance

- **228 conversations** archivées et indexées
- **6 projets actifs** avec contexte complet  
- **1.17 Mo** de données structurées
- **10 sauvegardes** rotatives automatiques
- **0 perte de données** lors mises à jour Claude
- **Dashboard 79MB** application autonome avec system tray
- **117 conversations Full** / **111 Summary**
- **System tray** : 0% CPU en idle, rafraîchissement 30s

## Scripts et Commandes Utiles

### Dashboard
```bash
# Développement
npm run dev-all         # Lance React + Electron avec system tray
npm run dev            # React seul (sans Electron)

# Production
npm run build          # Build React
npm run dist-win       # Créer installateur Windows avec system tray

# Scripts PowerShell créés
install-systray.ps1    # Installation automatique system tray
start-dev.ps1          # Lancement rapide mode dev
build-app.ps1          # Build rapide production
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

## System Tray - Interactions

| Action | Comportement |
|--------|-------------|
| **Clic simple** | Toggle affichage dashboard (ouvre/ferme) |
| **Clic droit** | Menu contextuel avec options et stats |
| **Double-clic** | Vue rapide flottante (10s auto-close) |
| **Fermer fenêtre (X)** | Minimise dans tray (ne ferme pas) |
| **Menu → Quitter** | Fermeture complète de l'application |
| **Démarrage Windows** | Lance minimisé dans le tray |
| **Notification** | Balloon au premier minimize |

## Roadmap

### Version 3.4.0 (En cours)
- System tray Windows complet [FAIT]
- Démarrage automatique configurable [FAIT]
- Export automatique vers Obsidian
- Intégration Notion API
- Analytics avancées des conversations
- Recherche full-text dans le dashboard

### Version 3.5.0 (Prochaine)
- Thèmes personnalisables pour le dashboard
- Raccourcis clavier globaux Windows
- Synchronisation multi-machines
- Export PDF des conversations

### Version 4.0.0 (Future)
- AI-powered conversation summarization
- Multi-user collaboration
- Cloud synchronization
- Mobile companion app
- Dashboard web responsive

## Troubleshooting

### System Tray ne s'affiche pas
- Vérifier que `auto-launch` est installé : `npm install auto-launch`
- Reconstruire l'application : `npm run dist-win`
- Vérifier que `public/icon.png` existe (256x256 pixels)

### Dashboard page blanche
- Vérifier que le build React est dans `dist/`
- Relancer `npm run build` puis `npm run dist-win`

### Démarrage automatique ne fonctionne pas
- Vérifier dans le menu tray que l'option est cochée
- Redémarrer Windows après activation
- Vérifier dans le gestionnaire de tâches, onglet "Démarrage"

### Conversations Full non détectées
- Vérifier le champ `archiveType` dans projects.json
- Utiliser l'analyse debug (menu → Analyser les conversations)

### Application ne se ferme pas
- C'est normal ! Elle se minimise dans le tray
- Pour fermer vraiment : clic droit sur l'icône → Quitter

### Erreur de build Electron
- Electron doit être dans `devDependencies`
- Vérifier l'encodage UTF-8 sans BOM de package.json
- Supprimer `node_modules` et réinstaller

### Zotero MCP - Lecture des notes
- Si les notes ne sont pas lues, vérifier la compilation TypeScript avec `npx tsc`
- Le fichier compilé doit être dans `zotero-mcp/build/index.js`
- Redémarrer Claude Desktop après modification

### Fenêtre Electron vide au démarrage
- Vérifier qu'aucune entrée "electron" existe dans le registre Windows
- Ouvrir `regedit` et aller à : `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- Supprimer toute entrée "electron" pointant vers `node_modules\electron\dist\electron.exe`
- Le dashboard inclut maintenant un nettoyage automatique de ces entrées

## Corrections & Problèmes Résolus

### Version 2.1.0 - Octobre 2024

#### Fix : Fenêtre Electron vide au démarrage Windows

**Problème** : Une fenêtre Electron vide s'ouvrait systématiquement au démarrage de Windows en parallèle du Context Manager Dashboard. Cette fenêtre affichait le logo Electron et un chemin de ligne de commande vers `node_modules\electron\dist\electron.exe`.

**Cause** : 
- Entrée incorrecte dans le registre Windows créée par `auto-launch`
- L'entrée "electron" pointait vers `node_modules\electron\dist\electron.exe` au lieu de l'application compilée
- L'auto-launch s'activait également en mode développement

**Solution implémentée** :
1. **Désactivation auto-launch en mode développement** : `autoLauncher` défini à `null` quand `isDev = true`
2. **Nettoyage automatique du registre** : Suppression de l'entrée "electron" au démarrage de l'application
3. **Protection contre null** : Vérifications ajoutées avant chaque appel à `autoLauncher`
4. **Changement isHidden** : `false` au lieu de `true` pour meilleure compatibilité Windows
5. **Fenêtre cachée au démarrage** : En production, la fenêtre reste dans le tray uniquement

**Comportement actuel** :
- **Mode production** : Dashboard caché au démarrage, accessible uniquement via l'icône tray
- **Mode développement** : Fenêtre visible pour faciliter le debug, auto-launch désactivé
- **System Tray** : Fonctionne normalement avec menu contextuel complet
- **Nettoyage automatique** : L'entrée "electron" est supprimée si elle existe au démarrage

**Fichiers modifiés** :
- `context-dashboard-v2/electron/main.cjs` (lignes 17-28, 112-122, 348-358, 648)

**Test de validation** :
1. Suppression manuelle de l'entrée "electron" dans le registre Windows
2. Rebuild de l'application : `npm run build`
3. Redémarrage Windows
4. Vérification : Aucune fenêtre Electron vide, seul le tray apparaît
5. Dashboard s'ouvre uniquement sur clic de l'icône tray

**Pour les utilisateurs** :
Si vous rencontrez ce problème avec une version antérieure :
1. Ouvrir `regedit`
2. Naviguer vers : `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
3. Supprimer l'entrée "electron" si elle existe
4. Mettre à jour vers la version 2.1.0 ou supérieure
5. Redémarrer Windows

## Contribution

Les contributions sont les bienvenues ! Consultez le guide de contribution dans `CONTRIBUTING.md`.

## Changelog

### v2.1.0 Dashboard (Octobre 2024)
- **FIX** : Suppression fenêtre Electron vide au démarrage Windows
- **FIX** : Désactivation auto-launch en mode développement
- **FIX** : Nettoyage automatique entrée "electron" du registre
- **FIX** : Protection contre null sur autoLauncher
- **UPDATE** : Fenêtre reste cachée au démarrage en production
- **UPDATE** : isHidden changé de true à false pour compatibilité

### v3.3.4 + Dashboard v2.0 (Août 2025)
- **NEW** : System tray Windows complet pour le dashboard
- **NEW** : Démarrage automatique configurable avec Windows 11
- **NEW** : Vue rapide des statistiques (fenêtre flottante)
- **NEW** : Menu contextuel dynamique avec stats temps réel
- **NEW** : Minimisation en arrière-plan au lieu de fermer
- **NEW** : Notifications balloon Windows
- **NEW** : Scripts PowerShell d'installation automatique
- **UPDATE** : Package auto-launch intégré
- **UPDATE** : Icônes PNG/ICO pour Windows
- **FIX** : Gestion propre de la fermeture d'application

### v3.3.3 + Zotero v1.1.0 (Août 2025)
- **NEW** : Zotero MCP v1.1.0 - Ajout lecture complète des notes
- **NEW** : Support des exports AllamBik dans Zotero (228+ highlights)
- **NEW** : Fonctions get_item_with_notes, get_note_content, get_item_details
- **TEST** : Validation complète sur corpus Stiegler

### v3.3.2 + Dashboard v1.0.0 (Janvier 2025)
- **NEW** : Dashboard Electron/React autonome
- **NEW** : Installateur Windows NSIS (79MB)
- **NEW** : Visualisation temps réel des projets
- **NEW** : Système de backup avec notifications
- **UPDATE** : Règles archivage 15k/4k caractères

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

**Dernière mise à jour** : Octobre 2024 - v2.1.0 Dashboard (Fix fenêtre Electron)