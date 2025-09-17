/**
 * Template management bar component
 * Quick access to templates and template actions
 */

import React from 'react';

// TODO: Implement template management bar
// - Template selection dropdown
// - Save current mapping as template
// - Template auto-detection indicator
// - Template management actions
// - Usage statistics display

interface Template {
  id: string;
  name: string;
  description?: string;
  confidence?: number;
  lastUsed?: string;
  usageCount: number;
}

interface TemplateBarProps {
  currentTemplate?: Template;
  availableTemplates: Template[];
  onTemplateSelect: (templateId: string) => void;
  onSaveAsTemplate: () => void;
  onManageTemplates: () => void;
  autoDetectedTemplate?: Template;
  isLoading?: boolean;
}

export const TemplateBar: React.FC<TemplateBarProps> = ({
  currentTemplate,
  availableTemplates,
  onTemplateSelect,
  onSaveAsTemplate,
  onManageTemplates,
  autoDetectedTemplate,
  isLoading = false
}) => {
  // TODO: Implement template bar state and interactions
  // - Template dropdown with search
  // - Auto-detection notification
  // - Template confidence display
  // - Quick actions menu

  return (
    <div className="template-bar">
      {/* TODO: Auto-detection notification */}
      {autoDetectedTemplate && (
        <div className="auto-detection-notice">
          <span className="detection-icon">🔍</span>
          <span className="detection-text">
            Auto-detected template: <strong>{autoDetectedTemplate.name}</strong>
            ({Math.round((autoDetectedTemplate.confidence || 0) * 100)}% confidence)
          </span>
          <button 
            onClick={() => onTemplateSelect(autoDetectedTemplate.id)}
            className="apply-template-btn"
          >
            Apply
          </button>
          <button className="dismiss-btn">×</button>
        </div>
      )}

      {/* TODO: Template selection and actions */}
      <div className="template-controls">
        <div className="template-selector">
          <label>Template:</label>
          <select
            value={currentTemplate?.id || ''}
            onChange={(e) => onTemplateSelect(e.target.value)}
            disabled={isLoading}
            className="template-select"
          >
            <option value="">-- No Template --</option>
            {availableTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.usageCount > 0 && ` (used ${template.usageCount}x)`}
              </option>
            ))}
          </select>
        </div>

        <div className="template-actions">
          <button
            onClick={onSaveAsTemplate}
            className="save-template-btn"
            title="Save current mapping as template"
          >
            💾 Save as Template
          </button>
          
          <button
            onClick={onManageTemplates}
            className="manage-templates-btn"
            title="Manage templates"
          >
            ⚙️ Manage
          </button>
        </div>
      </div>

      {/* TODO: Current template info */}
      {currentTemplate && (
        <div className="current-template-info">
          <div className="template-details">
            <span className="template-name">{currentTemplate.name}</span>
            {currentTemplate.description && (
              <span className="template-description">{currentTemplate.description}</span>
            )}
          </div>
          
          <div className="template-stats">
            {currentTemplate.lastUsed && (
              <span className="last-used">
                Last used: {new Date(currentTemplate.lastUsed).toLocaleDateString()}
              </span>
            )}
            <span className="usage-count">
              Used {currentTemplate.usageCount} times
            </span>
          </div>
        </div>
      )}

      {/* TODO: Loading indicator */}
      {isLoading && (
        <div className="template-loading">
          <span className="loading-spinner">⏳</span>
          <span>Loading templates...</span>
        </div>
      )}
    </div>
  );
};

export default TemplateBar;