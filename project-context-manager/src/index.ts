#!/usr/bin/env node

/**
 * Project Context Manager MCP Server - VERSION CORRIGÉE
 * 
 * Correction du bug fs.writeJson is not a function
 * Utilise fs-extra au lieu de fs natif
 * 
 * Fonctionnalités:
 * - Gestion de projets multi-contexte
 * - Historique des conversations
 * - Documentation technique intégrée
 * - Recherche dans l'historique
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs-extra'; // CORRECTION: Utilise fs-extra au lieu de fs natif
import * as path from 'path';

// Configuration des chemins
const DATA_DIR = path.join(process.cwd(), 'project-data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
const NOTES_DIR = path.join(DATA_DIR, 'notes');

// Interfaces TypeScript
interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  technologies: string[];
  created: string;
  phase: string;
  status: string;
}

interface Conversation {
  id: string;
  project_id: string;
  summary: string;
  phase: string;
  content: string;
  timestamp: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  project_id?: string;
}

interface TechnicalDecision {
  id: string;
  project_id: string;
  decision: string;
  reasoning: string;
  impact: string;
  timestamp: string;
}

interface Documentation {
  id: string;
  project_id: string;
  technology: string;
  title: string;
  content: string;
  relevance: string;
  timestamp: string;
}

// État global
let currentProject: Project | null = null;
let projects: Project[] = [];
let conversations: Conversation[] = [];
let notes: Note[] = [];
let decisions: TechnicalDecision[] = [];
let documentation: Documentation[] = [];

// Initialisation du serveur
const server = new Server(
  {
    name: 'project-context-manager',
    version: '2.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * CORRECTION: Fonctions utilitaires avec fs-extra
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath); // CORRECTION: fs-extra.ensureDir
  } catch (error) {
    console.error(`Erreur création répertoire ${dirPath}:`, error);
    throw error;
  }
}

async function loadData(): Promise<void> {
  try {
    await ensureDirectoryExists(DATA_DIR);
    await ensureDirectoryExists(CONVERSATIONS_DIR);
    await ensureDirectoryExists(NOTES_DIR);

    // Chargement des projets
    if (await fs.pathExists(PROJECTS_FILE)) { // CORRECTION: fs-extra.pathExists
      const data = await fs.readJson(PROJECTS_FILE); // CORRECTION: fs-extra.readJson
      projects = data.projects || [];
      currentProject = data.currentProject || null;
      conversations = data.conversations || [];
      notes = data.notes || [];
      decisions = data.decisions || [];
      documentation = data.documentation || [];
    }
  } catch (error) {
    console.error('Erreur chargement des données:', error);
    // Initialisation avec données vides si erreur
    projects = [];
    conversations = [];
    notes = [];
    decisions = [];
    documentation = [];
  }
}

async function saveData(): Promise<void> {
  try {
    const data = {
      projects,
      currentProject,
      conversations,
      notes,
      decisions,
      documentation,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeJson(PROJECTS_FILE, data, { spaces: 2 }); // CORRECTION: fs-extra.writeJson
  } catch (error) {
    console.error('Erreur sauvegarde des données:', error);
    throw error;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * OUTILS MCP CORRIGÉS
 */

// Liste des outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_projects',
        description: 'Liste tous les projets avec leur statut',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_project',
        description: 'Créer un nouveau projet avec contexte',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nom du projet',
            },
            description: {
              type: 'string',
              description: 'Description du projet',
            },
            project_type: {
              type: 'string',
              description: 'Type: web-3d, audio-app, cad-manufacturing, custom',
              default: 'web-3d',
            },
            technologies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Technologies utilisées',
            },
          },
          required: ['name', 'description'],
        },
      },
      {
        name: 'switch_project',
        description: 'Basculer vers un projet existant',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ID du projet',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_project_context',
        description: 'Récupérer le contexte complet d\'un projet',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ID du projet (optionnel, utilise le projet actif)',
            },
          },
        },
      },
      {
        name: 'import_claude_conversation',
        description: 'Importer une conversation Claude dans le projet',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_text: {
              type: 'string',
              description: 'Texte de la conversation exportée de Claude',
            },
            summary: {
              type: 'string',
              description: 'Résumé de la conversation',
            },
            phase: {
              type: 'string',
              description: 'Phase du projet (ex: initial-setup, development, optimization)',
            },
          },
          required: ['conversation_text', 'phase', 'summary'],
        },
      },
      {
        name: 'search_conversation_history',
        description: 'Rechercher dans l\'historique des conversations',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Terme à rechercher',
            },
            project_id: {
              type: 'string',
              description: 'ID du projet (optionnel)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_documentation',
        description: 'Ajouter de la documentation technique',
        inputSchema: {
          type: 'object',
          properties: {
            technology: {
              type: 'string',
              description: 'Technologie concernée',
            },
            title: {
              type: 'string',
              description: 'Titre de la documentation',
            },
            content: {
              type: 'string',
              description: 'Contenu ou URL',
            },
            relevance: {
              type: 'string',
              description: 'Niveau de pertinence: high, medium, low',
              default: 'high',
            },
          },
          required: ['technology', 'title', 'content'],
        },
      },
      {
        name: 'record_technical_decision',
        description: 'Enregistrer une décision technique',
        inputSchema: {
          type: 'object',
          properties: {
            decision: {
              type: 'string',
              description: 'Description de la décision',
            },
            reasoning: {
              type: 'string',
              description: 'Justification de la décision',
            },
            impact: {
              type: 'string',
              description: 'Impact attendu',
            },
          },
          required: ['decision', 'reasoning'],
        },
      },
      {
        name: 'get_architecture_rules',
        description: 'Récupérer les règles d\'architecture du projet actif',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_project_phase',
        description: 'Mettre à jour la phase actuelle du projet',
        inputSchema: {
          type: 'object',
          properties: {
            phase: {
              type: 'string',
              description: 'Nouvelle phase du projet',
            },
          },
          required: ['phase'],
        },
      },
      {
        name: 'create_note',
        description: 'Créer une nouvelle note',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Titre de la note',
            },
            content: {
              type: 'string',
              description: 'Contenu de la note',
            },
          },
          required: ['title', 'content'],
        },
      },
    ],
  };
});

// Gestionnaire des appels d'outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_projects': {
        return {
          content: [
            {
              type: 'text',
              text: `PROJETS DISPONIBLES

${JSON.stringify({
  active_project: currentProject?.id || null,
  projects: projects.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    phase: p.phase,
    status: p.status,
    technologies: p.technologies
  }))
}, null, 2)}`,
            },
          ],
        };
      }

      case 'create_project': {
        const { name, description, project_type = 'custom', technologies = [] } = args as any;
        
        const newProject: Project = {
          id: generateId(),
          name,
          description,
          type: project_type,
          technologies,
          created: new Date().toISOString(),
          phase: 'initial-setup',
          status: 'active'
        };

        projects.push(newProject);
        currentProject = newProject;
        
        await saveData(); // CORRECTION: Maintenant ça marche avec fs-extra

        return {
          content: [
            {
              type: 'text',
              text: `PROJET CREE AVEC SUCCES

Détails du projet :
- ID : ${newProject.id}
- Nom : ${newProject.name}
- Type : ${newProject.type}
- Technologies : ${newProject.technologies.join(', ')}
- Phase : ${newProject.phase}
- Statut : Actif

Projet actuel : ${newProject.name} est maintenant le projet actif.`,
            },
          ],
        };
      }

      case 'switch_project': {
        const { project_id } = args as any;
        const project = projects.find(p => p.id === project_id);
        
        if (!project) {
          throw new McpError(ErrorCode.InvalidParams, `Projet avec ID ${project_id} non trouvé`);
        }

        currentProject = project;
        await saveData();

        return {
          content: [
            {
              type: 'text',
              text: `PROJET ACTIVE

Projet actuel : ${project.name}
- Phase : ${project.phase}
- Technologies : ${project.technologies.join(', ')}
- Cree : ${new Date(project.created).toLocaleDateString()}`,
            },
          ],
        };
      }

      case 'get_project_context': {
        const { project_id } = args as any;
        const project = project_id 
          ? projects.find(p => p.id === project_id)
          : currentProject;

        if (!project) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet trouvé');
        }

        const projectConversations = conversations.filter(c => c.project_id === project.id);
        const projectNotes = notes.filter(n => n.project_id === project.id);
        const projectDecisions = decisions.filter(d => d.project_id === project.id);
        const projectDocs = documentation.filter(d => d.project_id === project.id);

        return {
          content: [
            {
              type: 'text',
              text: `CONTEXTE COMPLET DU PROJET

## ${project.name}
Description : ${project.description}
Phase : ${project.phase}
Technologies : ${project.technologies.join(', ')}

### Conversations (${projectConversations.length})
${projectConversations.map(c => `- ${c.summary} (${c.phase})`).join('\n') || 'Aucune conversation'}

### Notes (${projectNotes.length})
${projectNotes.map(n => `- ${n.title}`).join('\n') || 'Aucune note'}

### Decisions techniques (${projectDecisions.length})
${projectDecisions.map(d => `- ${d.decision}`).join('\n') || 'Aucune décision'}

### Documentation (${projectDocs.length})
${projectDocs.map(d => `- ${d.title} (${d.technology})`).join('\n') || 'Aucune documentation'}`,
            },
          ],
        };
      }

      case 'import_claude_conversation': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif. Créez ou sélectionnez un projet d\'abord.');
        }

        const { conversation_text, summary, phase } = args as any;
        
        const conversation: Conversation = {
          id: generateId(),
          project_id: currentProject.id,
          summary,
          phase,
          content: conversation_text,
          timestamp: new Date().toISOString()
        };

        conversations.push(conversation);
        await saveData();

        return {
          content: [
            {
              type: 'text',
              text: `CONVERSATION IMPORTEE

Details :
- Projet : ${currentProject.name}
- Phase : ${phase}
- Resume : ${summary}
- Taille : ${conversation_text.length} caracteres
- ID : ${conversation.id}

Recherche : Utilisez search_conversation_history pour retrouver cette conversation.`,
            },
          ],
        };
      }

      case 'search_conversation_history': {
        const { query, project_id } = args as any;
        
        let searchConversations = conversations;
        if (project_id) {
          searchConversations = conversations.filter(c => c.project_id === project_id);
        }

        const results = searchConversations.filter(c => 
          c.content.toLowerCase().includes(query.toLowerCase()) ||
          c.summary.toLowerCase().includes(query.toLowerCase())
        );

        return {
          content: [
            {
              type: 'text',
              text: `RESULTATS DE RECHERCHE

Recherche : "${query}"
Resultats trouves : ${results.length}

${results.map(r => {
  const project = projects.find(p => p.id === r.project_id);
  return `### ${r.summary}
Projet : ${project?.name || 'Inconnu'}
Phase : ${r.phase}
Date : ${new Date(r.timestamp).toLocaleDateString()}
Extrait : ${r.content.substring(0, 200)}...
---`;
}).join('\n')}`,
            },
          ],
        };
      }

      case 'add_documentation': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif. Créez ou sélectionnez un projet d\'abord.');
        }

        const { technology, title, content, relevance = 'high' } = args as any;
        
        const doc: Documentation = {
          id: generateId(),
          project_id: currentProject.id,
          technology,
          title,
          content,
          relevance,
          timestamp: new Date().toISOString()
        };

        documentation.push(doc);
        await saveData();

        return {
          content: [
            {
              type: 'text',
              text: `DOCUMENTATION AJOUTEE

Projet : ${currentProject.name}
Technologie : ${technology}
Titre : ${title}
Pertinence : ${relevance}
ID : ${doc.id}`,
            },
          ],
        };
      }

      case 'record_technical_decision': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif. Créez ou sélectionnez un projet d\'abord.');
        }

        const { decision, reasoning, impact = 'À définir' } = args as any;
        
        const techDecision: TechnicalDecision = {
          id: generateId(),
          project_id: currentProject.id,
          decision,
          reasoning,
          impact,
          timestamp: new Date().toISOString()
        };

        decisions.push(techDecision);
        await saveData();

        return {
          content: [
            {
              type: 'text',
              text: `DECISION TECHNIQUE ENREGISTREE

Projet : ${currentProject.name}
Decision : ${decision}
Justification : ${reasoning}
Impact : ${impact}
ID : ${techDecision.id}`,
            },
          ],
        };
      }

      case 'get_architecture_rules': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif.');
        }

        const projectId = currentProject.id;
        const projectDecisions = decisions.filter(d => d.project_id === projectId);
        const projectDocs = documentation.filter(d => d.project_id === projectId);

        return {
          content: [
            {
              type: 'text',
              text: `REGLES D'ARCHITECTURE - ${currentProject.name}

### Technologies utilisees
${currentProject.technologies.map(t => `- ${t}`).join('\n')}

### Decisions techniques
${projectDecisions.map(d => `- ${d.decision}\n  Justification: ${d.reasoning}`).join('\n\n') || 'Aucune décision enregistrée'}

### Documentation pertinente
${projectDocs.filter(d => d.relevance === 'high').map(d => `- ${d.title} (${d.technology})`).join('\n') || 'Aucune documentation'}`,
            },
          ],
        };
      }

      case 'update_project_phase': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif.');
        }

        const { phase } = args as any;
        const oldPhase = currentProject!.phase;
        currentProject!.phase = phase;
        
        // Mettre à jour dans la liste des projets
        const projectIndex = projects.findIndex(p => p.id === currentProject!.id);
        if (projectIndex !== -1) {
          projects[projectIndex] = currentProject!;
        }

        await saveData();

        return {
          content: [
            {
              type: 'text',
              text: `PHASE MISE A JOUR

Projet : ${currentProject!.name}
Ancienne phase : ${oldPhase}
Nouvelle phase : ${phase}
Timestamp : ${new Date().toISOString()}`,
            },
          ],
        };
      }

      case 'create_note': {
        const { title, content } = args as any;
        
        const note: Note = {
          id: generateId(),
          title,
          content,
          timestamp: new Date().toISOString(),
          project_id: currentProject?.id
        };

        notes.push(note);
        await saveData();

        return {
          content: [
            {
              type: 'text',
              text: `NOTE CREEE

Titre : ${title}
Contenu : ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}
Projet : ${currentProject?.name || 'General'}
ID : ${note.id}`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Outil inconnu: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error(`Erreur dans l'outil ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Erreur interne: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    );
  }
});

/**
 * DÉMARRAGE DU SERVEUR CORRIGÉ
 */
async function main() {
  try {
    // Chargement des données au démarrage
    await loadData();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error('Erreur demarrage Project Context Manager:', error);
    process.exit(1);
  }
}

main().catch(console.error);