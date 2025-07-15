# MCP Workspace - Écosystème Complet de Connecteurs Personnalisés

Workspace de développement MCP (Model Context Protocol) avec connecteurs personnalisés pour recherche académique, gestion bibliographique et analyse stratégique.

## Connecteurs MCP Actifs (6)

### **Recherche Académique**
- **`arxiv-server`** - Import articles académiques depuis arXiv
- **`hal-mcp`** *Nouveau* - Base de données HAL (sciences sociales françaises)
- **`zotero-mcp`** - Gestion bibliographique intégrée

### **Outils de Développement**  
- **`project-context-manager`** - Gestionnaire de contexte et archivage (V3.3.2)
- **`github`** - Intégration GitHub officielle
- **`linkedin-strategic`** - Analyse réseau professionnel et financement

## Spécialisations

### **HAL MCP - Sciences Sociales** (8 outils)
- `search_hal_anthropology` - Anthropologie technique et culturelle
- `search_hal_phenomenology` - Phénoménologie et sciences cognitives
- `search_hal_crafts` - Artisanat et gestes techniques
- `search_hal_thesis` - Recherche dans les thèses
- `search_hal_recent` - Publications récentes par domaine
- `search_hal` - Recherche générale avec filtres avancés
- `get_hal_document` - Détails complets documents
- `generate_hal_bibtex` - Export bibliographies BibTeX

### **Zotero MCP - Bibliographie** (9 outils)
- Configuration API, recherche bibliothèque, import arXiv
- Gestion collections, ajout notes, export formats
- 17 collections thématiques organisées

### **Project Context Manager** (14 outils)
- Archivage conversations, gestion projets
- Fonctions : create, rename, delete, search, backup
- Architecture résistante aux mises à jour Claude Desktop

## Métriques

- **Total outils MCP** : 66 outils disponibles
- **Connecteurs personnalisés** : 4/6 (développés en interne)
- **Connecteurs officiels** : 2/6 (GitHub, arXiv)
- **Langages** : TypeScript, Node.js, MCP SDK
- **APIs intégrées** : HAL, Zotero, arXiv, GitHub, LinkedIn

## Structure

```
mcp-workspace/
├── arxiv-server/           # Articles académiques
├── linkedin-strategic/     # Réseau professionnel
├── project-context-manager/ # Gestionnaire contexte (V3.3.2)
├── zotero-mcp/            # Gestion bibliographique
├── hal-mcp/               # Sciences sociales HAL *Nouveau*
├── config-files/          # Configurations Claude Desktop
└── scripts/               # Scripts d'installation
```

## Installation

### 1. Configuration Claude Desktop
Copier le contenu de `config-files/claude_desktop_config.json` vers :
```
C:\Users\DAVE666\AppData\Roaming\Claude\claude_desktop_config.json
```

### 2. Compilation des connecteurs
```bash
# Compiler tous les connecteurs personnalisés
cd arxiv-server && npm run build
cd ../linkedin-strategic && npm run build  
cd ../project-context-manager && npm run build
cd ../zotero-mcp && npm run build
cd ../hal-mcp && npm run build
```

### 3. Redémarrer Claude Desktop

## Domaines de Recherche Couverts

### **Sciences Sociales (HAL)**
- Anthropologie technique et culturelle
- Phénoménologie corporelle et cognitive
- Artisanat et savoir-faire traditionnels
- Sociologie du travail artisanal
- Sciences cognitives incarnées
- STS (Science Technology Society)

### **Sciences Exactes (arXiv)**
- Physique, mathématiques, informatique
- Intelligence artificielle, machine learning
- Sciences cognitives computationnelles

## Workflows Académiques

### **Pipeline de Recherche Intégré**
1. **Recherche HAL** → Publications françaises sciences sociales
2. **Recherche arXiv** → Articles internationaux sciences exactes  
3. **Import Zotero** → Organisation bibliographique
4. **Archivage contexte** → Mémoire conversations recherche
5. **Export bibliographies** → Formats académiques standard

### **Analyse Stratégique**
- **LinkedIn Strategic** → Identification experts/financements
- **GitHub** → Collaboration et versioning
- **Project Manager** → Suivi projets recherche

## Développement

### **Version Actuelle : V3.3.2**
- Succès 6 connecteurs MCP intégrés
- Succès 66 outils spécialisés disponibles
- Succès Architecture résiliente et modulaire
- Succès Installation automatisée PowerShell

### **Prochaines Étapes**
- [ ] Optimisation affichage HAL
- [ ] Workflows inter-connecteurs
- [ ] Interface de recherche unifiée
- [ ] Alertes publications automatiques

## Technologies

- **MCP SDK** v0.5.0+ (Model Context Protocol)
- **TypeScript** 5.0+ (développement typisé)
- **Node.js** 20.0+ (runtime)
- **APIs** : HAL, Zotero Web API, arXiv API, GitHub API
- **Claude Desktop** (environnement d'exécution)

## Documentation

- `hal-mcp/README.md` - Guide connecteur HAL
- `zotero-mcp/README.md` - Guide connecteur Zotero  
- `project-context-manager/README.md` - Guide gestionnaire contexte
- `config-files/README.md` - Configurations disponibles

## Auteur

**David Arnaud** - Développement écosystème MCP complet  
Spécialisé en recherche académique automatisée et gestion bibliographique

---

*Écosystème MCP pour recherche académique française et internationale - Sciences sociales, anthropologie technique, phénoménologie et artisanat.*