/**
 * Batch-Aktionen für ausgewählte Clients
 */
import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { X, Users, Tag, Calendar, Archive, Trash2 } from 'lucide-react';
import { Pin, Download } from 'lucide-react';
import { AssignDropdown } from './AssignDropdown';
import { StatusChip, ResultChip, AngebotChip } from './StatusChips';
import { FollowupPicker } from './FollowupPicker';
import { Can } from '../../components/auth/Can';
import type { BatchBarProps } from './BatchBar.helpers';

export function BatchBar({
  selectedCount,
  users,
  onClearSelection,
  onBatchAssign,
  onBatchStatus,
  onBatchResult,
  onBatchAngebot,
  onBatchFollowup,
  onBatchArchive,
  onBatchUnarchive,
  onBatchDelete,
  onBatchPin,
  onBatchUnpin,
  onExportSelected,
  canDelete,
  showArchived
}: BatchBarProps) {
  const [showAssign, setShowAssign] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showAngebot, setShowAngebot] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="md">
              {selectedCount} ausgewählt
            </Badge>
            <button
              onClick={onClearSelection}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <Can perm="assign">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssign(!showAssign)}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Zuweisen
                </Button>
                {showAssign && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <AssignDropdown
                      value={undefined}
                      onChange={(userId) => {
                        onBatchAssign(userId);
                        setShowAssign(false);
                      }}
                      users={users}
                    />
                  </div>
                )}
              </div>
            </Can>
            
            <Can perm="update_status">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStatus(!showStatus)}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Status
                </Button>
                {showStatus && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <StatusChip
                      value="offen"
                      onChange={(status) => {
                        onBatchStatus(status);
                        setShowStatus(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </Can>
            
            <Can perm="update_status">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResult(!showResult)}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Ergebnis
                </Button>
                {showResult && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <ResultChip
                      value={undefined}
                      onChange={(result) => {
                        onBatchResult(result);
                        setShowResult(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </Can>
            
            <Can perm="update_status">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAngebot(!showAngebot)}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Angebot
                </Button>
                {showAngebot && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <AngebotChip
                      value={undefined}
                      onChange={(angebot) => {
                        onBatchAngebot(angebot);
                        setShowAngebot(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </Can>
            
            <Can perm="update_status">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAngebot(!showAngebot)}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Angebot
                </Button>
                {showAngebot && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <AngebotChip
                      value={undefined}
                      onChange={(angebot) => {
                        onBatchAngebot(angebot);
                        setShowAngebot(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </Can>
            
            <Can perm="edit_followup">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFollowup(!showFollowup)}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Follow-up
                </Button>
                {showFollowup && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <FollowupPicker
                      value={undefined}
                      onChange={(date) => {
                        onBatchFollowup(date);
                        setShowFollowup(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </Can>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Can perm="update_status">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBatchPin}
            >
              <Pin className="w-4 h-4 mr-1" />
              Anpinnen
            </Button>
          </Can>
          
          <Can perm="update_status">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBatchUnpin}
            >
              <Pin className="w-4 h-4 mr-1 rotate-45" />
              Entpinnen
            </Button>
          </Can>
          
          <Can perm="export_data">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportSelected}
            >
              <Download className="w-4 h-4 mr-1" />
              CSV Export
            </Button>
          </Can>
          
          <Can perm="update_status">
            {showArchived ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBatchUnarchive}
              >
                <Archive className="w-4 h-4 mr-1" />
                Entarchivieren
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBatchArchive}
              >
                <Archive className="w-4 h-4 mr-1" />
                Archivieren
              </Button>
            )}
          </Can>
          
          <Can perm="manage_users">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBatchDelete}
              disabled={!canDelete}
              className="text-error-500 hover:text-error-700 disabled:text-gray-400"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Löschen
            </Button>
          </Can>
        </div>
      </div>
      
      {!canDelete && (
        <div className="text-xs text-gray-500 mt-2">
          Löschen nur möglich, wenn keine Kontakthistorie oder Zuweisung vorhanden ist.
        </div>
      )}
    </div>
  );
}