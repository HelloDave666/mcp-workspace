#!/usr/bin/env node

/**
 * MCP HAL SERVER V1.0.0 - RECHERCHE SCIENCES SOCIALES
 * 
 * Serveur MCP pour intégration avec HAL (Hyper Articles en Ligne)
 * Spécialisé pour recherches en sciences sociales, anthropologie technique,
 * phénoménologie et études sur le geste et l'artisanat
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
import * as xml2js from 'xml2js';

// Configuration API HAL
const HAL_API_BASE = 'https://api.archives-ouvertes.fr';
const HAL_SEARCH_URL = `${HAL_API_BASE}/search/`;
const HAL_DOCUMENT_URL = 'https://hal.archives-ouvertes.fr';

// Interfaces HAL
interface HALDocument {
  halId_s?: string;
  title_s?: string[];
  authFullName_s?: string[];
  abstract_s?: string[];
  publicationDate_s?: string;
  publicationDateY_i?: number;
  docType_s?: string;
  domain_s?: string[];
  keyword_s?: string[];
  uri_s?: string;
  fileMain_s?: string;
  language_s?: string[];
  journalTitle_s?: string;
  bookTitle_s?: string;
  publisher_s?: string[];
}

interface HALSearchResponse {
  response: {
    numFound: number;
    start: number;
    docs: HALDocument[];
  };
}

class HALMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'hal-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
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

  private buildHALQuery(
    query: string, 
    filters: { [key: string]: string } = {},
    rows: number = 20
  ): string {
    const params = new URLSearchParams();
    
    // Query principale
    if (query) {
      params.append('q', query);
    }
    
    // Filtres
    Object.entries(filters).forEach(([key, value]) => {
      params.append('fq', `${key}:${value}`);
    });
    
    // Paramètres de format et pagination
    params.append('wt', 'json');
    params.append('rows', rows.toString());
    params.append('sort', 'publicationDateY_i desc');
    
    return `${HAL_SEARCH_URL}?${params.toString()}`;
  }

  private formatHALDocument(doc: HALDocument): string {
    const title = doc.title_s?.[0] || 'Sans titre';
    const authors = doc.authFullName_s?.slice(0, 3).join(', ') || 'Auteur inconnu';
    const year = doc.publicationDateY_i || 'Année inconnue';
    const docType = doc.docType_s || 'Type inconnu';
    const domains = doc.domain_s?.slice(0, 2).join(', ') || 'Domaine non spécifié';
    const halId = doc.halId_s || 'ID inconnu';
    const abstract = doc.abstract_s?.[0]?.substring(0, 200) || 'Pas de résumé';
    
    return `### ${title}
**Auteurs:** ${authors}
**Année:** ${year}
**Type:** ${docType}
**Domaines:** ${domains}
**ID HAL:** ${halId}
**Résumé:** ${abstract}${abstract.length >= 200 ? '...' : ''}
**URL:** ${HAL_DOCUMENT_URL}/${halId}`;
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_hal',
          description: 'Recherche générale dans HAL avec filtres avancés',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Mots-clés de recherche (ex: "geste technique artisanat")',
              },
              domain: {
                type: 'string',
                description: 'Domaine scientifique (ex: "shs.anthro-se", "shs.socio")',
              },
              doc_type: {
                type: 'string',
                description: 'Type de document (ART, THESE, HDR, COUV, COMM)',
              },
              year_min: {
                type: 'number',
                description: 'Année minimum (ex: 2010)',
              },
              year_max: {
                type: 'number',
                description: 'Année maximum (ex: 2024)',
              },
              language: {
                type: 'string',
                description: 'Langue (fr, en, es, etc.)',
              },
              max_results: {
                type: 'number',
                description: 'Nombre maximum de résultats (défaut: 10, max: 50)',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'search_hal_anthropology',
          description: 'Recherche spécialisée en anthropologie technique et culturelle',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Termes de recherche en anthropologie',
              },
              focus: {
                type: 'string',
                description: 'Focus: "technique", "culturelle", "materielle", "cognitive"',
                default: 'technique',
              },
              max_results: {
                type: 'number',
                description: 'Nombre de résultats (défaut: 15)',
                default: 15,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'search_hal_phenomenology',
          description: 'Recherche en phénoménologie et sciences cognitives',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Termes liés à la phénoménologie',
              },
              approach: {
                type: 'string',
                description: 'Approche: "corporelle", "cognitive", "experimentale"',
                default: 'corporelle',
              },
              max_results: {
                type: 'number',
                description: 'Nombre de résultats (défaut: 15)',
                default: 15,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'search_hal_crafts',
          description: 'Recherche spécialisée artisanat, savoir-faire et gestes techniques',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Termes liés à l\'artisanat et aux techniques',
              },
              craft_type: {
                type: 'string',
                description: 'Type: "traditionnel", "contemporain", "numerique"',
                default: 'traditionnel',
              },
              max_results: {
                type: 'number',
                description: 'Nombre de résultats (défaut: 15)',
                default: 15,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_hal_document',
          description: 'Récupérer les détails complets d\'un document HAL',
          inputSchema: {
            type: 'object',
            properties: {
              hal_id: {
                type: 'string',
                description: 'Identifiant HAL (ex: "hal-01234567")',
              },
              format: {
                type: 'string',
                description: 'Format de sortie: "summary", "bibtex", "full"',
                default: 'summary',
              },
            },
            required: ['hal_id'],
          },
        },
        {
          name: 'search_hal_thesis',
          description: 'Recherche spécialisée dans les thèses HAL',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Sujet de recherche pour les thèses',
              },
              discipline: {
                type: 'string',
                description: 'Discipline (anthropologie, sociologie, philosophie, etc.)',
              },
              university: {
                type: 'string',
                description: 'Université (optionnel)',
              },
              max_results: {
                type: 'number',
                description: 'Nombre de résultats (défaut: 10)',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'search_hal_recent',
          description: 'Recherche les publications récentes dans vos domaines',
          inputSchema: {
            type: 'object',
            properties: {
              domain: {
                type: 'string',
                description: 'Domaine: "anthropologie", "phenomenologie", "artisanat", "sts"',
                default: 'anthropologie',
              },
              months_back: {
                type: 'number',
                description: 'Nombre de mois à remonter (défaut: 6)',
                default: 6,
              },
              max_results: {
                type: 'number',
                description: 'Nombre de résultats (défaut: 20)',
                default: 20,
              },
            },
          },
        },
        {
          name: 'generate_hal_bibtex',
          description: 'Générer une bibliographie BibTeX depuis une recherche HAL',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Recherche pour la bibliographie',
              },
              max_entries: {
                type: 'number',
                description: 'Nombre maximum d\'entrées (défaut: 20)',
                default: 20,
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_hal':
            return await this.searchHAL(args as any);

          case 'search_hal_anthropology':
            return await this.searchHALAnthropology(args as any);

          case 'search_hal_phenomenology':
            return await this.searchHALPhenomenology(args as any);

          case 'search_hal_crafts':
            return await this.searchHALCrafts(args as any);

          case 'get_hal_document':
            return await this.getHALDocument(args as any);

          case 'search_hal_thesis':
            return await this.searchHALThesis(args as any);

          case 'search_hal_recent':
            return await this.searchHALRecent(args as any);

          case 'generate_hal_bibtex':
            return await this.generateHALBibtex(args as any);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Outil ${name} non trouvé`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        throw new McpError(ErrorCode.InternalError, this.sanitizeForJson(errorMessage));
      }
    });
  }

  private async searchHAL(args: {
    query: string;
    domain?: string;
    doc_type?: string;
    year_min?: number;
    year_max?: number;
    language?: string;
    max_results?: number;
  }): Promise<any> {
    const filters: { [key: string]: string } = {};
    
    if (args.domain) filters['domain_s'] = args.domain;
    if (args.doc_type) filters['docType_s'] = args.doc_type;
    if (args.language) filters['language_s'] = args.language;
    if (args.year_min) filters['publicationDateY_i'] = `[${args.year_min} TO *]`;
    if (args.year_max) {
      const yearFilter = args.year_min 
        ? `[${args.year_min} TO ${args.year_max}]`
        : `[* TO ${args.year_max}]`;
      filters['publicationDateY_i'] = yearFilter;
    }

    const url = this.buildHALQuery(args.query, filters, args.max_results || 10);
    
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    const results = docs.map(doc => this.formatHALDocument(doc)).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'RECHERCHE HAL - {0} resultats trouves\n\nRequete: {1}\nNombre total: {2}\n\n{3}',
          docs.length.toString(),
          args.query,
          response.data.response.numFound.toString(),
          results
        ),
      }],
    };
  }

  private async searchHALAnthropology(args: {
    query: string;
    focus?: string;
    max_results?: number;
  }): Promise<any> {
    const focusTerms = {
      'technique': 'geste technique savoir-faire artisanat technologie',
      'culturelle': 'culture materielle objets rituels tradition',
      'materielle': 'materialite artefacts production fabrication',
      'cognitive': 'cognition incarnee perception action apprentissage'
    };
    
    const focus = args.focus || 'technique';
    const enhancedQuery = `${args.query} ${focusTerms[focus as keyof typeof focusTerms] || ''}`;
    
    const filters = {
      'domain_s': 'shs.anthro-se OR shs.anthro-bio OR shs.ethno',
    };

    const url = this.buildHALQuery(enhancedQuery, filters, args.max_results || 15);
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    const results = docs.map(doc => this.formatHALDocument(doc)).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'RECHERCHE HAL ANTHROPOLOGIE - Focus: {0}\n\n{1} resultats pour: {2}\n\n{3}',
          focus,
          docs.length.toString(),
          args.query,
          results
        ),
      }],
    };
  }

  private async searchHALPhenomenology(args: {
    query: string;
    approach?: string;
    max_results?: number;
  }): Promise<any> {
    const approachTerms = {
      'corporelle': 'corps corporel embodied incarnee soma-esthetique',
      'cognitive': 'cognition perception conscience experience vecue',
      'experimentale': 'introspection meditation microphenomenologie'
    };
    
    const approach = args.approach || 'corporelle';
    const enhancedQuery = `${args.query} phenomenologie ${approachTerms[approach as keyof typeof approachTerms] || ''}`;
    
    const filters = {
      'domain_s': 'shs.philo OR shs.psycho OR sdv.neu',
    };

    const url = this.buildHALQuery(enhancedQuery, filters, args.max_results || 15);
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    const results = docs.map(doc => this.formatHALDocument(doc)).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'RECHERCHE HAL PHENOMENOLOGIE - Approche: {0}\n\n{1} resultats pour: {2}\n\n{3}',
          approach,
          docs.length.toString(),
          args.query,
          results
        ),
      }],
    };
  }

  private async searchHALCrafts(args: {
    query: string;
    craft_type?: string;
    max_results?: number;
  }): Promise<any> {
    const craftTerms = {
      'traditionnel': 'artisan artisanat traditionnel heritage savoir-faire ancestral',
      'contemporain': 'maker fab-lab numerique innovation creation',
      'numerique': 'digital fabrication impression-3d prototypage'
    };
    
    const craftType = args.craft_type || 'traditionnel';
    const enhancedQuery = `${args.query} ${craftTerms[craftType as keyof typeof craftTerms] || ''}`;
    
    const filters = {
      'domain_s': 'shs.anthro-se OR shs.socio OR shs.art OR stic.gest',
    };

    const url = this.buildHALQuery(enhancedQuery, filters, args.max_results || 15);
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    const results = docs.map(doc => this.formatHALDocument(doc)).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'RECHERCHE HAL ARTISANAT - Type: {0}\n\n{1} resultats pour: {2}\n\n{3}',
          craftType,
          docs.length.toString(),
          args.query,
          results
        ),
      }],
    };
  }

  private async getHALDocument(args: {
    hal_id: string;
    format?: string;
  }): Promise<any> {
    const format = args.format || 'summary';
    
    // Récupérer les métadonnées JSON
    const metaUrl = `${HAL_SEARCH_URL}?q=halId_s:${args.hal_id}&wt=json`;
    const response = await axios.get<HALSearchResponse>(metaUrl);
    
    if (response.data.response.docs.length === 0) {
      throw new Error(`Document HAL ${args.hal_id} non trouvé`);
    }
    
    const doc = response.data.response.docs[0];
    const detailed = this.formatHALDocument(doc);
    const keywords = doc.keyword_s?.join(', ') || 'Aucun mot-clé';
    const fullText = doc.fileMain_s ? `\n**PDF disponible:** ${HAL_DOCUMENT_URL}/${args.hal_id}/document` : '';
    
    const result = format === 'full' 
      ? `${detailed}\n**Mots-clés:** ${keywords}${fullText}`
      : detailed;
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'DOCUMENT HAL DETAILLE\n\n{0}',
          result
        ),
      }],
    };
  }

  private async searchHALThesis(args: {
    query: string;
    discipline?: string;
    university?: string;
    max_results?: number;
  }): Promise<any> {
    const filters: { [key: string]: string } = {
      'docType_s': 'THESE',
    };
    
    if (args.discipline) {
      const disciplineMap: { [key: string]: string } = {
        'anthropologie': 'shs.anthro-se',
        'sociologie': 'shs.socio',
        'philosophie': 'shs.philo',
        'psychologie': 'shs.psycho',
        'ethnologie': 'shs.ethno',
      };
      
      const domain = disciplineMap[args.discipline.toLowerCase()];
      if (domain) filters['domain_s'] = domain;
    }

    const url = this.buildHALQuery(args.query, filters, args.max_results || 10);
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    const results = docs.map(doc => this.formatHALDocument(doc)).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'RECHERCHE THESES HAL\n\n{0} theses trouvees pour: {1}\nDiscipline: {2}\n\n{3}',
          docs.length.toString(),
          args.query,
          args.discipline || 'Toutes',
          results
        ),
      }],
    };
  }

  private async searchHALRecent(args: {
    domain?: string;
    months_back?: number;
    max_results?: number;
  }): Promise<any> {
    const domain = args.domain || 'anthropologie';
    const monthsBack = args.months_back || 6;
    
    const domainQueries: { [key: string]: string } = {
      'anthropologie': 'anthropologie OR ethnologie OR "culture materielle" OR "savoir-faire"',
      'phenomenologie': 'phenomenologie OR "experience vecue" OR conscience OR embodied',
      'artisanat': 'artisanat OR artisan OR "geste technique" OR "savoir-faire"',
      'sts': 'STS OR "science technology society" OR technologie OR innovation',
    };
    
    const query = domainQueries[domain] || 'anthropologie';
    
    // Calculer la date limite
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - monthsBack);
    const yearLimit = dateLimit.getFullYear();
    
    const filters = {
      'publicationDateY_i': `[${yearLimit} TO *]`,
    };

    const url = this.buildHALQuery(query, filters, args.max_results || 20);
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    const results = docs.map(doc => this.formatHALDocument(doc)).join('\n\n---\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'PUBLICATIONS RECENTES HAL - Domaine: {0}\n\nDerniers {1} mois - {2} resultats\n\n{3}',
          domain,
          monthsBack.toString(),
          docs.length.toString(),
          results
        ),
      }],
    };
  }

  private async generateHALBibtex(args: {
    query: string;
    max_entries?: number;
  }): Promise<any> {
    const url = this.buildHALQuery(args.query, {}, args.max_entries || 20);
    const response = await axios.get<HALSearchResponse>(url);
    const docs = response.data.response.docs;
    
    // Générer BibTeX simple à partir des métadonnées
    const bibtexEntries = docs.map((doc, index) => {
      const id = doc.halId_s || `hal-entry-${index}`;
      const title = doc.title_s?.[0] || 'Sans titre';
      const authors = doc.authFullName_s?.join(' and ') || 'Auteur inconnu';
      const year = doc.publicationDateY_i || new Date().getFullYear();
      const journal = doc.journalTitle_s || doc.bookTitle_s || '';
      const publisher = doc.publisher_s?.[0] || '';
      
      let entry = `@article{${id},\n`;
      entry += `  title = {${title}},\n`;
      entry += `  author = {${authors}},\n`;
      entry += `  year = {${year}},\n`;
      if (journal) entry += `  journal = {${journal}},\n`;
      if (publisher) entry += `  publisher = {${publisher}},\n`;
      entry += `  url = {${HAL_DOCUMENT_URL}/${id}}\n`;
      entry += `}`;
      
      return entry;
    }).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: this.createSafeMessage(
          'BIBLIOGRAPHIE BIBTEX HAL\n\nRequete: {0}\nEntrees: {1}\n\n{2}',
          args.query,
          docs.length.toString(),
          bibtexEntries
        ),
      }],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('HAL MCP Server running on stdio');
  }
}

const server = new HALMCPServer();
server.run().catch(console.error);
