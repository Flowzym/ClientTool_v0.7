/**
 * Column mapping table component
 * Interactive table for mapping source columns to target fields
 */

import React from 'react';

// TODO: Implement mapping table component
// - Source column display with sample data
// - Target field selection dropdowns
// - Confidence indicators
// - Validation status indicators
// - Bulk mapping actions

interface MappingTableProps {
  headers: string[];
  sampleData?: string[][];
  mappings: Record<string, string>;
  onMappingChange: (column: string, field: string) => void;
  validationIssues?: Array<{
    column: string;
    type: 'error' | 'warning';
    message: string;
  }>;
}

export const MappingTable: React.FC<MappingTableProps> = ({
  headers,
  sampleData,
  mappings,
  onMappingChange,
  validationIssues
}) => {
  // TODO: Implement table state and interactions
  // - Column sorting and filtering
  // - Mapping confidence display
  // - Validation issue highlighting
  // - Bulk actions (clear all, auto-map, etc.)

  return (
    <div className="mapping-table">
      {/* TODO: Table header with actions */}
      <div className="table-header">
        <h3>Column Mappings</h3>
        <div className="table-actions">
          {/* TODO: Bulk action buttons */}
          <button>Auto-map All</button>
          <button>Clear All</button>
          <button>Reset to Template</button>
        </div>
      </div>

      {/* TODO: Mapping table */}
      <div className="table-container">
        <table className="mapping-table-grid">
          <thead>
            <tr>
              <th>Source Column</th>
              <th>Sample Data</th>
              <th>Target Field</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, index) => (
              <tr key={header} className="mapping-row">
                <td className="source-column">
                  {/* TODO: Column name with normalization info */}
                  <div className="column-name">{header}</div>
                  <div className="column-meta">
                    {/* TODO: Show normalized name, encoding fixes */}
                  </div>
                </td>
                <td className="sample-data">
                  {/* TODO: Sample data preview */}
                  <div className="sample-values">
                    {sampleData?.[index]?.slice(0, 3).map((value, i) => (
                      <span key={i} className="sample-value">{value}</span>
                    ))}
                  </div>
                </td>
                <td className="target-field">
                  {/* TODO: Field selection dropdown */}
                  <select 
                    value={mappings[header] || ''}
                    onChange={(e) => onMappingChange(header, e.target.value)}
                  >
                    <option value="">-- Select Field --</option>
                    {/* TODO: Populate with available fields */}
                  </select>
                </td>
                <td className="confidence">
                  {/* TODO: Confidence indicator */}
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: '75%' }}></div>
                  </div>
                  <span className="confidence-text">75%</span>
                </td>
                <td className="status">
                  {/* TODO: Validation status */}
                  <span className="status-indicator status-ok">✓</span>
                </td>
                <td className="actions">
                  {/* TODO: Row actions */}
                  <button title="Clear mapping">×</button>
                  <button title="Auto-detect">🔍</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TODO: Validation summary */}
      <div className="validation-summary">
        <p>Validation summary and issues will be displayed here</p>
      </div>
    </div>
  );
};

export default MappingTable;