# MCP Workspace

Workspace de développement pour connecteurs MCP (Model Context Protocol) personnalisés. Écosystème complet pour recherche académique, gestion bibliographique et analyse stratégique.

## Structure du Projet

```
mcp-workspace/
├── arxiv-server/           # Connecteur arXiv pour articles académiques
├── config-files/          # Configurations Claude Desktop
├── hal-mcp/               # Connecteur HAL (sciences sociales françaises)
├── linkedin-strategic/     # Connecteur LinkedIn pour analyse réseau
├── project-context-manager/ # Gestionnaire de contexte et archivage
├── scripts/               # Scripts d'installation et utilitaires
├── zotero-mcp/           # Connecteur Zotero pour gestion bibliographique
└── .gitignore           # Exclusions Git
```

## Connecteurs Disponibles

### Recherche Académique
- **arxiv-server** - Import et recherche d'articles depuis arXiv
- **hal-mcp** - Accès aux publications HAL (sciences sociales)
- **zotero-mcp** - Gestion bibliographique complète

### Outils de Développement
- **project-context-manager** - Archivage de conversations et gestion de projets
- **linkedin-strategic** - Analyse de réseau professionnel
- **github** - Intégration GitHub (connecteur officiel)

## Installation Rapide

### 1. Cloner le repository
```bash
git clone https://github.com/HelloDave666/mcp-workspace.git
cd mcp-workspace
```

### 2. Installer les dépendances
```bash
# Installer et compiler tous les connecteurs
cd arxiv-server && npm install && npm run build && cd ..
cd hal-mcp && npm install && npm run build && cd ..
cd linkedin-strategic && npm install && npm run build && cd ..
cd project-context-manager && npm install && npm run build && cd ..
cd zotero-mcp && npm install && npm run build && cd ..
```

### 3. Configurer Claude Desktop
Copier la configuration depuis `config-files/claude_desktop_config.json` vers :

**Windows :**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS :**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 4. Redémarrer Claude Desktop

## Configuration

Le fichier `config-files/claude_desktop_config.json` contient la configuration pour 6 connecteurs MCP :

```json
{
  "mcpServers": {
    "arxiv-server": { ... },
    "linkedin-strategic": { ... },
    "project-context-manager": { ... },
    "zotero-mcp": { ... },
    "hal-mcp": { ... },
    "github": { ... }
  }
}
```

## Fonctionnalités par Connecteur

### ArXiv Server
- Recherche d'articles académiques
- Import direct dans Claude

### HAL MCP
- Recherche spécialisée en sciences sociales
- Support anthropologie, phénoménologie, artisanat
- Export bibliographies BibTeX

### Zotero MCP
- Gestion de bibliothèque personnelle
- Import depuis arXiv et HAL
- Organisation en collections thématiques

### Project Context Manager
- Archivage de conversations Claude
- Gestion de projets de développement
- Système de sauvegarde résilient

### LinkedIn Strategic
- Analyse de réseau professionnel
- Identification d'opportunités de financement
- Recherche d'experts par domaine

## Développement

### Prérequis
- Node.js 18+
- TypeScript 5.0+
- npm ou yarn

### Structure d'un connecteur MCP
```
connecteur-name/
├── src/
│   └── index.ts          # Serveur MCP principal
├── package.json          # Dépendances et scripts
├── tsconfig.json         # Configuration TypeScript
└── README.md            # Documentation spécifique
```

### Ajouter un nouveau connecteur
1. Créer le dossier dans `mcp-workspace/`
2. Implémenter le serveur MCP avec SDK officiel
3. Ajouter la configuration dans `config-files/`
4. Compiler et tester

## Scripts Utilitaires

Le dossier `scripts/` contient des utilitaires pour :
- Installation automatisée
- Compilation en lot
- Tests de connectivité
- Mise à jour des configurations

## Domaines d'Application

### Recherche Académique
- Sciences sociales (HAL)
- Sciences exactes (arXiv)
- Gestion bibliographique (Zotero)

### Développement
- Gestion de projets
- Archivage de contexte
- Collaboration (GitHub)

### Analyse Stratégique
- Réseaux professionnels
- Identification d'experts
- Opportunités de financement

## Technologies

- **MCP SDK** - Protocol officiel Anthropic
- **TypeScript** - Développement typé
- **Node.js** - Runtime
- **APIs** - HAL, Zotero, arXiv, LinkedIn, GitHub

## Documentation

Chaque connecteur dispose de sa propre documentation :
- `arxiv-server/README.md`
- `hal-mcp/README.md`
- `linkedin-strategic/README.md`
- `project-context-manager/README.md`
- `zotero-mcp/README.md`

## Contribution

1. Fork le projet
2. Créer une branche feature
3. Implémenter le connecteur ou l'amélioration
4. Tester avec Claude Desktop
5. Soumettre une Pull Request

## Licence

MIT License - Voir fichier LICENSE pour détails

## Auteur

**David Arnaud** - Développement et maintenance de l'écosystème MCP

---

*Workspace complet pour connecteurs MCP spécialisés en recherche académique et analyse stratégique.*