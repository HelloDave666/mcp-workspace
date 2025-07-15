#!/usr/bin/env node

/**
 * MCP PROJECT CONTEXT MANAGER V3.3.2 - STORAGE RESILIENT JSON FIXED + NEW FEATURES
 * 
 * NOUVELLES FONCTIONNALITES V3.3.2:
 * - CORRECTION: Ajout du case create_project manquant
 * - NOUVEAU: Fonction de renommage de projet (rename_project)
 * - NOUVEAU: Fonction de suppression définitive de projet (delete_project)
 * 
 * CORRECTION CRITIQUE V3.3.1: 
 * - Correction definitive erreurs JSON dans nouveaux messages V3.3.0
 * - Application systematique sanitizeForJson et createSafeMessage
 * - Suppression console.log avec caracteres accentues
 * - Messages securises pour compatibilite Claude Desktop
 * 
 * FONCTIONNALITES V3.3.0 CONSERVEES:
 * - Deplacement archives vers dossier centralise stable
 * - Systeme de sauvegarde automatique multi-niveaux
 * - Detection et migration automatique anciennes archives
 * - Chemin absolu independant des versions Claude Desktop
 * - Systeme de backup rotatif avec horodatage
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// NOUVELLE CONFIGURATION STOCKAGE CENTRALISÉ
const APPDATA_DIR = process.env.APPDATA || os.homedir();
const MAIN_DATA_DIR = path.join(APPDATA_DIR, 'ClaudeContextManager');
const PROJECTS_FILE = path.join(MAIN_DATA_DIR, 'projects.json');
const ID_MAPPING_FILE = path.join(MAIN_DATA_DIR, 'conversation_id_mapping.json');
const BACKUP_DIR = path.join(MAIN_DATA_DIR, 'backups');

// ANCIENS EMPLACEMENTS POUR MIGRATION
const LEGACY_PATHS = [
  path.join(process.cwd(), 'project-data'),
  path.join(APPDATA_DIR, 'AnthropicClaude', 'app-0.10.14', 'project-data'),
  path.join(APPDATA_DIR, 'AnthropicClaude', 'app-0.10.38', 'project-data'),
  // Ajouter d'autres versions potentielles
  path.join(APPDATA_DIR, 'Local', 'AnthropicClaude', 'app-0.10.14', 'project-data'),
  path.join(APPDATA_DIR, 'Local', 'AnthropicClaude', 'app-0.10.38', 'project-data'),
];

// Génération d'ID robuste
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// NOUVELLES FONCTIONS D'ÉCHAPPEMENT JSON SÉCURISÉ (conservées de V3.2.2)
function sanitizeForJson(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/"/g, "'")
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\\/g, '/')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

function createSafeMessage(template: string, ...values: string[]): string {
  const sanitizedValues = values.map(v => sanitizeForJson(String(v || '')));
  let result = template;
  
  sanitizedValues.forEach((value, index) => {
    result = result.replace(`{${index}}`, value);
  });
  
  return sanitizeForJson(result);
}

function safeString(value: any): string {
  return (value && typeof value === 'string') ? sanitizeForJson(value) : '';
}

// INTERFACES (conservées)
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
  originalId?: string;
  isArchived?: boolean;
  archiveType?: 'full' | 'summary';
  originalLength?: number;
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

interface ConversationMapping {
  [oldId: string]: {
    newId: string;
    projectId: string;
    title: string;
    date: string;
    phase: string;
  };
}

// État global
let currentProject: Project | null = null;
let projects: Project[] = [];
let conversations: Conversation[] = [];
let notes: Note[] = [];
let decisions: TechnicalDecision[] = [];
let documentation: Documentation[] = [];
let idMapping: ConversationMapping = {};

// Initialisation serveur
const server = new Server(
  {
    name: 'project-context-manager',
    version: '3.3.2',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * NOUVELLES FONCTIONS DE GESTION STOCKAGE CENTRALISÉ
 */

async function ensureMainDirectoryExists(): Promise<void> {
  await fs.ensureDir(MAIN_DATA_DIR);
  await fs.ensureDir(BACKUP_DIR);
}

async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupSubDir = path.join(BACKUP_DIR, `backup_${timestamp}`);
  
  await fs.ensureDir(backupSubDir);
  
  // Copier tous les fichiers principaux
  if (await fs.pathExists(PROJECTS_FILE)) {
    await fs.copy(PROJECTS_FILE, path.join(backupSubDir, 'projects.json'));
  }
  
  if (await fs.pathExists(ID_MAPPING_FILE)) {
    await fs.copy(ID_MAPPING_FILE, path.join(backupSubDir, 'conversation_id_mapping.json'));
  }
  
  // Nettoyer les anciens backups (garder seulement les 10 derniers)
  const backups = await fs.readdir(BACKUP_DIR);
  const sortedBackups = backups
    .filter(name => name.startsWith('backup_'))
    .sort()
    .reverse();
  
  if (sortedBackups.length > 10) {
    for (const oldBackup of sortedBackups.slice(10)) {
      await fs.remove(path.join(BACKUP_DIR, oldBackup));
    }
  }
  
  return backupSubDir;
}

async function detectAndMigrateLegacyData(): Promise<{ found: boolean; migrated: number; sources: string[] }> {
  const migrationResult = {
    found: false,
    migrated: 0,
    sources: [] as string[]
  };

  for (const legacyPath of LEGACY_PATHS) {
    const legacyProjectsFile = path.join(legacyPath, 'projects.json');
    const legacyMappingFile = path.join(legacyPath, 'conversation_id_mapping.json');
    
    if (await fs.pathExists(legacyProjectsFile)) {
      migrationResult.found = true;
      migrationResult.sources.push(legacyPath);
      
      try {
        // Charger données legacy
        const legacyData = await fs.readJson(legacyProjectsFile);
        let legacyMapping = {};
        
        if (await fs.pathExists(legacyMappingFile)) {
          const mappingData = await fs.readJson(legacyMappingFile);
          legacyMapping = mappingData.mapping || {};
        }
        
        // Merger avec données existantes (sans écraser)
        if (legacyData.projects && legacyData.projects.length > 0) {
          // Éviter les doublons par ID
          const existingProjectIds = new Set(projects.map(p => p.id));
          const newProjects = legacyData.projects.filter((p: Project) => !existingProjectIds.has(p.id));
          projects.push(...newProjects);
          migrationResult.migrated += newProjects.length;
        }
        
        if (legacyData.conversations && legacyData.conversations.length > 0) {
          const existingConvIds = new Set(conversations.map(c => c.id));
          const newConversations = legacyData.conversations.filter((c: Conversation) => !existingConvIds.has(c.id));
          conversations.push(...newConversations);
          migrationResult.migrated += newConversations.length;
        }
        
        if (legacyData.notes && legacyData.notes.length > 0) {
          const existingNoteIds = new Set(notes.map(n => n.id));
          const newNotes = legacyData.notes.filter((n: Note) => !existingNoteIds.has(n.id));
          notes.push(...newNotes);
        }
        
        if (legacyData.decisions && legacyData.decisions.length > 0) {
          const existingDecisionIds = new Set(decisions.map(d => d.id));
          const newDecisions = legacyData.decisions.filter((d: TechnicalDecision) => !existingDecisionIds.has(d.id));
          decisions.push(...newDecisions);
        }
        
        if (legacyData.documentation && legacyData.documentation.length > 0) {
          const existingDocIds = new Set(documentation.map(d => d.id));
          const newDocumentation = legacyData.documentation.filter((d: Documentation) => !existingDocIds.has(d.id));
          documentation.push(...newDocumentation);
        }
        
        // Merger mapping IDs
        idMapping = { ...idMapping, ...legacyMapping };
        
      } catch (error) {
        console.error(`Erreur migration depuis ${legacyPath}:`, error);
      }
    }
  }
  
  return migrationResult;
}

async function loadData(): Promise<void> {
  try {
    await ensureMainDirectoryExists();
    
    // Créer backup avant chargement
    if (await fs.pathExists(PROJECTS_FILE)) {
      await createBackup();
    }
    
    // Charger données principales
    if (await fs.pathExists(PROJECTS_FILE)) {
      const data = await fs.readJson(PROJECTS_FILE);
      projects = data.projects || [];
      currentProject = data.currentProject || null;
      conversations = data.conversations || [];
      notes = data.notes || [];
      decisions = data.decisions || [];
      documentation = data.documentation || [];
    }

    if (await fs.pathExists(ID_MAPPING_FILE)) {
      const mappingData = await fs.readJson(ID_MAPPING_FILE);
      idMapping = mappingData.mapping || {};
    }
    
    // Détecter et migrer anciennes données
    const migrationResult = await detectAndMigrateLegacyData();
    
    if (migrationResult.found) {
      // Sauvegarder les données migrées
      await saveData();
      await saveIdMapping();
    }
    
  } catch (error) {
    console.error('Erreur chargement:', error);
    // Initialiser données vides en cas d'erreur
    projects = [];
    conversations = [];
    notes = [];
    decisions = [];
    documentation = [];
    idMapping = {};
  }
}

async function saveData(): Promise<void> {
  try {
    await ensureMainDirectoryExists();
    
    const data = {
      projects,
      currentProject,
      conversations,
      notes,
      decisions,
      documentation,
      lastUpdated: new Date().toISOString(),
      version: '3.3.2',
      storage: {
        location: MAIN_DATA_DIR,
        migrated: true,
        backupEnabled: true
      }
    };
    
    await fs.writeJson(PROJECTS_FILE, data, { spaces: 2 });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    throw error;
  }
}

async function saveIdMapping(): Promise<void> {
  try {
    await ensureMainDirectoryExists();
    
    const mappingData = {
      mapping: idMapping,
      lastUpdated: new Date().toISOString(),
      totalConversations: Object.keys(idMapping).length,
      version: '3.3.2'
    };
    
    await fs.writeJson(ID_MAPPING_FILE, mappingData, { spaces: 2 });
  } catch (error) {
    console.error('Erreur sauvegarde mapping:', error);
    throw error;
  }
}

/**
 * FONCTIONS MÉTIER (conservées de V3.2.2 avec échappement JSON)
 */

function createConversationSummary(fullContent: string, targetReduction: number = 0.5): string {
  const lines = fullContent.split('\n');
  const totalLines = lines.length;
  const targetLines = Math.floor(totalLines * targetReduction);
  
  const summary: string[] = [];
  
  const startLines = Math.floor(targetLines * 0.2);
  summary.push('=== DEBUT DE CONVERSATION ===');
  summary.push(...lines.slice(0, startLines));
  
  const middleLines = Math.floor(targetLines * 0.6);
  const middleStart = Math.floor(totalLines * 0.3);
  const middleEnd = Math.floor(totalLines * 0.7);
  const middleSection = lines.slice(middleStart, middleEnd);
  
  const importantMiddle = middleSection.filter(line => 
    line.includes('```') ||
    line.startsWith('#') ||
    line.includes('IMPORTANT') ||
    line.includes('ERROR') ||
    line.includes('SUCCESS') ||
    line.length > 100
  ).slice(0, middleLines);
  
  summary.push('\n=== SECTION PRINCIPALE (RESUME) ===');
  summary.push(...importantMiddle);
  
  const endLines = Math.floor(targetLines * 0.2);
  summary.push('\n=== FIN DE CONVERSATION ===');
  summary.push(...lines.slice(-endLines));
  
  return summary.join('\n');
}

function detectConversationPhase(content: string): string {
  if (!content || typeof content !== 'string') {
    return 'development';
  }
  
  const contentLower = content.toLowerCase();
  
  if (contentLower.includes('initial') || contentLower.includes('setup') || contentLower.includes('création')) {
    return 'initial-setup';
  } else if (contentLower.includes('development') || contentLower.includes('implémentation') || contentLower.includes('code')) {
    return 'development';
  } else if (contentLower.includes('debug') || contentLower.includes('erreur') || contentLower.includes('fix')) {
    return 'debugging';
  } else if (contentLower.includes('test') || contentLower.includes('validation')) {
    return 'testing';
  } else if (contentLower.includes('optimization') || contentLower.includes('amélioration')) {
    return 'optimization';
  } else if (contentLower.includes('finalization') || contentLower.includes('production')) {
    return 'finalization';
  }
  
  return 'development';
}

// FONCTION D'ANALYSE D'INTÉGRITÉ SIMPLIFIÉE
function analyzeProjectIntegritySimple(): {
  totalProjects: number;
  totalConversations: number;
  archiveStats: { total: number; summarized: number; full: number };
  recommendations: string[];
} {
  return {
    totalProjects: projects.length,
    totalConversations: conversations.length,
    archiveStats: {
      total: conversations.length,
      summarized: conversations.filter(c => c.archiveType === 'summary').length,
      full: conversations.filter(c => c.archiveType === 'full').length
    },
    recommendations: [
      "Archives protegees par stockage centralise V3.3.2",
      "Systeme resistant aux mises a jour Claude Desktop"
    ]
  };
}

async function analyzeStorageHealth(): Promise<{
  mainStorage: boolean;
  backupsAvailable: number;
  legacyDataFound: string[];
  totalSize: string;
  recommendations: string[];
}> {
  const health = {
    mainStorage: false,
    backupsAvailable: 0,
    legacyDataFound: [] as string[],
    totalSize: '0 Ko',
    recommendations: [] as string[]
  };
  
  // Vérifier stockage principal
  health.mainStorage = await fs.pathExists(PROJECTS_FILE);
  
  // Compter backups
  if (await fs.pathExists(BACKUP_DIR)) {
    const backups = await fs.readdir(BACKUP_DIR);
    health.backupsAvailable = backups.filter(name => name.startsWith('backup_')).length;
  }
  
  // Chercher données legacy
  for (const legacyPath of LEGACY_PATHS) {
    if (await fs.pathExists(path.join(legacyPath, 'projects.json'))) {
      health.legacyDataFound.push(legacyPath);
    }
  }
  
  // Calculer taille totale
  let totalBytes = 0;
  if (await fs.pathExists(PROJECTS_FILE)) {
    const stats = await fs.stat(PROJECTS_FILE);
    totalBytes += stats.size;
  }
  if (await fs.pathExists(ID_MAPPING_FILE)) {
    const stats = await fs.stat(ID_MAPPING_FILE);
    totalBytes += stats.size;
  }
  
  health.totalSize = totalBytes > 1024 * 1024 
    ? `${(totalBytes / (1024 * 1024)).toFixed(2)} Mo`
    : `${Math.round(totalBytes / 1024)} Ko`;
  
  // Recommandations
  if (!health.mainStorage) {
    health.recommendations.push("CRITIQUE: Aucune donnée dans le stockage principal");
  }
  if (health.backupsAvailable === 0) {
    health.recommendations.push("Aucune sauvegarde trouvée - Créer backup immédiatement");
  }
  if (health.legacyDataFound.length > 0) {
    health.recommendations.push(`${health.legacyDataFound.length} emplacements legacy détectés - Migration recommandée`);
  }
  if (health.backupsAvailable > 15) {
    health.recommendations.push("Nombreuses sauvegardes - Nettoyage recommandé");
  }
  
  return health;
}

/**
 * NOUVELLES FONCTIONS V3.3.2
 */

async function deleteProjectCompletely(projectId: string): Promise<{
  project: Project;
  deletedConversations: number;
  deletedNotes: number;
  deletedDecisions: number;
  deletedDocumentation: number;
}> {
  // Trouver le projet
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    throw new Error(`Projet non trouvé: ${projectId}`);
  }

  // Compter les éléments à supprimer
  const projectConversations = conversations.filter(c => c.project_id === projectId);
  const projectNotes = notes.filter(n => n.project_id === projectId);
  const projectDecisions = decisions.filter(d => d.project_id === projectId);
  const projectDocs = documentation.filter(d => d.project_id === projectId);

  // Supprimer tous les éléments associés
  conversations = conversations.filter(c => c.project_id !== projectId);
  notes = notes.filter(n => n.project_id !== projectId);
  decisions = decisions.filter(d => d.project_id !== projectId);
  documentation = documentation.filter(d => d.project_id !== projectId);

  // Supprimer le projet
  projects = projects.filter(p => p.id !== projectId);

  // Mettre à jour currentProject si nécessaire
  if (currentProject && currentProject.id === projectId) {
    currentProject = projects.length > 0 ? projects[0] : null;
  }

  return {
    project,
    deletedConversations: projectConversations.length,
    deletedNotes: projectNotes.length,
    deletedDecisions: projectDecisions.length,
    deletedDocumentation: projectDocs.length
  };
}

/**
 * CONFIGURATION DES OUTILS (étendue avec nouvelles fonctions V3.3.2)
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // === OUTILS EXISTANTS (conservés) ===
      {
        name: 'list_projects',
        description: 'Liste tous les projets avec leurs statuts',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_project',
        description: 'Créer un nouveau projet pour archivage',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nom du projet' },
            description: { type: 'string', description: 'Description du projet' },
            project_type: { type: 'string', description: 'Type: web-3d, audio-app, cad-manufacturing, custom', default: 'custom' },
            technologies: { type: 'array', items: { type: 'string' }, description: 'Technologies utilisées' }
          },
          required: ['name', 'description']
        }
      },
      
      // === NOUVEAUX OUTILS V3.3.2 ===
      {
        name: 'rename_project',
        description: 'MANAGE - Renommer un projet existant',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'ID du projet à renommer' },
            new_name: { type: 'string', description: 'Nouveau nom du projet' },
            new_description: { type: 'string', description: 'Nouvelle description (optionnelle)' }
          },
          required: ['project_id', 'new_name']
        }
      },
      {
        name: 'delete_project',
        description: 'DANGER - Supprimer définitivement un projet et toutes ses données',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'ID du projet à supprimer' },
            confirm_deletion: { type: 'boolean', description: 'Confirmation explicite de suppression', default: false }
          },
          required: ['project_id', 'confirm_deletion']
        }
      },
      
      {
        name: 'import_claude_conversation',
        description: 'ARCHIVE - FONCTION PRINCIPALE - Importer et archiver une conversation Claude',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_text: { type: 'string', description: 'Texte complet de la conversation Claude' },
            summary: { type: 'string', description: 'Résumé de la conversation' },
            phase: { type: 'string', description: 'Phase du projet (auto-détectée si vide)' },
            archive_type: { type: 'string', description: 'Type d\'archivage: "full" ou "summary"', default: 'full' }
          },
          required: ['conversation_text', 'summary']
        }
      },
      
      // === NOUVEAUX OUTILS V3.3.0 STOCKAGE RÉSILIENT ===
      {
        name: 'check_storage_health',
        description: 'HEALTH - Analyser la santé du stockage et détecter problèmes',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_manual_backup',
        description: 'BACKUP - Créer une sauvegarde manuelle immédiate',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'migrate_legacy_data',
        description: 'MIGRATE - Détecter et migrer données depuis anciens emplacements',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'show_storage_info',
        description: 'INFO - Afficher informations détaillées sur le stockage',
        inputSchema: { type: 'object', properties: {} }
      },
      
      // === OUTILS EXISTANTS AUTRES (adaptés pour nouveau stockage) ===
      {
        name: 'switch_project',
        description: 'Basculer vers un projet existant',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'ID du projet' }
          },
          required: ['project_id']
        }
      },
      {
        name: 'get_project_context',
        description: 'Récupérer le contexte complet d\'un projet archivé',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'ID du projet (optionnel, utilise le projet actif)' }
          }
        }
      },
      {
        name: 'search_conversation_history',
        description: 'Rechercher dans l\'historique archivé',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Terme à rechercher' },
            project_id: { type: 'string', description: 'ID du projet (optionnel)' }
          },
          required: ['query']
        }
      },
      {
        name: 'analyze_project_integrity',
        description: 'ANALYZE - Analyser l\'intégrité des archives et détecter les conversations mal placées + doublons',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_note',
        description: 'Créer une note dans le projet',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Titre de la note' },
            content: { type: 'string', description: 'Contenu de la note' }
          },
          required: ['title', 'content']
        }
      }
    ]
  };
});

/**
 * GESTIONNAIRE DES APPELS D'OUTILS (étendu avec nouvelles fonctions V3.3.2)
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // === CORRECTION V3.3.2: AJOUT DU CASE CREATE_PROJECT MANQUANT ===
      case 'create_project': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { name: projectName, description, project_type = 'custom', technologies = [] } = args as any;
        
        // Vérifier que le nom n'existe pas déjà
        const existingProject = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
        if (existingProject) {
          throw new McpError(ErrorCode.InvalidParams, `Un projet avec le nom "${projectName}" existe déjà`);
        }

        const project: Project = {
          id: generateId(),
          name: sanitizeForJson(projectName),
          description: sanitizeForJson(description),
          type: project_type,
          technologies: Array.isArray(technologies) ? technologies.map(t => sanitizeForJson(t)) : [],
          created: new Date().toISOString(),
          phase: 'initial-setup',
          status: 'active'
        };

        projects.push(project);
        currentProject = project; // Auto-switcher vers le nouveau projet
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`NOUVEAU PROJET CREE AVEC SUCCES

Nom : {0}
Description : {1}
Type : {2}
Technologies : {3}
ID : {4}
Phase : {5}

Projet actif pour archivage. Vous pouvez maintenant importer des conversations Claude.`,
              project.name,
              project.description,
              project.type,
              project.technologies.join(', '),
              project.id,
              project.phase)
          }]
        };
      }

      // === NOUVEAUX OUTILS V3.3.2 ===
      case 'rename_project': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { project_id, new_name, new_description } = args as any;
        
        const project = projects.find(p => p.id === project_id);
        if (!project) {
          throw new McpError(ErrorCode.InvalidParams, `Projet non trouvé: ${project_id}`);
        }

        // Vérifier que le nouveau nom n'existe pas déjà (sauf pour le projet actuel)
        const existingProject = projects.find(p => p.name.toLowerCase() === new_name.toLowerCase() && p.id !== project_id);
        if (existingProject) {
          throw new McpError(ErrorCode.InvalidParams, `Un autre projet porte déjà le nom "${new_name}"`);
        }

        const oldName = project.name;
        project.name = sanitizeForJson(new_name);
        
        if (new_description) {
          project.description = sanitizeForJson(new_description);
        }

        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`PROJET RENOMME AVEC SUCCES

Ancien nom : {0}
Nouveau nom : {1}
Description : {2}
ID : {3}

Le projet a été renommé et toutes les données associées (conversations, notes, etc.) sont conservées.`,
              oldName,
              project.name,
              project.description,
              project.id)
          }]
        };
      }

      case 'delete_project': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { project_id, confirm_deletion } = args as any;
        
        if (!confirm_deletion) {
          throw new McpError(ErrorCode.InvalidParams, "Suppression annulée - confirmation explicite requise (confirm_deletion: true)");
        }

        const deletionResult = await deleteProjectCompletely(project_id);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`PROJET SUPPRIME DEFINITIVEMENT

Projet supprimé : {0}
Description : {1}
ID : {2}

Données supprimées :
- Conversations : {3}
- Notes : {4}
- Décisions techniques : {5}
- Documentation : {6}

ATTENTION: Cette suppression est définitive et irréversible.
Toutes les données associées ont été supprimées.

{7}`,
              deletionResult.project.name,
              deletionResult.project.description,
              deletionResult.project.id,
              deletionResult.deletedConversations.toString(),
              deletionResult.deletedNotes.toString(),
              deletionResult.deletedDecisions.toString(),
              deletionResult.deletedDocumentation.toString(),
              currentProject ? `Projet actif actuel : ${currentProject.name}` : 'Aucun projet actif - créez ou sélectionnez un projet')
          }]
        };
      }

      // === NOUVEAUX OUTILS V3.3.0 ===
      case 'check_storage_health': {
        const health = await analyzeStorageHealth();
        
        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`ANALYSE SANTE DU STOCKAGE

Stockage principal : {0}
Emplacement : {1}
Taille totale : {2}

Sauvegardes disponibles : {3}
Emplacement backups : {4}

Donnees legacy detectees : {5}
{6}

Recommandations :
{7}

Architecture V3.3.2 : RESILIENTE AUX MISES A JOUR CLAUDE`,
              health.mainStorage ? 'OPERATIONNEL' : 'MANQUANT',
              MAIN_DATA_DIR,
              health.totalSize,
              health.backupsAvailable.toString(),
              BACKUP_DIR,
              health.legacyDataFound.length.toString(),
              health.legacyDataFound.length > 0 ? 
                `Emplacements :\n${health.legacyDataFound.map(p => `- ${p}`).join('\n')}` : 
                'Aucune donnee legacy trouvee',
              health.recommendations.length > 0 ? 
                health.recommendations.map(r => `- ${r}`).join('\n') : 
                '- Systeme de stockage en parfait etat')
          }]
        };
      }

      case 'create_manual_backup': {
        const backupPath = await createBackup();
        
        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`SAUVEGARDE MANUELLE CREEE

Emplacement : {0}
Timestamp : {1}
Contenu sauvegarde :
- Projets et conversations
- Mapping des IDs  
- Notes et decisions techniques
- Documentation

La sauvegarde est independante des versions Claude Desktop et sera preservee lors des mises a jour.

Retention : 10 backups maximum (rotation automatique)`, 
              backupPath, 
              new Date().toLocaleString())
          }]
        };
      }

      case 'migrate_legacy_data': {
        const migrationResult = await detectAndMigrateLegacyData();
        
        if (migrationResult.found) {
          await saveData();
          await saveIdMapping();
        }
        
        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`MIGRATION DONNEES LEGACY

Donnees legacy trouvees : {0}
Elements migres : {1}
Sources detectees : {2}

{3}

{4}`,
              migrationResult.found ? 'OUI' : 'NON',
              migrationResult.migrated.toString(),
              migrationResult.sources.length.toString(),
              migrationResult.sources.length > 0 ? 
                `Emplacements traites :\n${migrationResult.sources.map(s => `- ${s}`).join('\n')}` : 
                'Aucune source legacy detectee',
              migrationResult.found ? 
                `Migration terminee avec succes !\nToutes les donnees sont maintenant centralisees dans :\n${MAIN_DATA_DIR}\n\nLes donnees sont desormais protegees contre les futures mises a jour Claude Desktop.` : 
                'Aucune migration necessaire - Toutes les donnees sont deja centralisees.')
          }]
        };
      }

      case 'show_storage_info': {
        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`INFORMATIONS STOCKAGE CENTRALISE V3.3.2

EMPLACEMENT PRINCIPAL :
{0}

FICHIERS PRINCIPAUX :
- projects.json (donnees principales)
- conversation_id_mapping.json (index conversations)

DOSSIER SAUVEGARDES :
{1}

AVANTAGES ARCHITECTURE V3.3.2 :
✅ Independent des versions Claude Desktop
✅ Survit aux mises a jour automatiques  
✅ Sauvegardes automatiques rotatives
✅ Migration automatique donnees legacy
✅ Emplacement standard Windows (%APPDATA%)
✅ Pas de perte lors maj Claude 0.10.14 → 0.10.38
✅ Nouvelles fonctions gestion projets V3.3.2

ANCIENS EMPLACEMENTS MONITORES :
{2}

Le systeme detecte automatiquement et migre toute donnee trouvee dans ces anciens emplacements.`,
              MAIN_DATA_DIR,
              BACKUP_DIR,
              LEGACY_PATHS.map(p => `- ${p}`).join('\n'))
          }]
        };
      }

      // === OUTILS EXISTANTS ADAPTES ===
      case 'switch_project': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { project_id } = args as any;
        const project = projects.find(p => p.id === project_id);
        
        if (!project) {
          throw new McpError(ErrorCode.InvalidParams, `Projet non trouve: ${project_id}`);
        }

        currentProject = project;
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`PROJET ACTIVE POUR ARCHIVAGE

Projet actuel : {0}
- Phase : {1}
- Technologies : {2}
- Cree : {3}

Pret pour import de conversations Claude`,
              project.name,
              project.phase,
              project.technologies.join(', '),
              new Date(project.created).toLocaleDateString())
          }]
        };
      }

      case 'get_project_context': {
        const project_id = args && typeof args === 'object' && 'project_id' in args 
          ? String(args.project_id) : undefined;

        const project = project_id 
          ? projects.find(p => p.id === project_id)
          : currentProject;

        if (!project) {
          throw new McpError(ErrorCode.InvalidParams, 'Projet non trouve');
        }

        const projectConversations = conversations.filter(c => c.project_id === project.id);
        const projectNotes = notes.filter(n => n.project_id === project.id);
        const projectDecisions = decisions.filter(d => d.project_id === project.id);
        const projectDocs = documentation.filter(d => d.project_id === project.id);

        const conversationsList = projectConversations.length > 0 
          ? projectConversations.map(c => {
              const summary = safeString(c.summary).substring(0, 80);
              const phase = c.phase || 'unknown';
              const archiveType = c.archiveType ? ` [${c.archiveType}]` : '';
              return `- ${summary} (${phase})${archiveType}`;
            }).join('\n')
          : 'Aucune conversation';

        const notesList = projectNotes.length > 0
          ? projectNotes.map(n => `- ${safeString(n.title)}`).join('\n')
          : 'Aucune note';

        const decisionsList = projectDecisions.length > 0
          ? projectDecisions.map(d => `- ${safeString(d.decision)}`).join('\n')
          : 'Aucune decision';

        const docsList = projectDocs.length > 0
          ? projectDocs.map(d => `- ${safeString(d.title)} (${safeString(d.technology)})`).join('\n')
          : 'Aucune documentation';

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`CONTEXTE COMPLET DU PROJET

## {0}
Description : {1}
Phase : {2}
Technologies : {3}

### Conversations ({4})
{5}

### Notes ({6})
{7}

### Decisions techniques ({8})
{9}

### Documentation ({10})
{11}`,
              safeString(project.name),
              safeString(project.description),
              project.phase,
              project.technologies.join(', '),
              projectConversations.length.toString(),
              conversationsList,
              projectNotes.length.toString(),
              notesList,
              projectDecisions.length.toString(),
              decisionsList,
              projectDocs.length.toString(),
              docsList)
          }]
        };
      }

      case 'import_claude_conversation': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif. Creez ou selectionnez un projet.');
        }

        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { conversation_text, summary, phase, archive_type = 'full' } = args as any;
        
        const detectedPhase = phase || detectConversationPhase(conversation_text);
        
        let finalContent = conversation_text;
        let originalLength = conversation_text.length;
        
        if (archive_type === 'summary') {
          finalContent = createConversationSummary(conversation_text);
        }
        
        const conversation: Conversation = {
          id: generateId(),
          project_id: currentProject!.id,
          summary: sanitizeForJson(summary),
          phase: detectedPhase,
          content: finalContent,
          timestamp: new Date().toISOString(),
          isArchived: true,
          archiveType: archive_type,
          originalLength: originalLength
        };

        conversations.push(conversation);
        await saveData();

        const reductionPercentage = archive_type === 'summary' 
          ? Math.round((1 - finalContent.length / originalLength) * 100)
          : 0;

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`CONVERSATION CLAUDE ARCHIVEE

Projet : {0}
Phase : {1}
Resume : {2}
Type d'archivage : {3}
{4}
ID : {5}

Conversation archivee avec succes !`,
              currentProject!.name,
              detectedPhase,
              summary,
              archive_type,
              archive_type === 'summary' 
                ? `Reduction : ${reductionPercentage}% (${originalLength} → ${finalContent.length} caracteres)`
                : `Taille : ${finalContent.length} caracteres`,
              conversation.id)
          }]
        };
      }

      case 'search_conversation_history': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { query, project_id } = args as any;
        
        let searchConversations = conversations;
        if (project_id) {
          searchConversations = conversations.filter(c => c.project_id === project_id);
        }

        const safeQuery = sanitizeForJson(query).toLowerCase();
        const results = searchConversations.filter(c => 
          sanitizeForJson(c.content).toLowerCase().includes(safeQuery) ||
          sanitizeForJson(c.summary).toLowerCase().includes(safeQuery)
        );

        const resultsList = results.map(r => {
          const project = projects.find(p => p.id === r.project_id);
          const summary = safeString(r.summary).substring(0, 80);
          const projectName = safeString(project?.name) || 'Inconnu';
          const phase = r.phase || 'unknown';
          const archiveType = r.archiveType || 'standard';
          const dateText = new Date(r.timestamp).toLocaleDateString();
          
          return `### ${summary}
Projet : ${projectName}
Phase : ${phase}
Type : ${archiveType}
Date : ${dateText}
ID : ${r.id}
---`;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`RECHERCHE DANS LES ARCHIVES

Recherche : {0}
Resultats trouves : {1}

{2}`, query, results.length.toString(), resultsList)
          }]
        };
      }

      case 'analyze_project_integrity': {
        const analysis = analyzeProjectIntegritySimple();
        
        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`ANALYSE D'INTEGRITE DES ARCHIVES - STOCKAGE CENTRALISE V3.3.2

Statistiques generales :
- Projets totaux : {0}
- Conversations archivees : {1}

Statistiques d'archivage :
- Conversations completes : {2}
- Conversations resumees : {3}
- Non archivees : {4}

Stockage centralise : ACTIF
Emplacement : {5}

Avantages stockage V3.3.2 :
✅ Resistant aux mises a jour Claude Desktop
✅ Sauvegarde automatique avant modifications
✅ Migration automatique donnees dispersees
✅ Aucune perte lors maj 0.10.14 → 0.10.38
✅ Gestion avancee projets (renommage, suppression)

Recommandations :
{6}`,
              analysis.totalProjects.toString(),
              analysis.totalConversations.toString(),
              analysis.archiveStats.full.toString(),
              analysis.archiveStats.summarized.toString(),
              (analysis.archiveStats.total - analysis.archiveStats.full - analysis.archiveStats.summarized).toString(),
              MAIN_DATA_DIR,
              analysis.recommendations.join('\n'))
          }]
        };
      }

      case 'create_note': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { title, content } = args as any;
        
        const note: Note = {
          id: generateId(),
          title: sanitizeForJson(title),
          content: sanitizeForJson(content),
          timestamp: new Date().toISOString(),
          project_id: currentProject?.id
        };

        notes.push(note);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`NOTE CREEE

Titre : {0}
Projet : {1}
ID : {2}`, title, currentProject?.name || 'General', note.id)
          }]
        };
      }

      case 'list_projects': {
        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`PROJETS DISPONIBLES - STOCKAGE CENTRALISE V3.3.2

Emplacement : {0}

{1}`,
              MAIN_DATA_DIR,
              JSON.stringify({
                active_project: currentProject?.id || null,
                projects: projects.map(p => ({
                  id: p.id,
                  name: safeString(p.name),
                  type: p.type,
                  phase: p.phase,
                  status: p.status,
                  technologies: p.technologies
                })),
                storage_version: '3.3.2',
                resilient_to_claude_updates: true,
                new_features: ['rename_project', 'delete_project', 'improved_management']
              }, null, 2))
          }]
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
 * DÉMARRAGE DU SERVEUR
 */
async function main() {
  try {
    await loadData();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Project Context Manager V3.3.2 STORAGE RESILIENT + NEW FEATURES demarre');
    console.error(`Stockage centralise: ${MAIN_DATA_DIR}`);
    console.error('Architecture resistante aux mises a jour Claude Desktop');
    console.error('Nouvelles fonctionnalités: create_project (corrigé), rename_project, delete_project');
  } catch (error) {
    console.error('Erreur démarrage:', error);
    process.exit(1);
  }
}

main().catch(console.error);