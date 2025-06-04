#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 * - Searching academic papers on arXiv
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';

/**
 * Type alias for a note object.
 */
type Note = { title: string, content: string };

/**
 * Simple in-memory storage for notes.
 * In a real implementation, this would likely be backed by a database.
 */
const notes: { [id: string]: Note } = {
  "1": { title: "First Note", content: "This is note 1" },
  "2": { title: "Second Note", content: "This is note 2" }
};

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes and search arXiv), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "arxiv-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing available notes as resources.
 * Each note is exposed as a resource with:
 * - A note:// URI scheme
 * - Plain text MIME type
 * - Human readable name and description (now including the note title)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.entries(notes).map(([id, note]) => ({
      uri: `note:///${id}`,
      mimeType: "text/plain",
      name: note.title,
      description: `A text note: ${note.title}`
    }))
  };
});

/**
 * Handler for reading the contents of a specific note.
 * Takes a note:// URI and returns the note content as plain text.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const id = url.pathname.replace(/^\//, '');
  const note = notes[id];

  if (!note) {
    throw new Error(`Note ${id} not found`);
  }

  return {
    contents: [{
      uri: request.params.uri,
      mimeType: "text/plain",
      text: note.content
    }]
  };
});

/**
 * Handler that lists available tools.
 * Exposes tools for creating notes and searching arXiv.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_note",
        description: "Create a new note",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the note"
            },
            content: {
              type: "string",
              description: "Text content of the note"
            }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "search_arxiv",
        description: "Search for academic papers on arXiv",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'machine learning', 'quantum computing')"
            },
            max_results: {
              type: "number",
              description: "Maximum number of results (default: 10)",
              default: 10
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

/**
 * Handler for tool calls.
 * Handles both create_note and search_arxiv tools.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "create_note": {
      const title = String(request.params.arguments?.title);
      const content = String(request.params.arguments?.content);
      if (!title || !content) {
        throw new Error("Title and content are required");
      }

      const id = String(Object.keys(notes).length + 1);
      notes[id] = { title, content };

      return {
        content: [{
          type: "text",
          text: `Created note ${id}: ${title}`
        }]
      };
    }

    case "search_arxiv": {
      const query = String(request.params.arguments?.query);
      const max_results = Number(request.params.arguments?.max_results) || 10;

      if (!query) {
        throw new Error("Query is required");
      }

      try {
        console.error(`[arXiv] Searching: "${query}"`);

        const response = await axios.get('http://export.arxiv.org/api/query', {
          params: {
            search_query: query,
            start: 0,
            max_results: max_results,
          },
          timeout: 15000,
        });

        // Parse XML simply
        const entries = response.data.split('<entry>').slice(1, max_results + 1);
        const articles = [];

        for (const entry of entries) {
          const title = extractBetween(entry, '<title>', '</title>');
          const summary = extractBetween(entry, '<summary>', '</summary>');
          const published = extractBetween(entry, '<published>', '</published>');
          const id = extractBetween(entry, '<id>', '</id>');

          if (title) {
            articles.push({
              titre: title.replace(/\s+/g, ' ').trim(),
              resume: summary ? summary.substring(0, 300) + '...' : 'No summary',
              date: published ? published.substring(0, 10) : 'Unknown date',
              lien: id || 'No link available',
            });
          }
        }

        return {
          content: [{
            type: "text",
            text: `✅ arXiv Search Results for "${query}"\n\nFound ${articles.length} articles:\n\n${JSON.stringify(articles, null, 2)}`
          }]
        };

      } catch (error: any) {
        console.error(`[arXiv ERROR] ${error.message}`);
        return {
          content: [{
            type: "text",
            text: `❌ Error searching arXiv: ${error.message}`
          }]
        };
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Handler that lists available prompts.
 * Exposes a single "summarize_notes" prompt that summarizes all notes.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "summarize_notes",
        description: "Summarize all notes",
      }
    ]
  };
});

/**
 * Handler for the summarize_notes prompt.
 * Returns a prompt that requests summarization of all notes, with the notes' contents embedded as resources.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "summarize_notes") {
    throw new Error("Unknown prompt");
  }

  const embeddedNotes = Object.entries(notes).map(([id, note]) => ({
    type: "resource" as const,
    resource: {
      uri: `note:///${id}`,
      mimeType: "text/plain",
      text: note.content
    }
  }));

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Please summarize the following notes:"
        }
      },
      ...embeddedNotes.map(note => ({
        role: "user" as const,
        content: note
      })),
      {
        role: "user",
        content: {
          type: "text",
          text: "Provide a concise summary of all the notes above."
        }
      }
    ]
  };
});

/**
 * Utility function to extract text between XML tags
 */
function extractBetween(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (endIndex === -1) return '';
  return text.substring(startIndex + start.length, endIndex);
}

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});