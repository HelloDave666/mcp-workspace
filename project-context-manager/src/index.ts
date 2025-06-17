#!/usr/bin/env node

/**
 * MCP PROJECT CONTEXT MANAGER V3.2 - PRODUCTION READY
 * 
 * CORRECTION CRITIQUE: Suppression de tous les emojis pour compatibilité Claude Desktop
 * et respect des bonnes pratiques de code de production
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
 * 
 * CORRECTIONS TECHNIQUES MAJEURES :
 * - Système d'IDs robuste avec régénération
 * - Fonctions déplacement/suppression opérationnelles
 * - Résolution conversations mal placées
 * - CORRECTION TYPESCRIPT : Gestion des null, typage des paramètres
 * - CORRECTION V3.2 : Suppression complète emojis pour compatibilité
 * 
 * NOUVELLES FONCTIONS DE SUPPRESSION V3.1 :
 * - Suppression sécurisée de conversations
 * - Détection et suppression automatique de doublons
 * - Nettoyage intelligent des archives
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
    version: '3.2.0',
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
      
      // Critères de détection de doublons
      const titleSimilarity = current.summary.toLowerCase().includes('doublon') || 
                             other.summary.toLowerCase().includes('doublon') ||
                             current.summary === other.summary;
      
      const contentSimilarity = current.content.length > 100 && other.content.length > 100 &&
                               Math.abs(current.content.length - other.content.length) < current.content.length * 0.1;
      
      const sameDayCreation = new Date(current.timestamp).toDateString() === 
                             new Date(other.timestamp).toDateString();
      
      if ((titleSimilarity && sameDayCreation) || 
          (contentSimilarity && titleSimilarity) ||
          current.summary.toLowerCase().includes('doublon')) {
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
      return { success: false, message: `Conversation non trouvée: ${conversationInput}` };
    }
    
    const conversationIndex = conversations.findIndex(c => c.id === resolvedId);
    if (conversationIndex === -1) {
      return { success: false, message: `Conversation avec ID résolu non trouvée: ${resolvedId}` };
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
    
    console.log(`[DELETE] Conversation supprimée: "${conversation.summary}" du projet "${project?.name}"`);
    
    return { 
      success: true, 
      message: `Conversation "${conversation.summary}" supprimée du projet "${project?.name || 'Inconnu'}"` 
    };
    
  } catch (error) {
    console.error("[ERROR] Erreur suppression:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

async function cleanupDuplicates(): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    const { duplicates, groups } = detectDuplicateConversations();
    
    if (duplicates.length === 0) {
      return {
        success: true,
        message: "Aucun doublon détecté",
        stats: { duplicatesFound: 0, duplicatesRemoved: 0, groupsFound: 0 }
      };
    }
    
    let removedCount = 0;
    const removalLog: string[] = [];
    
    for (const duplicate of duplicates) {
      const result = await deleteConversationSecure(duplicate.id);
      if (result.success) {
        removedCount++;
        removalLog.push(`- ${duplicate.summary}`);
      }
    }
    
    return {
      success: true,
      message: `${removedCount} doublons supprimés sur ${duplicates.length} détectés`,
      stats: {
        duplicatesFound: duplicates.length,
        duplicatesRemoved: removedCount,
        groupsFound: groups.length,
        removedConversations: removalLog
      }
    };
    
  } catch (error) {
    console.error("[ERROR] Erreur nettoyage doublons:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stats: {}
    };
  }
}

/**
 * RÉGÉNÉRATION DES IDS
 */
async function regenerateAllConversationIds(): Promise<{ success: boolean; message: string; stats: any }> {
  try {
    console.log("[PROCESSING] Régénération automatique des IDs...");
    
    const newIdMapping: ConversationMapping = {};
    let totalRegenerated = 0;

    for (let i = 0; i < conversations.length; i++) {
      const conversation = conversations[i];
      const oldId = conversation.id;
      const newId = generateId();
      
      newIdMapping[oldId] = {
        newId,
        projectId: conversation.project_id,
        title: conversation.summary || `Conversation ${i + 1}`,
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
      message: `${totalRegenerated} conversations avec IDs régénérés`,
      stats: {
        totalRegenerated,
        projectsAffected: projects.length,
        mappingEntries: Object.keys(idMapping).length
      }
    };
    
  } catch (error) {
    console.error("[ERROR] Erreur régénération:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stats: {}
    };
  }
}

/**
 * RÉSOLUTION D'IDS ET DÉPLACEMENT
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
      return { success: false, message: `Conversation non trouvée: ${conversationInput}` };
    }
    
    const conversationIndex = conversations.findIndex(c => c.id === resolvedId);
    if (conversationIndex === -1) {
      return { success: false, message: `Conversation avec ID résolu non trouvée: ${resolvedId}` };
    }
    
    const targetProject = projects.find(p => p.id === targetProjectId);
    if (!targetProject) {
      return { success: false, message: `Projet destination non trouvé: ${targetProjectId}` };
    }
    
    const conversation = conversations[conversationIndex];
    const oldProjectId = conversation.project_id;
    conversation.project_id = targetProjectId;
    
    await saveData();
    
    const oldProject = projects.find(p => p.id === oldProjectId);
    console.log(`[SUCCESS] Conversation déplacée: "${conversation.summary}" de "${oldProject?.name}" vers "${targetProject.name}"`);
    
    return { 
      success: true, 
      message: `Conversation déplacée vers "${targetProject.name}" - Raison: ${reason}` 
    };
    
  } catch (error) {
    console.error("[ERROR] Erreur déplacement:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
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
      const text = `${conversation.summary} ${conversation.content}`.toLowerCase();
      
      const foundKeywords = otherProjectKeywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length >= 2) {
        suspiciousCount++;
      }
    }
    
    if (suspiciousCount > 0) {
      analysis.suspiciousConversations.push({
        projectId: project.id,
        count: suspiciousCount,
        projectName: project.name
      });
    }
  }
  
  // Recommandations d'archivage
  if (analysis.suspiciousConversations.length > 0) {
    analysis.recommendations.push(
      "[DEBUG] Conversations mal classées détectées",
      "[INFO] Utilisez 'find_conversations_to_move' pour les identifier",
      "[MOVE] Utilisez 'move_conversation_resolved' pour les corriger"
    );
  }
  
  if (analysis.duplicateInfo.duplicatesFound > 0) {
    analysis.recommendations.push(
      `[DELETE] ${analysis.duplicateInfo.duplicatesFound} doublons détectés`,
      "[CLEANUP] Utilisez 'cleanup_duplicates' pour les supprimer automatiquement"
    );
  }
  
  if (analysis.archiveStats.summarized < analysis.archiveStats.total * 0.3) {
    analysis.recommendations.push(
      "[ARCHIVE] Peu de conversations résumées",
      "[SUMMARY] Utilisez 'archive_conversation_summary' pour optimiser l'espace"
    );
  }
  
  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push("[SUCCESS] Archives parfaitement organisées !");
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
        description: '[ARCHIVE] FONCTION PRINCIPALE - Importer et archiver une conversation Claude',
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
        description: '[SUMMARY] Créer un résumé archivé d\'une conversation (réduction ~50%)',
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
        description: '[PROCESSING] Régénérer tous les IDs de conversations (corrige les IDs tronqués)',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'analyze_project_integrity',
        description: '[ANALYZE] Analyser l\'intégrité des archives et détecter les conversations mal placées + doublons',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'find_conversations_to_move',
        description: '[TARGET] Identifier les conversations spécifiques à déplacer',
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
        description: '[MOVE] Déplacer une conversation (résolution automatique d\'ID)',
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
        description: '[DELETE] Supprimer définitivement une conversation (résolution automatique d\'ID)',
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
        description: '[ANALYZE] Détecter les conversations en doublon sans les supprimer',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'cleanup_duplicates',
        description: '[CLEANUP] Supprimer automatiquement tous les doublons détectés',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

/**
 * GESTIONNAIRE DES APPELS D'OUTILS
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
    name: p.name,
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
        await saveData();

        return {
          content: [{
            type: 'text',
            text: `PROJET CREE POUR ARCHIVAGE

Détails du projet :
- ID : ${newProject.id}
- Nom : ${newProject.name}
- Type : ${newProject.type}
- Technologies : ${newProject.technologies.join(', ')}
- Phase : ${newProject.phase}

[TARGET] Prêt pour l'archivage de conversations Claude !`
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
            text: `PROJET ACTIVE POUR ARCHIVAGE

Projet actuel : ${project.name}
- Phase : ${project.phase}
- Technologies : ${project.technologies.join(', ')}
- Créé : ${new Date(project.created).toLocaleDateString()}

[ARCHIVE] Prêt pour import de conversations Claude`
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

        return {
          content: [{
            type: 'text',
            text: `CONTEXTE COMPLET DU PROJET

## ${project.name}
Description : ${project.description}
Phase : ${project.phase}
Technologies : ${project.technologies.join(', ')}

### Conversations (${projectConversations.length})
${projectConversations.map(c => `- ${c.summary} (${c.phase})${c.archiveType ? ` [${c.archiveType}]` : ''}`).join('\n') || 'Aucune conversation'}

### Notes (${projectNotes.length})
${projectNotes.map(n => `- ${n.title}`).join('\n') || 'Aucune note'}

### Décisions techniques (${projectDecisions.length})
${projectDecisions.map(d => `- ${d.decision}`).join('\n') || 'Aucune décision'}

### Documentation (${projectDocs.length})
${projectDocs.map(d => `- ${d.title} (${d.technology})`).join('\n') || 'Aucune documentation'}`
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
          summary,
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
            text: `[ARCHIVE] CONVERSATION CLAUDE ARCHIVEE

Projet : ${currentProject!.name}
Phase : ${detectedPhase}
Résumé : ${summary}
Type d'archivage : ${archive_type}
${archive_type === 'summary' ? `Réduction : ${reductionPercentage}% (${originalLength} → ${finalContent.length} caractères)` : `Taille : ${finalContent.length} caractères`}
ID : ${conversation.id}

[SUCCESS] Conversation archivée avec succès !`
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
            text: `[SUMMARY] CONVERSATION RESUMEE POUR ARCHIVAGE

Conversation : ${conversation.summary}
Réduction : ${reductionPercentage}%
Taille originale : ${originalLength} caractères
Taille résumée : ${summarizedContent.length} caractères
Ratio appliqué : ${Math.round(reduction_ratio * 100)}%

[SUCCESS] Archivage optimisé avec succès !`
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

        const results = searchConversations.filter(c => 
          c.content.toLowerCase().includes(query.toLowerCase()) ||
          c.summary.toLowerCase().includes(query.toLowerCase())
        );

        return {
          content: [{
            type: 'text',
            text: `RECHERCHE DANS LES ARCHIVES

Recherche : "${query}"
Résultats trouvés : ${results.length}

${results.map(r => {
  const project = projects.find(p => p.id === r.project_id);
  return `### ${r.summary}
Projet : ${project?.name || 'Inconnu'}
Phase : ${r.phase}
Type : ${r.archiveType || 'standard'}
Date : ${new Date(r.timestamp).toLocaleDateString()}
ID : ${r.id}
---`;
}).join('\n')}`
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
          technology,
          title,
          content,
          relevance,
          timestamp: new Date().toISOString()
        };

        documentation.push(doc);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: `[DOCS] DOCUMENTATION AJOUTEE

Projet : ${currentProject!.name}
Technologie : ${technology}
Titre : ${title}
Pertinence : ${relevance}
ID : ${doc.id}`
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
          decision,
          reasoning,
          impact,
          timestamp: new Date().toISOString()
        };

        decisions.push(techDecision);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: `[DECISION] DECISION TECHNIQUE ENREGISTREE

Projet : ${currentProject!.name}
Décision : ${decision}
Justification : ${reasoning}
Impact : ${impact}
ID : ${techDecision.id}`
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
            text: `[ARCHITECTURE] REGLES D'ARCHITECTURE - ${currentProject!.name}

### Technologies utilisées
${currentProject!.technologies.map(t => `- ${t}`).join('\n')}

### Décisions techniques
${projectDecisions.map(d => `- ${d.decision}\n  Justification: ${d.reasoning}`).join('\n\n') || 'Aucune décision enregistrée'}

### Documentation pertinente
${projectDocs.filter(d => d.relevance === 'high').map(d => `- ${d.title} (${d.technology})`).join('\n') || 'Aucune documentation'}`
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
            text: `[PHASE] PHASE MISE A JOUR

Projet : ${currentProject!.name}
Ancienne phase : ${oldPhase}
Nouvelle phase : ${phase}
Timestamp : ${new Date().toISOString()}`
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
          title,
          content,
          timestamp: new Date().toISOString(),
          project_id: currentProject?.id
        };

        notes.push(note);
        await saveData();

        return {
          content: [{
            type: 'text',
            text: `[NOTE] NOTE CREEE

Titre : ${title}
Projet : ${currentProject?.name || 'Général'}
ID : ${note.id}`
          }]
        };
      }

      // === OUTILS V3.0 ===
      case 'regenerate_conversation_ids': {
        const result = await regenerateAllConversationIds();
        
        return {
          content: [{
            type: 'text',
            text: `[PROCESSING] REGENERATION DES IDS - RESULTATS

Statut : ${result.success ? '[SUCCESS] Succès' : '[ERROR] Échec'}
Message : ${result.message}

${result.success ? `[STATS] Statistiques :
- Conversations mises à jour : ${result.stats.totalRegenerated}
- Projets affectés : ${result.stats.projectsAffected}
- Entrées mapping : ${result.stats.mappingEntries}

[TARGET] Actions suivantes recommandées :
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
            text: `[ANALYZE] ANALYSE D'INTEGRITE DES ARCHIVES

[STATS] Statistiques générales :
- Projets totaux : ${analysis.totalProjects}
- Conversations archivées : ${analysis.totalConversations}

[ARCHIVE] Statistiques d'archivage :
- Conversations complètes : ${analysis.archiveStats.full}
- Conversations résumées : ${analysis.archiveStats.summarized}
- Non archivées : ${analysis.archiveStats.total - analysis.archiveStats.full - analysis.archiveStats.summarized}

[DELETE] Analyse des doublons :
- Doublons détectés : ${analysis.duplicateInfo.duplicatesFound}
- Groupes de doublons : ${analysis.duplicateInfo.groupsFound}

[WARNING] Conversations mal placées :
${analysis.suspiciousConversations.length === 0 ? 
  '[SUCCESS] Aucune anomalie détectée' : 
  analysis.suspiciousConversations.map(s => 
    `- ${s.projectName} : ${s.count} conversation(s) suspecte(s)`
  ).join('\n')
}

[INFO] Recommandations :
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
          const text = `${conversation.summary} ${conversation.content}`.toLowerCase();
          const foundKeywords = keywords.filter((keyword: string) => 
            text.includes(keyword.toLowerCase())
          );

          if (foundKeywords.length > 0) {
            let suggestedProject = 'Projet à déterminer';
            if (foundKeywords.some((k: string) => ['Heart of Glass', 'Rita', 'IMU', 'Audio'].includes(k))) {
              suggestedProject = 'Application IMU Ludopédagogique Audio';
            } else if (foundKeywords.some((k: string) => ['MCP', 'Claude API', 'TypeScript'].includes(k))) {
              suggestedProject = 'Intégration MCP Claude';
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

        return {
          content: [{
            type: 'text',
            text: `[TARGET] CONVERSATIONS A DEPLACER

Projet source : ${sourceProject.name}
Mots-clés recherchés : ${keywords.join(', ')}
Conversations trouvées : ${toMove.length}

${toMove.map(item => `### "${item.conversation.summary}"
ID : ${item.conversation.id}
Type : ${item.conversation.archiveType || 'standard'}
Mots-clés détectés : ${item.keywords.join(', ')}
Projet suggéré : ${item.suggestedProject}
Date : ${new Date(item.conversation.timestamp).toLocaleDateString()}
---`).join('\n')}`
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
            text: `[MOVE] DEPLACEMENT DE CONVERSATION ARCHIVEE

Statut : ${result.success ? '[SUCCESS] Succès' : '[ERROR] Échec'}
Message : ${result.message}

${result.success ? '[COMPLETE] La conversation a été déplacée avec succès dans les bonnes archives !' : '[DEBUG] Vérifiez l\'ID et réessayez'}`
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
            text: `[DELETE] SUPPRESSION DE CONVERSATION

Statut : ${result.success ? '[SUCCESS] Succès' : '[ERROR] Échec'}
Message : ${result.message}

${result.success ? '[COMPLETE] La conversation a été supprimée définitivement !' : '[DEBUG] Vérifiez l\'ID et réessayez'}`
          }]
        };
      }

      case 'detect_duplicates': {
        const { duplicates, groups } = detectDuplicateConversations();
        
        return {
          content: [{
            type: 'text',
            text: `[ANALYZE] DETECTION DES DOUBLONS

[STATS] Résultats de l'analyse :
- Doublons détectés : ${duplicates.length}
- Groupes de doublons : ${groups.length}

${groups.length === 0 ? '[SUCCESS] Aucun doublon détecté !' : 
`[DELETE] Groupes de doublons trouvés :

${groups.map((group, index) => `### Groupe ${index + 1} (${group.length} conversations)
${group.map(conv => `- "${conv.summary}" (ID: ${conv.id})
  Date: ${new Date(conv.timestamp).toLocaleDateString()}
  Projet: ${projects.find(p => p.id === conv.project_id)?.name || 'Inconnu'}`).join('\n')}
---`).join('\n')}

[INFO] Utilisez 'cleanup_duplicates' pour supprimer automatiquement les doublons.`}`
          }]
        };
      }

      case 'cleanup_duplicates': {
        const result = await cleanupDuplicates();
        
        return {
          content: [{
            type: 'text',
            text: `[CLEANUP] NETTOYAGE AUTOMATIQUE DES DOUBLONS

Statut : ${result.success ? '[SUCCESS] Succès' : '[ERROR] Échec'}
Message : ${result.message}

${result.success && result.stats.duplicatesRemoved > 0 ? `[STATS] Statistiques :
- Doublons trouvés : ${result.stats.duplicatesFound}
- Doublons supprimés : ${result.stats.duplicatesRemoved}
- Groupes traités : ${result.stats.groupsFound}

[DELETE] Conversations supprimées :
${result.stats.removedConversations?.join('\n') || 'Aucune'}

[COMPLETE] Nettoyage terminé avec succès !` : result.success ? '[SUCCESS] Aucun doublon à nettoyer' : '[ERROR] Erreur pendant le nettoyage'}`
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
    
    console.error('Project Context Manager V3.2 PRODUCTION READY démarré');
    console.error('[ARCHIVE] Fonctions d\'archivage + corrections techniques + suppression');
  } catch (error) {
    console.error('Erreur démarrage:', error);
    process.exit(1);
  }
}

main().catch(console.error);