@echo off
title Lanceur MCP - Ecosystem Complet
echo ========================================
echo ?? D?MARRAGE ECOSYSTEM MCP COMPLET
echo ========================================
echo.
echo Lancement des 3 serveurs MCP (fen?tres minimis?es)...
echo.

REM D?marrer chaque serveur minimis? dans sa propre fen?tre
start /min "arXiv Server" "%~dp0start-arxiv.bat"
timeout /t 2 /nobreak >nul

start /min "LinkedIn Strategic" "%~dp0start-linkedin.bat"
timeout /t 2 /nobreak >nul

start /min "Project Manager" "%~dp0start-projects.bat"
timeout /t 2 /nobreak >nul

echo ? Les 3 serveurs MCP sont d?marr?s (minimis?s)
echo.
echo ?? Serveurs lanc?s en arri?re-plan :
echo   - ?? arXiv Server (Recherche acad?mique)
echo   - ?? LinkedIn Strategic (Financement europ?en)
echo   - ?? Project Context Manager (Gestion multi-projets)
echo.
echo ?? Serveurs dans la barre des t?ches - Claude Desktop pr?t !
echo.
echo Cette fen?tre va se fermer dans 5 secondes...
timeout /t 5 /nobreak >nul
exit
