#!/usr/bin/env node

/**
 * MCP ZOTERO SERVER V1.1.0 - BIBLIOGRAPHIC MANAGEMENT
 * 
 * Serveur MCP pour intégration complète avec Zotero
 * Gestion bibliographique, collections, notes et synchronisation
 * 
 * NOUVEAU v1.1.0: Ajout des fonctions de lecture des notes
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configuration Zotero
interface ZoteroConfig {
  userID?: string;
  apiKey?: string;
  groupID?: string;
  baseURL: string;
}

interface ZoteroItem {
  key?: string;
  version?: number;
  itemType: string;
  title?: string;
  creators?: Array<{
    creatorType: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  }>;
  abstractNote?: string;
  publicationTitle?: string;
  date?: string;
  DOI?: string;
  url?: string;
  tags?: Array<{ tag: string }>;
  collections?: string[];
  notes?: Array<{
    note: string;
    itemType: 'note';
  }>;
}

interface ZoteroCollection {
  key?: string;
  name: string;
  parentCollection?: string;
}

class ZoteroMCPServer {
  private server: Server;
  private config: ZoteroConfig;
  private configPath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'zotero-mcp',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.configPath = path.join(os.homedir(), 'mcp-workspace', 'zotero-mcp', 'zotero-config.json');
    this.config = {
      baseURL: 'https://api.zotero.org'
    };

    this.setupToolHandlers();
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = { ...this.config, ...JSON.parse(configData) };
    } catch (error) {
      console.error('Config file not found, using defaults');
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  private createSafeMessage(template: string, ...values: string[]): string {
    let result = template;
    values.forEach((value, index) => {
      const sanitized = this.sanitizeForJson(value || '');
      result = result.replace(`{${index}}`, sanitized);
    });
    return result;
  }

  private sanitizeForJson(text: string): string {
    return text
      .replace(/"/g, "'")
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\\/g, '/')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .trim();
  }

  private getAuthHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private getLibraryPath(): string {
    if (this.config.groupID) {
      return `/groups/${this.config.groupID}`;
    } else if (this.config.userID) {
      return `/users/${this.config.userID}`;
    } else {
      throw new Error('No userID or groupID configured');
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure_zotero_access',
          description: 'Configure Zotero API access with user ID and API key',
          inputSchema: {
            type: 'object',
            properties: {
              userID: {
                type: 'string',
                description: 'Your Zotero user ID (numeric)',
              },
              apiKey: {
                type: 'string',
                description: 'Your Zotero API key from zotero.org/settings/keys',
              },
              groupID: {
                type: 'string',
                description: 'Optional: Zotero group ID if working with group library',
              },
            },
            required: ['userID', 'apiKey'],
          },
        },
        {
          name: 'add_item_to_zotero',
          description: 'Add a new item (article, book, etc.) to Zotero library',
          inputSchema: {
            type: 'object',
            properties: {
              itemType: {
                type: 'string',
                description: 'Type of item (journalArticle, book, webpage, etc.)',
                default: 'journalArticle',
              },
              title: {
                type: 'string',
                description: 'Title of the item',
              },
              creators: {
                type: 'array',
                description: 'Authors/creators array',
                items: {
                  type: 'object',
                  properties: {
                    creatorType: { type: 'string', default: 'author' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                  },
                },
              },
              abstractNote: {
                type: 'string',
                description: 'Abstract or description',
              },
              publicationTitle: {
                type: 'string',
                description: 'Journal or publication name',
              },
              date: {
                type: 'string',
                description: 'Publication date',
              },
              DOI: {
                type: 'string',
                description: 'Digital Object Identifier',
              },
              url: {
                type: 'string',
                description: 'URL to the item',
              },
              tags: {
                type: 'array',
                description: 'Tags for categorization',
                items: { type: 'string' },
              },
              collection: {
                type: 'string',
                description: 'Collection name to add item to',
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'get_item_with_notes',
          description: 'Get a Zotero item with all its attached notes',
          inputSchema: {
            type: 'object',
            properties: {
              itemKey: {
                type: 'string',
                description: 'Zotero item key',
              },
            },
            required: ['itemKey'],
          },
        },
        {
          name: 'get_note_content',
          description: 'Get the content of a specific note',
          inputSchema: {
            type: 'object',
            properties: {
              noteKey: {
                type: 'string',
                description: 'Zotero note key',
              },
            },
            required: ['noteKey'],
          },
        },
        {
          name: 'get_item_details',
          description: 'Get complete details of a Zotero item including all metadata',
          inputSchema: {
            type: 'object',
            properties: {
              itemKey: {
                type: 'string',
                description: 'Zotero item key',
              },
              includeNotes: {
                type: 'boolean',
                description: 'Include attached notes in the response',
                default: true,
              },
            },
            required: ['itemKey'],
          },
        },
        {
          name: 'list_item_children',
          description: 'List all children (notes, attachments) of a Zotero item',
          inputSchema: {
            type: 'object',
            properties: {
              itemKey: {
                type: 'string',
                description: 'Parent item key',
              },
            },
            required: ['itemKey'],
          },
        },
        {
          name: 'create_collection',
          description: 'Create a new collection in Zotero library',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the collection',
              },
              parentCollection: {
                type: 'string',
                description: 'Optional: Parent collection name for nested structure',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'search_zotero_library',
          description: 'Search items in Zotero library',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search terms (title, author, tags, etc.)',
              },
              itemType: {
                type: 'string',
                description: 'Filter by item type (journalArticle, book, etc.)',
              },
              tag: {
                type: 'string',
                description: 'Filter by specific tag',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 25,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'add_note_to_item',
          description: 'Add a note to an existing Zotero item',
          inputSchema: {
            type: 'object',
            properties: {
              itemKey: {
                type: 'string',
                description: 'Zotero item key to add note to',
              },
              noteContent: {
                type: 'string',
                description: 'Content of the note (supports HTML formatting)',
              },
              title: {
                type: 'string',
                description: 'Optional: Note title',
              },
            },
            required: ['itemKey', 'noteContent'],
          },
        },
        {
          name: 'get_collections',
          description: 'List all collections in Zotero library',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'import_from_arxiv',
          description: 'Import an arXiv article directly into Zotero',
          inputSchema: {
            type: 'object',
            properties: {
              arxivId: {
                type: 'string',
                description: 'arXiv ID (e.g., 2301.12345)',
              },
              collection: {
                type: 'string',
                description: 'Optional: Collection to add the article to',
              },
              tags: {
                type: 'array',
                description: 'Additional tags to add',
                items: { type: 'string' },
              },
            },
            required: ['arxivId'],
          },
        },
        {
          name: 'export_bibliography',
          description: 'Export bibliography from collection or search results',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name to export',
              },
              format: {
                type: 'string',
                description: 'Bibliography format (apa, mla, chicago, bibtex)',
                default: 'apa',
              },
              query: {
                type: 'string',
                description: 'Optional: Search query to filter items',
              },
            },
          },
        },
        {
          name: 'get_zotero_status',
          description: 'Check Zotero API connection and library status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'configure_zotero_access':
            return await this.configureAccess(args as any);

          case 'add_item_to_zotero':
            return await this.addItem(args as any);

          case 'get_item_with_notes':
            return await this.getItemWithNotes(args as any);

          case 'get_note_content':
            return await this.getNoteContent(args as any);

          case 'get_item_details':
            return await this.getItemDetails(args as any);

          case 'list_item_children':
            return await this.listItemChildren(args as any);

          case 'create_collection':
            return await this.createCollection(args as any);

          case 'search_zotero_library':
            return await this.searchLibrary(args as any);

          case 'add_note_to_item':
            return await this.addNoteToItem(args as any);

          case 'get_collections':
            return await this.getCollections();

          case 'import_from_arxiv':
            return await this.importFromArxiv(args as any);

          case 'export_bibliography':
            return await this.exportBibliography(args as any);

          case 'get_zotero_status':
            return await this.getZoteroStatus();

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, this.sanitizeForJson(errorMessage));
      }
    });
  }

  // NOUVELLES MÉTHODES POUR LA LECTURE DES NOTES

  private async getItemWithNotes(args: { itemKey: string }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured. Use configure_zotero_access first.');
    }

    try {
      // Récupérer l'item principal
      const itemResponse = await axios.get(
        `${this.config.baseURL}${this.getLibraryPath()}/items/${args.itemKey}`,
        { headers: this.getAuthHeaders() }
      );

      const item = itemResponse.data;

      // Récupérer les enfants (notes et attachments)
      const childrenResponse = await axios.get(
        `${this.config.baseURL}${this.getLibraryPath()}/items/${args.itemKey}/children`,
        { headers: this.getAuthHeaders() }
      );

      const children = childrenResponse.data;
      const notes = children.filter((child: any) => child.data.itemType === 'note');

      // Formatter la réponse
      const result = {
        item: {
          key: item.key,
          title: item.data.title,
          itemType: item.data.itemType,
          creators: item.data.creators,
          date: item.data.date,
          abstractNote: item.data.abstractNote,
        },
        notes: notes.map((note: any) => ({
          key: note.key,
          content: note.data.note,
          dateAdded: note.data.dateAdded,
          dateModified: note.data.dateModified,
        })),
        notesCount: notes.length,
      };

      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Item recupere avec {0} note(s):\n\nTitre: {1}\nType: {2}\n\n',
              result.notesCount.toString(),
              result.item.title || 'Sans titre',
              result.item.itemType
            ) + (result.notes.length > 0 
              ? 'Notes:\n' + result.notes.map((note: any, index: number) => 
                  `\n--- Note ${index + 1} (Key: ${note.key}) ---\n${note.content}`
                ).join('\n')
              : 'Aucune note attachée à cet item.'),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get item with notes: ${errorMessage}`);
    }
  }

  private async getNoteContent(args: { noteKey: string }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured. Use configure_zotero_access first.');
    }

    try {
      const response = await axios.get(
        `${this.config.baseURL}${this.getLibraryPath()}/items/${args.noteKey}`,
        { headers: this.getAuthHeaders() }
      );

      const note = response.data;

      if (note.data.itemType !== 'note') {
        throw new Error('The specified key does not correspond to a note');
      }

      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Note (Key: {0}):\n\n{1}\n\nDate ajoutee: {2}\nDate modifiee: {3}',
              args.noteKey,
              note.data.note || 'Contenu vide',
              note.data.dateAdded || 'N/A',
              note.data.dateModified || 'N/A'
            ),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get note content: ${errorMessage}`);
    }
  }

  private async getItemDetails(args: { itemKey: string; includeNotes?: boolean }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured. Use configure_zotero_access first.');
    }

    try {
      const response = await axios.get(
        `${this.config.baseURL}${this.getLibraryPath()}/items/${args.itemKey}`,
        { headers: this.getAuthHeaders() }
      );

      const item = response.data;
      let notes: any[] = [];

      if (args.includeNotes !== false) {
        const childrenResponse = await axios.get(
          `${this.config.baseURL}${this.getLibraryPath()}/items/${args.itemKey}/children`,
          { headers: this.getAuthHeaders() }
        );
        notes = childrenResponse.data.filter((child: any) => child.data.itemType === 'note');
      }

      const creators = (item.data.creators || [])
        .map((c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim())
        .join(', ');

      const tags = (item.data.tags || []).map((t: any) => t.tag).join(', ');

      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Details complets de l\'item (Key: {0}):\n\n' +
              'Titre: {1}\n' +
              'Type: {2}\n' +
              'Auteurs: {3}\n' +
              'Date: {4}\n' +
              'Publication: {5}\n' +
              'DOI: {6}\n' +
              'URL: {7}\n' +
              'Tags: {8}\n' +
              'Abstract: {9}\n' +
              'Notes attachees: {10}',
              args.itemKey,
              item.data.title || 'Sans titre',
              item.data.itemType,
              creators || 'N/A',
              item.data.date || 'N/A',
              item.data.publicationTitle || 'N/A',
              item.data.DOI || 'N/A',
              item.data.url || 'N/A',
              tags || 'Aucun',
              item.data.abstractNote || 'N/A',
              notes.length.toString()
            ) + (notes.length > 0 
              ? '\n\n--- Notes ---\n' + notes.map((note: any, index: number) => 
                  `\nNote ${index + 1} (Key: ${note.key}):\n${note.data.note}`
                ).join('\n')
              : ''),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get item details: ${errorMessage}`);
    }
  }

  private async listItemChildren(args: { itemKey: string }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured. Use configure_zotero_access first.');
    }

    try {
      const response = await axios.get(
        `${this.config.baseURL}${this.getLibraryPath()}/items/${args.itemKey}/children`,
        { headers: this.getAuthHeaders() }
      );

      const children = response.data;
      const notes = children.filter((child: any) => child.data.itemType === 'note');
      const attachments = children.filter((child: any) => child.data.itemType === 'attachment');

      const formattedChildren = [
        ...notes.map((note: any) => ({
          key: note.key,
          type: 'note',
          title: note.data.note ? note.data.note.substring(0, 100) + '...' : 'Note vide',
          dateAdded: note.data.dateAdded,
        })),
        ...attachments.map((att: any) => ({
          key: att.key,
          type: 'attachment',
          title: att.data.title || att.data.filename || 'Sans titre',
          contentType: att.data.contentType,
        })),
      ];

      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Enfants de l\'item {0}:\n' +
              'Notes: {1}\n' +
              'Attachments: {2}\n\n',
              args.itemKey,
              notes.length.toString(),
              attachments.length.toString()
            ) + formattedChildren.map((child: any, index: number) => 
              `${index + 1}. [${child.type.toUpperCase()}] ${child.title} (Key: ${child.key})`
            ).join('\n'),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to list item children: ${errorMessage}`);
    }
  }

  // MÉTHODES EXISTANTES (non modifiées)

  private async configureAccess(args: { userID: string; apiKey: string; groupID?: string }) {
    this.config.userID = args.userID;
    this.config.apiKey = args.apiKey;
    if (args.groupID) {
      this.config.groupID = args.groupID;
    }

    await this.saveConfig();

    // Test connection
    try {
      const response = await axios.get(`${this.config.baseURL}${this.getLibraryPath()}/items`, {
        headers: this.getAuthHeaders(),
        params: { limit: 1 },
      });

      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Configuration Zotero reussie ! Connexion testee avec succes. UserID: {0}, Library: {1} items accessibles.',
              args.userID,
              response.headers['total-results'] || '0'
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error('Configuration failed: Invalid API key or user ID');
    }
  }

  private async addItem(args: any): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured. Use configure_zotero_access first.');
    }

    const item: ZoteroItem = {
      itemType: args.itemType || 'journalArticle',
      title: args.title,
      abstractNote: args.abstractNote,
      publicationTitle: args.publicationTitle,
      date: args.date,
      DOI: args.DOI,
      url: args.url,
    };

    // Process creators
    if (args.creators && Array.isArray(args.creators)) {
      item.creators = args.creators.map((creator: any) => ({
        creatorType: creator.creatorType || 'author',
        firstName: creator.firstName,
        lastName: creator.lastName,
      }));
    }

    // Process tags
    if (args.tags && Array.isArray(args.tags)) {
      item.tags = args.tags.map((tag: string) => ({ tag }));
    }

    // Handle collection
    if (args.collection) {
      const collections = await this.getCollectionByName(args.collection);
      if (collections.length > 0) {
        item.collections = [collections[0].key!];
      }
    }

    const response = await axios.post(
      `${this.config.baseURL}${this.getLibraryPath()}/items`,
      [item],
      { headers: this.getAuthHeaders() }
    );

    const createdItem = response.data.successful['0'];
    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Article ajoute avec succes dans Zotero ! Titre: {0}, Key: {1}',
            args.title,
            createdItem.key
          ),
        },
      ],
    };
  }

  private async createCollection(args: { name: string; parentCollection?: string }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured');
    }

    const collection: ZoteroCollection = {
      name: args.name,
    };

    if (args.parentCollection) {
      const parentCollections = await this.getCollectionByName(args.parentCollection);
      if (parentCollections.length > 0) {
        collection.parentCollection = parentCollections[0].key;
      }
    }

    const response = await axios.post(
      `${this.config.baseURL}${this.getLibraryPath()}/collections`,
      [collection],
      { headers: this.getAuthHeaders() }
    );

    const createdCollection = response.data.successful['0'];
    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Collection creee avec succes: {0} (Key: {1})',
            args.name,
            createdCollection.key
          ),
        },
      ],
    };
  }

  private async searchLibrary(args: { query: string; itemType?: string; tag?: string; limit?: number }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured');
    }

    const params: any = {
      q: args.query,
      limit: args.limit || 25,
    };

    if (args.itemType) {
      params.itemType = args.itemType;
    }

    if (args.tag) {
      params.tag = args.tag;
    }

    const response = await axios.get(`${this.config.baseURL}${this.getLibraryPath()}/items`, {
      headers: this.getAuthHeaders(),
      params,
    });

    const items = response.data;
    const results = items.map((item: any) => {
      const creators = item.data.creators || [];
      const authors = creators
        .filter((c: any) => c.creatorType === 'author')
        .map((c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim())
        .join(', ');

      return {
        key: item.key,
        title: item.data.title || 'Sans titre',
        authors: authors || 'Auteur inconnu',
        itemType: item.data.itemType,
        date: item.data.date || '',
        publicationTitle: item.data.publicationTitle || '',
        tags: (item.data.tags || []).map((t: any) => t.tag).join(', '),
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Recherche terminee: {0} resultats trouves pour "{1}"',
            results.length.toString(),
            args.query
          ) + '\n\n' + results.map((item: any, index: number) => 
            `${index + 1}. ${item.title}\n   Auteurs: ${item.authors}\n   Type: ${item.itemType}\n   Date: ${item.date}\n   Key: ${item.key}`
          ).join('\n\n'),
        },
      ],
    };
  }

  private async addNoteToItem(args: { itemKey: string; noteContent: string; title?: string }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured');
    }

    const note = {
      itemType: 'note',
      parentItem: args.itemKey,
      note: args.noteContent,
    };

    const response = await axios.post(
      `${this.config.baseURL}${this.getLibraryPath()}/items`,
      [note],
      { headers: this.getAuthHeaders() }
    );

    const createdNote = response.data.successful['0'];
    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Note ajoutee avec succes a l\'item {0}. Note Key: {1}',
            args.itemKey,
            createdNote.key
          ),
        },
      ],
    };
  }

  private async getCollections(): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured');
    }

    const response = await axios.get(`${this.config.baseURL}${this.getLibraryPath()}/collections`, {
      headers: this.getAuthHeaders(),
    });

    const collections = response.data.map((collection: any) => ({
      key: collection.key,
      name: collection.data.name,
      parentCollection: collection.data.parentCollection || null,
    }));

    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Collections disponibles ({0}):\n{1}',
            collections.length.toString(),
            collections.map((c: any) => `- ${c.name} (Key: ${c.key})`).join('\n')
          ),
        },
      ],
    };
  }

  private async getCollectionByName(name: string): Promise<any[]> {
    const response = await axios.get(`${this.config.baseURL}${this.getLibraryPath()}/collections`, {
      headers: this.getAuthHeaders(),
    });

    return response.data.filter((collection: any) => 
      collection.data.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  private async importFromArxiv(args: { arxivId: string; collection?: string; tags?: string[] }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured');
    }

    // Fetch arXiv metadata
    const arxivResponse = await axios.get(`http://export.arxiv.org/api/query?id_list=${args.arxivId}`);
    const xmlData = arxivResponse.data;

    // Simple XML parsing for title and authors (would be better with proper XML parser)
    const titleMatch = xmlData.match(/<title>(.*?)<\/title>/s);
    const authorsMatch = xmlData.match(/<name>(.*?)<\/name>/g);
    const summaryMatch = xmlData.match(/<summary>(.*?)<\/summary>/s);
    const publishedMatch = xmlData.match(/<published>(.*?)<\/published>/);

    const title = titleMatch ? titleMatch[1].trim() : `arXiv:${args.arxivId}`;
    const abstractNote = summaryMatch ? summaryMatch[1].trim() : '';
    const date = publishedMatch ? publishedMatch[1].substring(0, 10) : '';

    const creators = authorsMatch ? authorsMatch.map((author: string) => {
      const name = author.replace(/<\/?name>/g, '').trim();
      const nameParts = name.split(' ');
      return {
        creatorType: 'author',
        firstName: nameParts.slice(0, -1).join(' '),
        lastName: nameParts[nameParts.length - 1],
      };
    }) : [];

    const item: ZoteroItem = {
      itemType: 'journalArticle',
      title,
      creators,
      abstractNote,
      date,
      url: `https://arxiv.org/abs/${args.arxivId}`,
      tags: [{ tag: 'arXiv' }, ...(args.tags || []).map(tag => ({ tag }))],
    };

    // Handle collection
    if (args.collection) {
      const collections = await this.getCollectionByName(args.collection);
      if (collections.length > 0) {
        item.collections = [collections[0].key];
      }
    }

    const response = await axios.post(
      `${this.config.baseURL}${this.getLibraryPath()}/items`,
      [item],
      { headers: this.getAuthHeaders() }
    );

    const createdItem = response.data.successful['0'];
    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Article arXiv {0} importe avec succes dans Zotero ! Titre: {1}, Key: {2}',
            args.arxivId,
            title,
            createdItem.key
          ),
        },
      ],
    };
  }

  private async exportBibliography(args: { collection?: string; format?: string; query?: string }): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Zotero API not configured');
    }

    // This is a simplified version - real implementation would need proper citation formatting
    const params: any = { limit: 100 };
    
    if (args.query) {
      params.q = args.query;
    }

    const response = await axios.get(`${this.config.baseURL}${this.getLibraryPath()}/items`, {
      headers: this.getAuthHeaders(),
      params,
    });

    const items = response.data;
    const format = args.format || 'apa';
    
    const bibliography = items.map((item: any, index: number) => {
      const data = item.data;
      const creators = data.creators || [];
      const authors = creators
        .filter((c: any) => c.creatorType === 'author')
        .map((c: any) => `${c.lastName}, ${c.firstName || c.firstName?.charAt(0) || ''}.`)
        .join(' ');

      // Simple APA format
      return `${index + 1}. ${authors} (${data.date || 'n.d.'}). ${data.title}. ${data.publicationTitle || ''}.`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: this.createSafeMessage(
            'Bibliographie exportee ({0} format, {1} references):\n\n{2}',
            format.toUpperCase(),
            items.length.toString(),
            bibliography
          ),
        },
      ],
    };
  }

  private async getZoteroStatus(): Promise<any> {
    try {
      if (!this.config.apiKey) {
        return {
          content: [
            {
              type: 'text',
              text: 'Statut Zotero: NON CONFIGURE. Utilisez configure_zotero_access pour commencer.',
            },
          ],
        };
      }

      const response = await axios.get(`${this.config.baseURL}${this.getLibraryPath()}/items`, {
        headers: this.getAuthHeaders(),
        params: { limit: 1 },
      });

      const totalItems = response.headers['total-results'] || '0';
      
      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Statut Zotero: CONNECTE\nUser ID: {0}\nTotal items: {1}\nAPI Key: Configure\nConnexion: Operationnelle\nVersion MCP: 1.1.0 (avec lecture notes)',
              this.config.userID || 'N/A',
              totalItems
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: this.createSafeMessage(
              'Statut Zotero: ERREUR DE CONNEXION - {0}',
              error instanceof Error ? error.message : 'Erreur inconnue'
            ),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Zotero MCP server v1.1.0 running on stdio - Now with note reading capabilities!');
  }
}

const server = new ZoteroMCPServer();
server.run().catch(console.error);