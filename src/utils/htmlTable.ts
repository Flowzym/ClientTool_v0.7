export type HtmlTable = { name: string; headers: string[]; rows: string[][] };

export function extractTablesFromHtml(html: string): HtmlTable[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));
  
  return tables.map((table, idx) => {
    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th,td')).map(cell => 
        cell.textContent?.trim() ?? ''
      )
    );
    
    const headers = rows.length ? rows[0] : [];
    const data = rows.length > 1 ? rows.slice(1) : [];
    
    // Versuche einen sinnvollen Namen zu finden
    const name = table.getAttribute('id') || 
                 table.getAttribute('aria-label') || 
                 table.getAttribute('data-name') ||
                 table.querySelector('caption')?.textContent?.trim() ||
                 `Tabelle ${idx + 1}`;
    
    return { 
      name: name.slice(0, 31), // Excel Sheet-Namen sind auf 31 Zeichen begrenzt
      headers, 
      rows: data 
    };
  }).filter(table => 
    // Filtere leere Tabellen oder Tabellen ohne sinnvolle Daten
    table.headers.length > 0 && table.headers.some(h => h.length > 0)
  );
}