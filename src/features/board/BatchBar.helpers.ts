// Helper exports for BatchBar component
// All non-component exports moved from BatchBar.tsx

import type { User, Status, Result, Angebot } from '../../domain/models';

export interface BatchBarProps {
  selectedCount: number;
  users: User[];
  onClearSelection: () => void;
  onBatchAssign: (userId?: string) => void;
  onBatchStatus: (status: Status) => void;
  onBatchResult: (result?: Result) => void;
  onBatchAngebot: (angebot?: Angebot) => void;
  onBatchFollowup: (date?: string) => void;
  onBatchArchive: () => void;
  onBatchUnarchive: () => void;
  onBatchDelete: () => void;
  onBatchPin: () => void;
  onBatchUnpin: () => void;
  onExportSelected: () => void;
  canDelete: boolean;
  showArchived: boolean;
}