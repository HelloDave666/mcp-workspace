#!/usr/bin/env node

/**
 * MCP PROJECT CONTEXT MANAGER V3.2.2 - JSON FINAL FIX
 * 
 * CORRECTION CRITIQUE V3.2.2: 
 * - Échappement sécurisé de toutes les chaînes de caractères
 * - Suppression des guillemets problématiques dans les messages
 * - Normalisation des caractères spéciaux pour compatibilité JSON
 * - Simplification des template literals problématiques
 * 
 * FONCTIONS D'ARCHIVAGE ESSENTIELLES CONSERVÉES :
 * - import_claude_conversation (COEUR DE L'OUTIL)
 * - Documentation technique (add_documentation, record_technical_decision)
 * - Notes et règles d'architecture
 * - Système de phases et contexte projet
 * 
 * NOUVELLES CAPACITÉS D'ARCHIVAGE INTELLIGENT :
 * - Résumé automatique des conversations (réduction 50%)
 * - Archivage structuré par phases
 * - Détection automatique du contenu pour classification
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

// Configuration
const DATA_DIR = path.join(process.cwd(), 'project-data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const ID_MAPPING_FILE = path.join(DATA_DIR, 'conversation_id_mapping.json');

// Génération d'ID robuste
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// NOUVELLES FONCTIONS D'ÉCHAPPEMENT JSON SÉCURISÉ
function sanitizeForJson(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/"/g, "'")  // Remplacer guillemets doubles par simples
    .replace(/[\r\n\t]/g, ' ')  // Remplacer retours chariot par espaces
    .replace(/\\/g, '/')  // Remplacer backslash par slash
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // Supprimer caractères de contrôle
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

// Utilitaire de validation sécurisée
function safeToLowerCase(value: any): string {
  return (value && typeof value === 'string') ? value.toLowerCase() : '';
}

function safeString(value: any): string {
  return (value && typeof value === 'string') ? sanitizeForJson(value) : '';
}

// Interfaces essentielles pour l'archivage
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
    version: '3.2.2',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * UTILITAIRES CORE
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

async function loadData(): Promise<void> {
  try {
    await ensureDirectoryExists(DATA_DIR);

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
  } catch (error) {
    console.error('Erreur chargement:', error);
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
    const data = {
      projects,
      currentProject,
      conversations,
      notes,
      decisions,
      documentation,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeJson(PROJECTS_FILE, data, { spaces: 2 });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    throw error;
  }
}

async function saveIdMapping(): Promise<void> {
  try {
    const mappingData = {
      mapping: idMapping,
      lastUpdated: new Date().toISOString(),
      totalConversations: Object.keys(idMapping).length
    };
    
    await fs.writeJson(ID_MAPPING_FILE, mappingData, { spaces: 2 });
  } catch (error) {
    console.error('Erreur sauvegarde mapping:', error);
    throw error;
  }
}

/**
 * NOUVELLES FONCTIONS D'ARCHIVAGE INTELLIGENT
 */
function createConversationSummary(fullContent: string, targetReduction: number = 0.5): string {
  // Algorithme de résumé intelligent (réduction à 50% par défaut)
  const lines = fullContent.split('\n');
  const totalLines = lines.length;
  const targetLines = Math.floor(totalLines * targetReduction);
  
  // Garder les sections importantes (début, fin, et échantillonnage au milieu)
  const summary: string[] = [];
  
  // Première section (20% du résumé)
  const startLines = Math.floor(targetLines * 0.2);
  summary.push('=== DEBUT DE CONVERSATION ===');
  summary.push(...lines.slice(0, startLines));
  
  // Section milieu (60% du résumé) - échantillonnage intelligent
  const middleLines = Math.floor(targetLines * 0.6);
  const middleStart = Math.floor(totalLines * 0.3);
  const middleEnd = Math.floor(totalLines * 0.7);
  const middleSection = lines.slice(middleStart, middleEnd);
  
  // Échantillonner le milieu en gardant les lignes importantes
  const importantMiddle = middleSection.filter(line => 
    line.includes('```') || // Code
    line.startsWith('#') || // Titres
    line.includes('IMPORTANT') ||
    line.includes('ERROR') ||
    line.includes('SUCCESS') ||
    line.length > 100 // Lignes substantielles
  ).slice(0, middleLines);
  
  summary.push('\n=== SECTION PRINCIPALE (RESUME) ===');
  summary.push(...importantMiddle);
  
  // Dernière section (20% du résumé)
  const endLines = Math.floor(targetLines * 0.2);
  summary.push('\n=== FIN DE CONVERSATION ===');
  summary.push(...lines.slice(-endLines));
  
  return summary.join('\n');
}

function detectConversationPhase(content: string): string {
  // CORRECTION: Validation sécurisée avant toLowerCase()
  if (!content || typeof content !== 'string') {
    console.warn('detectConversationPhase: content invalide, retour au défaut');
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
  
  return 'development'; // Défaut
}

/**
 * NOUVELLES FONCTIONS DE SUPPRESSION V3.1
 */
function detectDuplicateConversations(): { duplicates: Conversation[]; groups: Conversation[][] } {
  const duplicates: Conversation[] = [];
  const groups: Conversation[][] = [];
  const checkedIds = new Set<string>();
  
  for (let i = 0; i < conversations.length; i++) {
    if (checkedIds.has(conversations[i].id)) continue;
    
    const current = conversations[i];
    const potentialDuplicates: Conversation[] = [current];
    
    for (let j = i + 1; j < conversations.length; j++) {
      const other = conversations[j];
      
      // CORRECTION: Validation sécurisée avant toLowerCase()
      const currentSummary = safeString(current.summary);
      const otherSummary = safeString(other.summary);
      
      const titleSimilarity = safeToLowerCase(currentSummary).includes('doublon') || 
                             safeToLowerCase(otherSummary).includes('doublon') ||
                             currentSummary === otherSummary;
      
      const contentSimilarity = current.content && other.content &&
                               current.content.length > 100 && other.content.length > 100 &&
                               Math.abs(current.content.length - other.content.length) < current.content.length * 0.1;
      
      const sameDayCreation = new Date(current.timestamp).toDateString() === 
                             new Date(other.timestamp).toDateString();
      
      if ((titleSimilarity && sameDayCreation) || 
          (contentSimilarity && titleSimilarity) ||
          safeToLowerCase(currentSummary).includes('doublon')) {
        potentialDuplicates.push(other);
        checkedIds.add(other.id);
      }
    }
    
    checkedIds.add(current.id);
    
    if (potentialDuplicates.length > 1) {
      groups.push(potentialDuplicates);
      duplicates.push(...potentialDuplicates.slice(1)); // Garder le premier, marquer les autres comme doublons
    }
  }
  
  return { duplicates, groups };
}

async function deleteConversationSecure(conversationInput: string): Promise<{ success: boolean; message: string }> {
  try {
    const resolvedId = resolveConversationId(conversationInput);
    if (!resolvedId) {
      return { success: false, message: createSafeMessage('Conversation non trouvee: {0}', conversationInput) };
    }
    
    const conversationIndex = conversations.findIndex(c => c.id === resolvedId);
    if (conversationIndex === -1) {
      return { success: false, message: createSafeMessage('Conversation avec ID resolu non trouvee: {0}', resolvedId) };
    }
    
    const conversation = conversations[conversationIndex];
    const project = projects.find(p => p.id === conversation.project_id);
    
    // Supprimer la conversation
    conversations.splice(conversationIndex, 1);
    
    // Nettoyer le mapping ID si applicable
    for (const [oldId, data] of Object.entries(idMapping)) {
      if (data.newId === resolvedId) {
        delete idMapping[oldId];
        break;
      }
    }
    
    await saveData();
    await saveIdMapping();
    
    console.log(`Conversation supprimée: "${conversation.summary}" du projet "${project?.name}"`);
    
    return { 
      success: true, 
      message: createSafeMessage('Conversation supprimee du projet {0}', project?.name || 'Inconnu')
    };
    
  } catch (error) {
    console.error("Erreur suppression:", error);
    return { 
      success: false, 
      message: createSafeMessage('Erreur lors de la suppression: {0}', 
        error instanceof Error ? error.message : 'Erreur inconnue')
    };
  }
}

async function cleanupDuplicates(): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    const { duplicates, groups } = detectDuplicateConversations();
    
    if (duplicates.length === 0) {
      return {
        success: true,
        message: "Aucun doublon detecte",
        stats: { duplicatesFound: 0, duplicatesRemoved: 0, groupsFound: 0 }
      };
    }
    
    let removedCount = 0;
    const removalLog: string[] = [];
    
    for (const duplicate of duplicates) {
      const result = await deleteConversationSecure(duplicate.id);
      if (result.success) {
        removedCount++;
        removalLog.push(safeString(duplicate.summary));
      }
    }
    
    return {
      success: true,
      message: createSafeMessage('{0} doublons supprimes sur {1} detectes', 
        removedCount.toString(), duplicates.length.toString()),
      stats: {
        duplicatesFound: duplicates.length,
        duplicatesRemoved: removedCount,
        groupsFound: groups.length,
        removedConversations: removalLog
      }
    };
    
  } catch (error) {
    console.error("Erreur nettoyage doublons:", error);
    return {
      success: false,
      message: createSafeMessage('Erreur nettoyage: {0}', 
        error instanceof Error ? error.message : 'Erreur inconnue'),
      stats: {}
    };
  }
}

/**
 * RÉGÉNÉRATION DES IDS
 */
async function regenerateAllConversationIds(): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    console.log("Régénération automatique des IDs...");
    
    const newIdMapping: ConversationMapping = {};
    let totalRegenerated = 0;

    for (let i = 0; i < conversations.length; i++) {
      const conversation = conversations[i];
      const oldId = conversation.id;
      const newId = generateId();
      
      newIdMapping[oldId] = {
        newId,
        projectId: conversation.project_id,
        title: safeString(conversation.summary) || `Conversation ${i + 1}`,
        date: conversation.timestamp || new Date().toISOString(),
        phase: conversation.phase || 'unknown'
      };
      
      conversations[i] = {
        ...conversation,
        id: newId,
        originalId: oldId
      };
      
      totalRegenerated++;
    }
    
    idMapping = { ...idMapping, ...newIdMapping };
    await saveIdMapping();
    await saveData();
    
    return {
      success: true,
      message: createSafeMessage('{0} conversations avec IDs regeneres', totalRegenerated.toString()),
      stats: {
        totalRegenerated,
        projectsAffected: projects.length,
        mappingEntries: Object.keys(idMapping).length
      }
    };
    
  } catch (error) {
    console.error("Erreur régénération:", error);
    return {
      success: false,
      message: createSafeMessage('Erreur regeneration: {0}', 
        error instanceof Error ? error.message : 'Erreur inconnue'),
      stats: {}
    };
  }
}

/**
 * RÉSOLUTION D'IDS ET DÉPLACEMENT - VERSION SÉCURISÉE JSON
 */
function resolveConversationId(inputId: string): string | null {
  for (const [oldId, data] of Object.entries(idMapping)) {
    if (oldId === inputId || data.newId === inputId) {
      return data.newId;
    }
  }
  
  const found = conversations.find(c => c.id === inputId || c.originalId === inputId);
  return found ? found.id : null;
}

async function moveConversationSecure(
  conversationInput: string, 
  targetProjectId: string, 
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const resolvedId = resolveConversationId(conversationInput);
    if (!resolvedId) {
      return { 
        success: false, 
        message: createSafeMessage('Conversation non trouvee: {0}', conversationInput)
      };
    }
    
    const conversationIndex = conversations.findIndex(c => c.id === resolvedId);
    if (conversationIndex === -1) {
      return { 
        success: false, 
        message: createSafeMessage('Conversation avec ID resolu non trouvee: {0}', resolvedId)
      };
    }
    
    const targetProject = projects.find(p => p.id === targetProjectId);
    if (!targetProject) {
      return { 
        success: false, 
        message: createSafeMessage('Projet destination non trouve: {0}', targetProjectId)
      };
    }
    
    const conversation = conversations[conversationIndex];
    const oldProjectId = conversation.project_id;
    conversation.project_id = targetProjectId;
    
    await saveData();
    
    const oldProject = projects.find(p => p.id === oldProjectId);
    console.log(`Conversation déplacée: "${conversation.summary}" de "${oldProject?.name}" vers "${targetProject.name}"`);
    
    // MESSAGE SÉCURISÉ SANS GUILLEMETS PROBLÉMATIQUES
    return { 
      success: true, 
      message: createSafeMessage('Conversation deplacee vers {0} - Raison: {1}', 
        targetProject.name, reason)
    };
    
  } catch (error) {
    console.error("Erreur déplacement:", error);
    return { 
      success: false, 
      message: createSafeMessage('Erreur deplacement: {0}', 
        error instanceof Error ? error.message : 'Erreur inconnue')
    };
  }
}

/**
 * ANALYSE D'INTÉGRITÉ POUR ARCHIVAGE
 */
function analyzeProjectIntegrity(): {
  totalProjects: number;
  totalConversations: number;
  suspiciousConversations: { projectId: string; count: number; projectName: string }[];
  archiveStats: { total: number; summarized: number; full: number };
  duplicateInfo: { duplicatesFound: number; groupsFound: number };
  recommendations: string[];
} {
  const analysis = {
    totalProjects: projects.length,
    totalConversations: conversations.length,
    suspiciousConversations: [] as { projectId: string; count: number; projectName: string }[],
    archiveStats: {
      total: conversations.length,
      summarized: conversations.filter(c => c.archiveType === 'summary').length,
      full: conversations.filter(c => c.archiveType === 'full').length
    },
    duplicateInfo: { duplicatesFound: 0, groupsFound: 0 },
    recommendations: [] as string[]
  };
  
  // Analyser les doublons
  const { duplicates, groups } = detectDuplicateConversations();
  analysis.duplicateInfo = {
    duplicatesFound: duplicates.length,
    groupsFound: groups.length
  };
  
  // Mots-clés par projet pour détection
  const projectKeywords: { [projectId: string]: string[] } = {
    'mbmcdrugq1os3di95y': ['IMU', 'Heart of Glass', 'Rita', 'Echo', 'Audio', 'heartOfFrost', 'narrativeSystem', 'Electron'],
    'mbmeaz93fn5muf3q1f': ['MCP', 'Claude API', 'TypeScript', 'Node.js', 'SDK', 'fs.writeJson'],
    'mbnhocu5kn58or2b3o': ['Kindle', 'Python', 'OCR', 'surlignement', 'highlight'],
    'mbw5dmdbrrtg5xqwkkp': ['Blender', 'SVG', 'sablage', 'verre', 'unwrapping', 'pattern']
  };
  
  // Analyser chaque projet
  for (const project of projects) {
    const projectConversations = conversations.filter(c => c.project_id === project.id);
    let suspiciousCount = 0;
    
    const otherProjectKeywords = Object.entries(projectKeywords)
      .filter(([id]) => id !== project.id)
      .flatMap(([, keywords]) => keywords);
    
    for (const conversation of projectConversations) {
      // CORRECTION: Validation sécurisée avant toLowerCase()
      const text = `${safeString(conversation.summary)} ${safeString(conversation.content)}`.toLowerCase();
      
      const foundKeywords = otherProjectKeywords.filter(keyword => 
        text.includes(safeToLowerCase(keyword))
      );
      
      if (foundKeywords.length >= 2) {
        suspiciousCount++;
      }
    }
    
    if (suspiciousCount > 0) {
      analysis.suspiciousConversations.push({
        projectId: project.id,
        count: suspiciousCount,
        projectName: safeString(project.name)
      });
    }
  }
  
  // Recommandations d'archivage
  if (analysis.suspiciousConversations.length > 0) {
    analysis.recommendations.push(
      "Conversations mal classees detectees",
      "Utilisez 'find_conversations_to_move' pour les identifier",
      "Utilisez 'move_conversation_resolved' pour les corriger"
    );
  }
  
  if (analysis.duplicateInfo.duplicatesFound > 0) {
    analysis.recommendations.push(
      `${analysis.duplicateInfo.duplicatesFound} doublons detectes`,
      "Utilisez 'cleanup_duplicates' pour les supprimer automatiquement"
    );
  }
  
  if (analysis.archiveStats.summarized < analysis.archiveStats.total * 0.3) {
    analysis.recommendations.push(
      "Peu de conversations resumees",
      "Utilisez 'archive_conversation_summary' pour optimiser l'espace"
    );
  }
  
  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push("Archives parfaitement organisees !");
  }
  
  return analysis;
}

/**
 * CONFIGURATION DES OUTILS
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // === OUTILS D'ARCHIVAGE ESSENTIELS ===
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
      {
        name: 'archive_conversation_summary',
        description: 'SUMMARY - Créer un résumé archivé d\'une conversation (réduction ~50%)',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'ID de la conversation à résumer' },
            reduction_ratio: { type: 'number', description: 'Ratio de réduction (0.5 = 50%)', default: 0.5 }
          },
          required: ['conversation_id']
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
        name: 'add_documentation',
        description: 'Ajouter de la documentation technique au projet',
        inputSchema: {
          type: 'object',
          properties: {
            technology: { type: 'string', description: 'Technologie concernée' },
            title: { type: 'string', description: 'Titre de la documentation' },
            content: { type: 'string', description: 'Contenu ou URL' },
            relevance: { type: 'string', description: 'Niveau de pertinence: high, medium, low', default: 'high' }
          },
          required: ['technology', 'title', 'content']
        }
      },
      {
        name: 'record_technical_decision',
        description: 'Enregistrer une décision technique importante',
        inputSchema: {
          type: 'object',
          properties: {
            decision: { type: 'string', description: 'Description de la décision' },
            reasoning: { type: 'string', description: 'Justification de la décision' },
            impact: { type: 'string', description: 'Impact attendu' }
          },
          required: ['decision', 'reasoning']
        }
      },
      {
        name: 'get_architecture_rules',
        description: 'Récupérer les règles d\'architecture du projet',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'update_project_phase',
        description: 'Mettre à jour la phase du projet',
        inputSchema: {
          type: 'object',
          properties: {
            phase: { type: 'string', description: 'Nouvelle phase du projet' }
          },
          required: ['phase']
        }
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
      },
      
      // === OUTILS V3.0 POUR CORRECTION IDS ===
      {
        name: 'regenerate_conversation_ids',
        description: 'PROCESSING - Régénérer tous les IDs de conversations (corrige les IDs tronqués)',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'analyze_project_integrity',
        description: 'ANALYZE - Analyser l\'intégrité des archives et détecter les conversations mal placées + doublons',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'find_conversations_to_move',
        description: 'TARGET - Identifier les conversations spécifiques à déplacer',
        inputSchema: {
          type: 'object',
          properties: {
            source_project_id: { type: 'string', description: 'ID du projet source' },
            keywords: { type: 'array', items: { type: 'string' }, description: 'Mots-clés à rechercher' }
          },
          required: ['source_project_id', 'keywords']
        }
      },
      {
        name: 'move_conversation_resolved',
        description: 'MOVE - Déplacer une conversation (résolution automatique d\'ID)',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_input: { type: 'string', description: 'ID de conversation (ancien ou nouveau)' },
            target_project_id: { type: 'string', description: 'ID du projet destination' },
            reason: { type: 'string', description: 'Raison du déplacement' }
          },
          required: ['conversation_input', 'target_project_id', 'reason']
        }
      },
      
      // === NOUVEAUX OUTILS V3.1 SUPPRESSION ===
      {
        name: 'delete_conversation',
        description: 'DELETE - Supprimer définitivement une conversation (résolution automatique d\'ID)',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_input: { type: 'string', description: 'ID de conversation (ancien ou nouveau) ou titre partiel' }
          },
          required: ['conversation_input']
        }
      },
      {
        name: 'detect_duplicates',
        description: 'ANALYZE - Détecter les conversations en doublon sans les supprimer',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'cleanup_duplicates',
        description: 'CLEANUP - Supprimer automatiquement tous les doublons détectés',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

/**
 * GESTIONNAIRE DES APPELS D'OUTILS - VERSION JSON SÉCURISÉE
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // === OUTILS D'ARCHIVAGE ESSENTIELS ===
      case 'list_projects': {
        return {
          content: [{
            type: 'text',
            text: `PROJETS DISPONIBLES

${JSON.stringify({
  active_project: currentProject?.id || null,
  projects: projects.map(p => ({
    id: p.id,
    name: safeString(p.name),
    type: p.type,
    phase: p.phase,
    status: p.status,
    technologies: p.technologies
  }))
}, null, 2)}`
          }]
        };
      }

      case 'create_project': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { name, description, project_type = 'custom', technologies = [] } = args as any;
        
        const newProject: Project = {
          id: generateId(),
          name: sanitizeForJson(name),
          description: sanitizeForJson(description),
          type: project_type,
          technologies,
          created: new Date().toISOString(),
          phase: 'initial-setup',
          status: 'active'
        };

        projects.push(newProject);
        currentProject = newProject;
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`PROJET CREE POUR ARCHIVAGE

Détails du projet :
- ID : {0}
- Nom : {1}
- Type : {2}
- Technologies : {3}
- Phase : {4}

Prêt pour l'archivage de conversations Claude !`, 
              newProject.id, 
              newProject.name, 
              newProject.type, 
              newProject.technologies.join(', '), 
              newProject.phase)
          }]
        };
      }

      case 'switch_project': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { project_id } = args as any;
        const project = projects.find(p => p.id === project_id);
        
        if (!project) {
          throw new McpError(ErrorCode.InvalidParams, `Projet non trouvé: ${project_id}`);
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
- Créé : {3}

Prêt pour import de conversations Claude`,
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
          throw new McpError(ErrorCode.InvalidParams, 'Projet non trouvé');
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
            text: `CONTEXTE COMPLET DU PROJET

## ${safeString(project.name)}
Description : ${safeString(project.description)}
Phase : ${project.phase}
Technologies : ${project.technologies.join(', ')}

### Conversations (${projectConversations.length})
${conversationsList}

### Notes (${projectNotes.length})
${notesList}

### Decisions techniques (${projectDecisions.length})
${decisionsList}

### Documentation (${projectDocs.length})
${docsList}`
          }]
        };
      }

      case 'import_claude_conversation': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif. Créez ou sélectionnez un projet.');
        }

        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { conversation_text, summary, phase, archive_type = 'full' } = args as any;
        
        // Auto-détection de la phase si non fournie
        const detectedPhase = phase || detectConversationPhase(conversation_text);
        
        // Créer le contenu selon le type d'archivage
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

      case 'archive_conversation_summary': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { conversation_id, reduction_ratio = 0.5 } = args as any;
        
        const conversation = conversations.find(c => c.id === conversation_id);
        if (!conversation) {
          throw new McpError(ErrorCode.InvalidParams, `Conversation non trouvée: ${conversation_id}`);
        }

        const originalLength = conversation.content.length;
        const summarizedContent = createConversationSummary(conversation.content, reduction_ratio);
        
        // Mettre à jour la conversation
        conversation.content = summarizedContent;
        conversation.archiveType = 'summary';
        conversation.originalLength = originalLength;
        
        await saveData();

        const reductionPercentage = Math.round((1 - summarizedContent.length / originalLength) * 100);

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`CONVERSATION RESUMEE POUR ARCHIVAGE

Conversation : {0}
Reduction : {1}%
Taille originale : {2} caracteres
Taille resumee : {3} caracteres
Ratio applique : {4}%

Archivage optimise avec succes !`,
              safeString(conversation.summary),
              reductionPercentage.toString(),
              originalLength.toString(),
              summarizedContent.length.toString(),
              Math.round(reduction_ratio * 100).toString())
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

        // CORRECTION: Validation sécurisée avant toLowerCase()
        const safeQuery = safeToLowerCase(query);
        const results = searchConversations.filter(c => 
          safeToLowerCase(c.content).includes(safeQuery) ||
          safeToLowerCase(c.summary).includes(safeQuery)
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

      case 'add_documentation': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif.');
        }

        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { technology, title, content, relevance = 'high' } = args as any;
        
        const doc: Documentation = {
          id: generateId(),
          project_id: currentProject!.id,
          technology: sanitizeForJson(technology),
          title: sanitizeForJson(title),
          content: sanitizeForJson(content),
          relevance,
          timestamp: new Date().toISOString()
        };

        documentation.push(doc);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`DOCUMENTATION AJOUTEE

Projet : {0}
Technologie : {1}
Titre : {2}
Pertinence : {3}
ID : {4}`, currentProject!.name, technology, title, relevance, doc.id)
          }]
        };
      }

      case 'record_technical_decision': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif.');
        }

        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { decision, reasoning, impact = 'À définir' } = args as any;
        
        const techDecision: TechnicalDecision = {
          id: generateId(),
          project_id: currentProject!.id,
          decision: sanitizeForJson(decision),
          reasoning: sanitizeForJson(reasoning),
          impact: sanitizeForJson(impact),
          timestamp: new Date().toISOString()
        };

        decisions.push(techDecision);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`DECISION TECHNIQUE ENREGISTREE

Projet : {0}
Decision : {1}
Justification : {2}
Impact : {3}
ID : {4}`, currentProject!.name, decision, reasoning, impact, techDecision.id)
          }]
        };
      }

      case 'get_architecture_rules': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif.');
        }

        const projectDecisions = decisions.filter(d => d.project_id === currentProject!.id);
        const projectDocs = documentation.filter(d => d.project_id === currentProject!.id);

        return {
          content: [{
            type: 'text',
            text: `REGLES D'ARCHITECTURE - ${safeString(currentProject!.name)}

### Technologies utilisees
${currentProject!.technologies.map(t => `- ${t}`).join('\n')}

### Decisions techniques
${projectDecisions.map(d => `- ${safeString(d.decision)}\n  Justification: ${safeString(d.reasoning)}`).join('\n\n') || 'Aucune decision enregistree'}

### Documentation pertinente
${projectDocs.filter(d => d.relevance === 'high').map(d => `- ${safeString(d.title)} (${safeString(d.technology)})`).join('\n') || 'Aucune documentation'}`
          }]
        };
      }

      case 'update_project_phase': {
        if (!currentProject) {
          throw new McpError(ErrorCode.InvalidParams, 'Aucun projet actif.');
        }

        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { phase } = args as any;
        const oldPhase = currentProject!.phase;
        currentProject!.phase = phase;
        
        const projectIndex = projects.findIndex(p => p.id === currentProject!.id);
        if (projectIndex !== -1) {
          projects[projectIndex] = currentProject!;
        }

        await saveData();

        return {
          content: [{
            type: 'text',
            text: createSafeMessage(`PHASE MISE A JOUR

Projet : {0}
Ancienne phase : {1}
Nouvelle phase : {2}
Timestamp : {3}`, currentProject!.name, oldPhase, phase, new Date().toISOString())
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

      // === OUTILS V3.0 ===
      case 'regenerate_conversation_ids': {
        const result = await regenerateAllConversationIds();
        
        return {
          content: [{
            type: 'text',
            text: `REGENERATION DES IDS - RESULTATS

Statut : ${result.success ? 'Succes' : 'Echec'}
Message : ${safeString(result.message)}

${result.success ? `Statistiques :
- Conversations mises a jour : ${result.stats.totalRegenerated}
- Projets affectes : ${result.stats.projectsAffected}
- Entrees mapping : ${result.stats.mappingEntries}

Actions suivantes recommandees :
1. Tester avec 'analyze_project_integrity'
2. Utiliser 'move_conversation_resolved' pour nettoyer` : ''}`
          }]
        };
      }

      case 'analyze_project_integrity': {
        const analysis = analyzeProjectIntegrity();
        
        return {
          content: [{
            type: 'text',
            text: `ANALYSE D'INTEGRITE DES ARCHIVES

Statistiques generales :
- Projets totaux : ${analysis.totalProjects}
- Conversations archivees : ${analysis.totalConversations}

Statistiques d'archivage :
- Conversations completes : ${analysis.archiveStats.full}
- Conversations resumees : ${analysis.archiveStats.summarized}
- Non archivees : ${analysis.archiveStats.total - analysis.archiveStats.full - analysis.archiveStats.summarized}

Analyse des doublons :
- Doublons detectes : ${analysis.duplicateInfo.duplicatesFound}
- Groupes de doublons : ${analysis.duplicateInfo.groupsFound}

Conversations mal placees :
${analysis.suspiciousConversations.length === 0 ? 
  'Aucune anomalie detectee' : 
  analysis.suspiciousConversations.map(s => 
    `- ${s.projectName} : ${s.count} conversation(s) suspecte(s)`
  ).join('\n')
}

Recommandations :
${analysis.recommendations.join('\n')}`
          }]
        };
      }

      case 'find_conversations_to_move': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { source_project_id, keywords } = args as any;
        
        const sourceProject = projects.find(p => p.id === source_project_id);
        if (!sourceProject) {
          throw new McpError(ErrorCode.InvalidParams, `Projet non trouvé: ${source_project_id}`);
        }

        const projectConversations = conversations.filter(c => c.project_id === source_project_id);
        const toMove: { conversation: Conversation; keywords: string[]; suggestedProject: string }[] = [];

        for (const conversation of projectConversations) {
          // CORRECTION: Validation sécurisée avant toLowerCase()
          const text = `${safeString(conversation.summary)} ${safeString(conversation.content)}`.toLowerCase();
          const foundKeywords = keywords.filter((keyword: string) => 
            text.includes(safeToLowerCase(keyword))
          );

          if (foundKeywords.length > 0) {
            let suggestedProject = 'Projet a determiner';
            if (foundKeywords.some((k: string) => ['Heart of Glass', 'Rita', 'IMU', 'Audio'].includes(k))) {
              suggestedProject = 'Application IMU Ludopedagogique Audio';
            } else if (foundKeywords.some((k: string) => ['MCP', 'Claude API', 'TypeScript'].includes(k))) {
              suggestedProject = 'Integration MCP Claude';
            } else if (foundKeywords.some((k: string) => ['Blender', 'SVG', 'sablage'].includes(k))) {
              suggestedProject = 'Logiciel masque de sablage verre';
            } else if (foundKeywords.some((k: string) => ['Kindle', 'Python', 'OCR'].includes(k))) {
              suggestedProject = 'Detecteur de surlignement';
            }

            toMove.push({
              conversation,
              keywords: foundKeywords,
              suggestedProject
            });
          }
        }

        const conversationsList = toMove.map(item => {
          const summary = safeString(item.conversation.summary).substring(0, 100);
          const archiveType = item.conversation.archiveType || 'standard';
          const keywordsText = item.keywords.join(', ');
          const dateText = new Date(item.conversation.timestamp).toLocaleDateString();
          
          return `### ${summary}
ID : ${item.conversation.id}
Type : ${archiveType}
Mots-cles detectes : ${keywordsText}
Projet suggere : ${item.suggestedProject}
Date : ${dateText}
---`;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `CONVERSATIONS A DEPLACER

Projet source : ${safeString(sourceProject.name)}
Mots-cles recherches : ${keywords.join(', ')}
Conversations trouvees : ${toMove.length}

${conversationsList}`
          }]
        };
      }

      case 'move_conversation_resolved': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { conversation_input, target_project_id, reason } = args as any;
        const result = await moveConversationSecure(conversation_input, target_project_id, reason);
        
        return {
          content: [{
            type: 'text',
            text: `DEPLACEMENT DE CONVERSATION ARCHIVEE

Statut : ${result.success ? 'Succes' : 'Echec'}
Message : ${safeString(result.message)}

${result.success ? 'La conversation a ete deplacee avec succes dans les bonnes archives !' : 'Verifiez l\'ID et reessayez'}`
          }]
        };
      }

      // === NOUVEAUX OUTILS V3.1 SUPPRESSION ===
      case 'delete_conversation': {
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments manquants");
        }

        const { conversation_input } = args as any;
        const result = await deleteConversationSecure(conversation_input);
        
        return {
          content: [{
            type: 'text',
            text: `SUPPRESSION DE CONVERSATION

Statut : ${result.success ? 'Succes' : 'Echec'}
Message : ${safeString(result.message)}

${result.success ? 'La conversation a ete supprimee definitivement !' : 'Verifiez l\'ID et reessayez'}`
          }]
        };
      }

      case 'detect_duplicates': {
        const { duplicates, groups } = detectDuplicateConversations();
        
        return {
          content: [{
            type: 'text',
            text: `DETECTION DES DOUBLONS

Resultats de l'analyse :
- Doublons detectes : ${duplicates.length}
- Groupes de doublons : ${groups.length}

${groups.length === 0 ? 'Aucun doublon detecte !' : 
`Groupes de doublons trouves :

${groups.map((group, index) => `### Groupe ${index + 1} (${group.length} conversations)
${group.map(conv => `- ${safeString(conv.summary)} (ID: ${conv.id})
  Date: ${new Date(conv.timestamp).toLocaleDateString()}
  Projet: ${safeString(projects.find(p => p.id === conv.project_id)?.name) || 'Inconnu'}`).join('\n')}
---`).join('\n')}

Utilisez 'cleanup_duplicates' pour supprimer automatiquement les doublons.`}`
          }]
        };
      }

      case 'cleanup_duplicates': {
        const result = await cleanupDuplicates();
        
        return {
          content: [{
            type: 'text',
            text: `NETTOYAGE AUTOMATIQUE DES DOUBLONS

Statut : ${result.success ? 'Succes' : 'Echec'}
Message : ${safeString(result.message)}

${result.success && result.stats.duplicatesRemoved > 0 ? `Statistiques :
- Doublons trouves : ${result.stats.duplicatesFound}
- Doublons supprimes : ${result.stats.duplicatesRemoved}
- Groupes traites : ${result.stats.groupsFound}

Conversations supprimees :
${result.stats.removedConversations?.join('\n') || 'Aucune'}

Nettoyage termine avec succes !` : result.success ? 'Aucun doublon a nettoyer' : 'Erreur pendant le nettoyage'}`
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
    
    console.error('Project Context Manager V3.2.2 JSON FINAL FIX démarré');
    console.error('Fonctions d\'archivage + corrections techniques + suppression + échappement JSON sécurisé');
  } catch (error) {
    console.error('Erreur démarrage:', error);
    process.exit(1);
  }
}

main().catch(console.error);