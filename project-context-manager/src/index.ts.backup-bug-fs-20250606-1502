#!/usr/bin/env node

/**
 * Project Memory & Context Manager
 * 
 * Résout les défis des créatifs-développeurs :
 * 1. Perte de contexte entre sessions
 * 2. Problèmes architecturaux (code monolithique)
 * 3. Documentation technologique éparpillée
 * 4. Historique des conversations Claude
 * 
 * Fonctionnalités :
 * - Contexte multi-projets persistant
 * - Import/export conversations Claude
 * - Architecture forcée (modularité)
 * - Documentation centralisée par technologie
 * - Mémoire des décisions techniques
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs-extra';
import * as path from 'path';

const server = new Server(
  {
    name: "project-context-manager",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration et chemins
const DATA_DIR = path.join(process.cwd(), 'project-data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
const DOCS_DIR = path.join(DATA_DIR, 'documentation');

// Structure de données des projets
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  technologies: string[];
  architecture: {
    pattern: string;
    structure: string[];
    conventions: string[];
    rules: string[];
  };
  current_phase: string;
  created_date: string;
  last_active: string;
  conversations: ConversationMetadata[];
  documentation: DocumentationLink[];
  decisions: TechnicalDecision[];
}

interface ConversationMetadata {
  id: string;
  date: string;
  phase: string;
  summary: string;
  key_decisions: string[];
  code_files_created: string[];
  problems_solved: string[];
  file_path: string;
}

interface DocumentationLink {
  technology: string;
  title: string;
  url?: string;
  content?: string;
  relevance: 'high' | 'medium' | 'low';
}

interface TechnicalDecision {
  date: string;
  decision: string;
  reasoning: string;
  impact: string;
}

// Initialisation des dossiers
async function initializeDataStructure() {
  try {
    await fs.ensureDir(DATA_DIR);
    await fs.ensureDir(CONVERSATIONS_DIR);
    await fs.ensureDir(DOCS_DIR);
    
    if (!(await fs.pathExists(PROJECTS_FILE))) {
      await fs.writeJson(PROJECTS_FILE, { projects: {}, active_project: null });
    }
  } catch (error) {
    console.error('[INIT ERROR]', error);
  }
}

// Utilitaires pour la gestion des projets
async function loadProjects(): Promise<any> {
  try {
    return await fs.readJson(PROJECTS_FILE);
  } catch (error) {
    return { projects: {}, active_project: null };
  }
}

async function saveProjects(data: any): Promise<void> {
  await fs.writeJson(PROJECTS_FILE, data, { spaces: 2 });
}

async function saveConversation(projectId: string, conversation: any): Promise<string> {
  const conversationId = `conv_${Date.now()}`;
  const filePath = path.join(CONVERSATIONS_DIR, `${projectId}_${conversationId}.json`);
  await fs.writeJson(filePath, conversation, { spaces: 2 });
  return filePath;
}

// Analyseur de conversations Claude
function parseClaudeConversation(conversationText: string): any {
  const lines = conversationText.split('\n');
  const decisions: string[] = [];
  const codeFiles: string[] = [];
  const problems: string[] = [];
  
  // Analyse simple du texte - peut être améliorée
  lines.forEach(line => {
    if (line.includes('décision') || line.includes('choix') || line.includes('opter')) {
      decisions.push(line.trim());
    }
    if (line.includes('.js') || line.includes('.ts') || line.includes('.py')) {
      const match = line.match(/[\w-]+\.(js|ts|py|html|css)/g);
      if (match) codeFiles.push(...match);
    }
    if (line.includes('problème') || line.includes('erreur') || line.includes('bug')) {
      problems.push(line.trim());
    }
  });
  
  return {
    key_decisions: [...new Set(decisions)].slice(0, 5),
    code_files_created: [...new Set(codeFiles)].slice(0, 10),
    problems_solved: [...new Set(problems)].slice(0, 5)
  };
}

// Générateur d'architecture modulaire
function generateModularStructure(projectType: string): any {
  const architectures: any = {
    'web-3d': {
      pattern: 'modular-3d',
      structure: ['src/', 'src/core/', 'src/rendering/', 'src/controls/', 'src/utils/', 'src/shaders/'],
      conventions: ['camelCase', 'ES6-modules', 'functional-components'],
      rules: [
        'Séparer la logique métier du rendu',
        'Un fichier = une responsabilité',
        'Maximum 200 lignes par fichier',
        'Pas de variables globales'
      ]
    },
    'audio-app': {
      pattern: 'audio-modular',
      structure: ['src/', 'src/audio/', 'src/ui/', 'src/effects/', 'src/utils/'],
      conventions: ['camelCase', 'Web-Audio-API', 'component-based'],
      rules: [
        'Séparer audio engine de l\'UI',
        'Gestion mémoire audio obligatoire',
        'Maximum 150 lignes par composant audio'
      ]
    },
    'cad-manufacturing': {
      pattern: 'precision-modular',
      structure: ['src/', 'src/geometry/', 'src/tooling/', 'src/export/', 'src/validation/'],
      conventions: ['camelCase', 'precision-first', 'validation-heavy'],
      rules: [
        'Validation à chaque étape',
        'Précision au millième obligatoire',
        'Séparation calcul/affichage'
      ]
    }
  };
  
  return architectures[projectType] || architectures['web-3d'];
}

/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_projects",
        description: "Liste tous les projets avec leur statut",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "create_project",
        description: "Créer un nouveau projet avec contexte",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Nom du projet"
            },
            description: {
              type: "string", 
              description: "Description du projet"
            },
            project_type: {
              type: "string",
              description: "Type: web-3d, audio-app, cad-manufacturing, custom",
              default: "web-3d"
            },
            technologies: {
              type: "array",
              description: "Technologies utilisées",
              items: { type: "string" }
            }
          },
          required: ["name", "description"]
        }
      },
      {
        name: "switch_project",
        description: "Basculer vers un projet existant",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "ID du projet"
            }
          },
          required: ["project_id"]
        }
      },
      {
        name: "get_project_context",
        description: "Récupérer le contexte complet d'un projet",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "ID du projet (optionnel, utilise le projet actif)"
            }
          }
        }
      },
      {
        name: "import_claude_conversation",
        description: "Importer une conversation Claude dans le projet",
        inputSchema: {
          type: "object",
          properties: {
            conversation_text: {
              type: "string",
              description: "Texte de la conversation exportée de Claude"
            },
            phase: {
              type: "string",
              description: "Phase du projet (ex: initial-setup, development, optimization)"
            },
            summary: {
              type: "string",
              description: "Résumé de la conversation"
            }
          },
          required: ["conversation_text", "phase", "summary"]
        }
      },
      {
        name: "search_conversation_history",
        description: "Rechercher dans l'historique des conversations",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Terme à rechercher"
            },
            project_id: {
              type: "string",
              description: "ID du projet (optionnel)"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "add_documentation",
        description: "Ajouter de la documentation technique",
        inputSchema: {
          type: "object",
          properties: {
            technology: {
              type: "string",
              description: "Technologie concernée"
            },
            title: {
              type: "string",
              description: "Titre de la documentation"
            },
            content: {
              type: "string",
              description: "Contenu ou URL"
            },
            relevance: {
              type: "string",
              description: "Niveau de pertinence: high, medium, low",
              default: "high"
            }
          },
          required: ["technology", "title", "content"]
        }
      },
      {
        name: "record_technical_decision",
        description: "Enregistrer une décision technique",
        inputSchema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              description: "Description de la décision"
            },
            reasoning: {
              type: "string",
              description: "Justification de la décision"
            },
            impact: {
              type: "string",
              description: "Impact attendu"
            }
          },
          required: ["decision", "reasoning"]
        }
      },
      {
        name: "get_architecture_rules",
        description: "Récupérer les règles d'architecture du projet actif",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "update_project_phase",
        description: "Mettre à jour la phase actuelle du projet",
        inputSchema: {
          type: "object",
          properties: {
            phase: {
              type: "string",
              description: "Nouvelle phase du projet"
            }
          },
          required: ["phase"]
        }
      }
    ]
  };
});

/**
 * Handler for tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    await initializeDataStructure();

    switch (name) {
      case "list_projects": {
        const data = await loadProjects();
        const projectList = Object.values(data.projects).map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          last_active: p.last_active,
          current_phase: p.current_phase,
          technologies: p.technologies
        }));

        return {
          content: [{
            type: "text",
            text: `📋 **PROJETS DISPONIBLES**\n\n${JSON.stringify({
              active_project: data.active_project,
              projects: projectList
            }, null, 2)}`
          }]
        };
      }

      case "create_project": {
        const { name: projectName, description, project_type = "web-3d", technologies = [] } = args as any;
        const data = await loadProjects();
        
        const projectId = projectName.toLowerCase().replace(/\s+/g, '-');
        const architecture = generateModularStructure(project_type);
        
        const newProject: Project = {
          id: projectId,
          name: projectName,
          description,
          status: 'active',
          technologies,
          architecture,
          current_phase: 'initial-setup',
          created_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          conversations: [],
          documentation: [],
          decisions: []
        };

        data.projects[projectId] = newProject;
        data.active_project = projectId;
        await saveProjects(data);

        return {
          content: [{
            type: "text",
            text: `✅ **PROJET CRÉÉ : ${projectName}**\n\n🏗️ **Architecture configurée :**\n${JSON.stringify(architecture, null, 2)}\n\n📁 **Structure recommandée :**\n${architecture.structure.map((folder: string) => `- ${folder}`).join('\n')}\n\n⚡ **Règles à respecter :**\n${architecture.rules.map((rule: string) => `- ${rule}`).join('\n')}`
          }]
        };
      }

      case "switch_project": {
        const { project_id } = args as any;
        const data = await loadProjects();
        
        if (!data.projects[project_id]) {
          throw new Error(`Projet ${project_id} non trouvé`);
        }

        data.active_project = project_id;
        data.projects[project_id].last_active = new Date().toISOString();
        await saveProjects(data);

        const project = data.projects[project_id];
        
        return {
          content: [{
            type: "text",
            text: `🔄 **PROJET ACTIVÉ : ${project.name}**\n\n📊 **Contexte chargé :**\n- Phase actuelle : ${project.current_phase}\n- Technologies : ${project.technologies.join(', ')}\n- Conversations : ${project.conversations.length}\n- Décisions : ${project.decisions.length}\n- Documentation : ${project.documentation.length}\n\n🏗️ **Architecture active :**\n${project.architecture.pattern}\n\n⚡ **Règles à respecter :**\n${project.architecture.rules.map((rule: string) => `- ${rule}`).join('\n')}`
          }]
        };
      }

      case "get_project_context": {
        const { project_id } = args as any;
        const data = await loadProjects();
        const targetProject = project_id ? data.projects[project_id] : data.projects[data.active_project];
        
        if (!targetProject) {
          throw new Error('Aucun projet actif ou projet non trouvé');
        }

        const recentConversations = targetProject.conversations.slice(-3);
        const recentDecisions = targetProject.decisions.slice(-5);

        return {
          content: [{
            type: "text",
            text: `🧠 **CONTEXTE COMPLET : ${targetProject.name}**\n\n📋 **État actuel :**\n- Phase : ${targetProject.current_phase}\n- Statut : ${targetProject.status}\n- Technologies : ${targetProject.technologies.join(', ')}\n\n🏗️ **Architecture :**\n- Pattern : ${targetProject.architecture.pattern}\n- Structure : ${targetProject.architecture.structure.join(', ')}\n- Règles : ${targetProject.architecture.rules.join(' | ')}\n\n💬 **Conversations récentes :**\n${recentConversations.map((conv: any) => `- ${conv.date} : ${conv.summary}`).join('\n')}\n\n⚡ **Décisions récentes :**\n${recentDecisions.map((dec: any) => `- ${dec.date} : ${dec.decision}`).join('\n')}\n\n📚 **Documentation disponible :**\n${targetProject.documentation.map((doc: any) => `- ${doc.technology} : ${doc.title}`).join('\n')}`
          }]
        };
      }

      case "import_claude_conversation": {
        const { conversation_text, phase, summary } = args as any;
        const data = await loadProjects();
        const activeProject = data.projects[data.active_project];
        
        if (!activeProject) {
          throw new Error('Aucun projet actif');
        }

        const parsed = parseClaudeConversation(conversation_text);
        const conversationData = {
          id: `conv_${Date.now()}`,
          date: new Date().toISOString(),
          phase,
          summary,
          raw_conversation: conversation_text,
          ...parsed
        };

        const filePath = await saveConversation(activeProject.id, conversationData);
        
        activeProject.conversations.push({
          ...conversationData,
          file_path: filePath
        });

        await saveProjects(data);

        return {
          content: [{
            type: "text",
            text: `📥 **CONVERSATION IMPORTÉE**\n\n📊 **Analyse automatique :**\n- Décisions identifiées : ${parsed.key_decisions.length}\n- Fichiers créés : ${parsed.code_files_created.length}\n- Problèmes résolus : ${parsed.problems_solved.length}\n\n💾 **Sauvegardé dans :** ${filePath}\n\n🔍 **Décisions extraites :**\n${parsed.key_decisions.map((d: string) => `- ${d}`).join('\n')}`
          }]
        };
      }

      case "search_conversation_history": {
        const { query, project_id } = args as any;
        const data = await loadProjects();
        const searchProjects = project_id ? [data.projects[project_id]] : Object.values(data.projects);
        
        const results: any[] = [];
        
        for (const project of searchProjects) {
          if (!project) continue;
          
          for (const conv of (project as any).conversations) {
            if (conv.summary.toLowerCase().includes(query.toLowerCase()) ||
                conv.key_decisions.some((d: string) => d.toLowerCase().includes(query.toLowerCase())) ||
                conv.problems_solved.some((p: string) => p.toLowerCase().includes(query.toLowerCase()))) {
              results.push({
                project: (project as any).name,
                date: conv.date,
                phase: conv.phase,
                summary: conv.summary,
                relevance: 'high'
              });
            }
          }
        }

        return {
          content: [{
            type: "text",
            text: `🔍 **RECHERCHE : "${query}"**\n\n📊 **${results.length} résultats trouvés**\n\n${results.map(r => `📅 ${r.date} - ${r.project}\n🔸 ${r.phase} : ${r.summary}`).join('\n\n')}`
          }]
        };
      }

      case "add_documentation": {
        const { technology, title, content, relevance = 'high' } = args as any;
        const data = await loadProjects();
        const activeProject = data.projects[data.active_project];
        
        if (!activeProject) {
          throw new Error('Aucun projet actif');
        }

        const doc: DocumentationLink = {
          technology,
          title,
          content,
          relevance: relevance as 'high' | 'medium' | 'low'
        };

        activeProject.documentation.push(doc);
        await saveProjects(data);

        return {
          content: [{
            type: "text",
            text: `📚 **DOCUMENTATION AJOUTÉE**\n\n🔧 **Technologie :** ${technology}\n📖 **Titre :** ${title}\n⭐ **Pertinence :** ${relevance}\n\n✅ Documentation accessible pour le projet ${activeProject.name}`
          }]
        };
      }

      case "record_technical_decision": {
        const { decision, reasoning, impact = 'À évaluer' } = args as any;
        const data = await loadProjects();
        const activeProject = data.projects[data.active_project];
        
        if (!activeProject) {
          throw new Error('Aucun projet actif');
        }

        const technicalDecision: TechnicalDecision = {
          date: new Date().toISOString(),
          decision,
          reasoning,
          impact
        };

        activeProject.decisions.push(technicalDecision);
        await saveProjects(data);

        return {
          content: [{
            type: "text",
            text: `⚡ **DÉCISION ENREGISTRÉE**\n\n📋 **Décision :** ${decision}\n🤔 **Justification :** ${reasoning}\n📊 **Impact :** ${impact}\n\n✅ Ajoutée à l'historique du projet ${activeProject.name}`
          }]
        };
      }

      case "get_architecture_rules": {
        const data = await loadProjects();
        const activeProject = data.projects[data.active_project];
        
        if (!activeProject) {
          throw new Error('Aucun projet actif');
        }

        return {
          content: [{
            type: "text",
            text: `🏗️ **RÈGLES D'ARCHITECTURE - ${activeProject.name}**\n\n📐 **Pattern :** ${activeProject.architecture.pattern}\n\n📁 **Structure obligatoire :**\n${activeProject.architecture.structure.map((folder: string) => `- ${folder}`).join('\n')}\n\n✅ **Conventions :**\n${activeProject.architecture.conventions.map((conv: string) => `- ${conv}`).join('\n')}\n\n⚡ **Règles à respecter IMPÉRATIVEMENT :**\n${activeProject.architecture.rules.map((rule: string) => `- ${rule}`).join('\n')}\n\n🎯 **Appliquez ces règles à TOUT le code généré !**`
          }]
        };
      }

      case "update_project_phase": {
        const { phase } = args as any;
        const data = await loadProjects();
        const activeProject = data.projects[data.active_project];
        
        if (!activeProject) {
          throw new Error('Aucun projet actif');
        }

        const oldPhase = activeProject.current_phase;
        activeProject.current_phase = phase;
        activeProject.last_active = new Date().toISOString();
        await saveProjects(data);

        return {
          content: [{
            type: "text",
            text: `🔄 **PHASE MISE À JOUR**\n\n📊 **Projet :** ${activeProject.name}\n⬅️ **Ancienne phase :** ${oldPhase}\n➡️ **Nouvelle phase :** ${phase}\n\n✅ Contexte mis à jour`
          }]
        };
      }

      default:
        throw new Error(`Outil inconnu: ${name}`);
    }
  } catch (error: any) {
    console.error(`[ERROR ${name}]`, error);
    return {
      content: [{
        type: "text",
        text: `❌ **Erreur ${name}:** ${error.message}`
      }]
    };
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🧠 Project Memory & Context Manager started!');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});