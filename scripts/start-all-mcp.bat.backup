@echo off
title Lanceur MCP - Ecosystem Complet
echo ========================================
echo ?? D?MARRAGE ECOSYSTEM MCP COMPLET
echo ========================================
echo.
echo Lancement des 3 serveurs MCP...
echo.

REM D?marrer chaque serveur dans sa propre fen?tre
start "arXiv Server" "%~dp0start-arxiv.bat"
timeout /t 2 /nobreak >nul

start "LinkedIn Strategic" "%~dp0start-linkedin.bat"
timeout /t 2 /nobreak >nul

start "Project Manager" "%~dp0start-projects.bat"
timeout /t 2 /nobreak >nul

echo ? Les 3 serveurs MCP sont en cours de d?marrage...
echo.
echo ?? Serveurs lanc?s :
echo   - ?? arXiv Server (Recherche acad?mique)
echo   - ?? LinkedIn Strategic (Financement europ?en)
echo   - ?? Project Context Manager (Gestion multi-projets)
echo.
echo ?? Vous pouvez maintenant utiliser Claude Desktop
echo    avec les 3 serveurs MCP op?rationnels !
echo.
pause
