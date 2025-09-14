ClientTool Patch — Board sorting fallback (CJS, no ESM issues) 
This patch fixes crashes when setView is not a function by: - Adding a local sort fallback (localSort, sortState, sortedClients) - Introducing
a _setView shim that safely uses setView if available, otherwise updates localSort - Replacing setView( calls with _setView( safely -
Updating Board header bindings to sortState and using sortedClients 
Apply 
node scripts/apply-board-sorting-fallback.cjs
npm run status