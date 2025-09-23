export type ColumnKey =
  | 'title' | 'lastName' | 'firstName' | 'gender' | 'svNumber'
  | 'birthDate' | 'postalCode' | 'city' | 'street'
  | 'countryDial' | 'areaDial' | 'phone'
  | 'bookingStatus' | 'note' | 'additionalBooking' | 'planned'
  | 'entryDate' | 'exitDate' | 'rgs'
  | 'advisorTitle' | 'advisorLastName' | 'advisorFirstName'
  | 'measureNumber' | 'eventNumber' | 'email'
  // computed/optionale:
  | 'advisorFull' | 'phoneCombined'
  // bestehende Board-Spalten:
  | 'name' | 'offer' | 'status' | 'result' | 'followUp' | 'assignedTo' 
  | 'contacts' | 'notes' | 'booking' | 'priority' | 'activity' | 'actions';

export interface ColumnDef {
  key: ColumnKey;
  label: string;           // UI-Label
  visibleDefault: boolean; // Standard-Layout
  minWidth?: number;
  sortable?: boolean;
  computed?: (row: any) => string | number | null; // für optionale zusammengesetzte Felder
  category?: 'core' | 'contact' | 'ams' | 'computed' | 'internal';
}