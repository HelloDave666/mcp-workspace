@echo off
title arXiv Server MCP
cd /d "C:\Users\%USERNAME%\mcp-workspace\arxiv-server"
echo ?? D?marrage du serveur arXiv...
node build/index.js
pause
