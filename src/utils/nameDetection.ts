/**
 * Automatische Namens-Erkennung in Anmerkungen für Zuweisung
 */

import type { User } from '../domain/models';

export function detectUserInNote(note: string, users: User[]): User | null {
  if (!note || !note.trim()) return null;
  
  const normalizedNote = note.toLowerCase().trim();
  
  // Suche nach Vollnamen
  for (const user of users) {
    if (!user.active) continue;
    
    const userName = user.name.toLowerCase();
    
    // Exakte Übereinstimmung
    if (normalizedNote.includes(userName)) {
      return user;
    }
    
    // Vorname + Nachname separat
    const nameParts = userName.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Beide Teile müssen vorkommen
      if (normalizedNote.includes(firstName) && normalizedNote.includes(lastName)) {
        return user;
      }
    }
    
    // Nur Nachname (wenn eindeutig)
    if (nameParts.length >= 2) {
      const lastName = nameParts[nameParts.length - 1];
      if (lastName.length >= 3 && normalizedNote.includes(lastName)) {
        // Prüfe ob andere User den gleichen Nachnamen haben
        const sameLastName = users.filter(u => 
          u.active && 
          u.id !== user.id && 
          u.name.toLowerCase().includes(lastName)
        );
        
        if (sameLastName.length === 0) {
          return user;
        }
      }
    }
  }
  
  return null;
}

export function suggestAssignmentFromNote(note: string, users: User[]): {
  suggestedUser: User | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
} {
  const user = detectUserInNote(note, users);
  
  if (!user) {
    return {
      suggestedUser: null,
      confidence: 'low',
      reason: 'Kein Benutzername in Anmerkung erkannt'
    };
  }
  
  const normalizedNote = note.toLowerCase().trim();
  const userName = user.name.toLowerCase();
  
  // Confidence bestimmen
  if (normalizedNote.includes(userName)) {
    return {
      suggestedUser: user,
      confidence: 'high',
      reason: `Vollständiger Name "${user.name}" gefunden`
    };
  }
  
  const nameParts = userName.split(' ');
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    if (normalizedNote.includes(firstName) && normalizedNote.includes(lastName)) {
      return {
        suggestedUser: user,
        confidence: 'high',
        reason: `Vor- und Nachname "${firstName} ${lastName}" gefunden`
      };
    }
    
    if (normalizedNote.includes(lastName)) {
      return {
        suggestedUser: user,
        confidence: 'medium',
        reason: `Nachname "${lastName}" gefunden`
      };
    }
  }
  
  return {
    suggestedUser: user,
    confidence: 'low',
    reason: 'Teilweise Übereinstimmung'
  };
}