#!/usr/bin/env node

/**
 * MCP ZOTERO SERVER V1.0.0 - BIBLIOGRAPHIC MANAGEMENT
 * 
 * Serveur MCP pour intégration complète avec Zotero
 * Gestion bibliographique, collections, notes et synchronisation
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
        version: '1.0.0',
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
              'Statut Zotero: CONNECTE\nUser ID: {0}\nTotal items: {1}\nAPI Key: Configure\nConnexion: Operationnelle',
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
    console.error('Zotero MCP server running on stdio');
  }
}

const server = new ZoteroMCPServer();
server.run().catch(console.error);