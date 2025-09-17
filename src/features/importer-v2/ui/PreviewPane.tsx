/**
 * Data preview pane component
 * Shows preview of imported data with validation highlights
 */

import React from 'react';

// TODO: Implement data preview pane
// - Tabular data preview with virtual scrolling
// - Validation issue highlighting
// - Column mapping visualization
// - Data transformation preview
// - Export preview functionality

interface PreviewData {
  headers: string[];
  rows: any[][];
  mappings: Record<string, string>;
  validationIssues: Array<{
    row: number;
    column: string;
    type: 'error' | 'warning' | 'info';
    message: string;
  }>;
}

interface PreviewPaneProps {
  data?: PreviewData;
  isLoading?: boolean;
  maxRows?: number;
  showValidation?: boolean;
  onRowClick?: (rowIndex: number) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  data,
  isLoading = false,
  maxRows = 100,
  showValidation = true,
  onRowClick
}) => {
  // TODO: Implement preview pane state and interactions
  // - Virtual scrolling for large datasets
  // - Column resizing and reordering
  // - Validation issue tooltips
  // - Row selection and highlighting
  // - Export preview functionality

  if (isLoading) {
    return (
      <div className="preview-pane loading">
        <div className="loading-indicator">
          <span className="spinner">⏳</span>
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="preview-pane empty">
        <div className="empty-state">
          <span className="empty-icon">📄</span>
          <h3>No Data to Preview</h3>
          <p>Upload a file and configure mappings to see a preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-pane">
      {/* TODO: Preview header with stats */}
      <div className="preview-header">
        <div className="preview-stats">
          <span className="stat">
            <strong>{data.rows.length}</strong> rows
          </span>
          <span className="stat">
            <strong>{data.headers.length}</strong> columns
          </span>
          {showValidation && (
            <span className="stat validation-stat">
              <strong>{data.validationIssues.length}</strong> issues
            </span>
          )}
        </div>
        
        <div className="preview-actions">
          <button className="export-preview-btn">📤 Export Preview</button>
          <button className="toggle-validation-btn">
            {showValidation ? '👁️ Hide Issues' : '👁️ Show Issues'}
          </button>
        </div>
      </div>

      {/* TODO: Preview table */}
      <div className="preview-table-container">
        <table className="preview-table">
          <thead>
            <tr>
              <th className="row-number-header">#</th>
              {data.headers.map((header, index) => (
                <th key={index} className="preview-header-cell">
                  <div className="header-content">
                    <span className="header-name">{header}</span>
                    {data.mappings[header] && (
                      <span className="mapped-field">
                        → {data.mappings[header]}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, maxRows).map((row, rowIndex) => {
              const rowIssues = data.validationIssues.filter(issue => issue.row === rowIndex);
              const hasErrors = rowIssues.some(issue => issue.type === 'error');
              const hasWarnings = rowIssues.some(issue => issue.type === 'warning');
              
              return (
                <tr
                  key={rowIndex}
                  className={`preview-row ${hasErrors ? 'has-errors' : ''} ${hasWarnings ? 'has-warnings' : ''}`}
                  onClick={() => onRowClick?.(rowIndex)}
                >
                  <td className="row-number">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => {
                    const cellIssues = rowIssues.filter(
                      issue => issue.column === data.headers[cellIndex]
                    );
                    
                    return (
                      <td
                        key={cellIndex}
                        className={`preview-cell ${cellIssues.length > 0 ? 'has-issues' : ''}`}
                        title={cellIssues.map(issue => issue.message).join('\n')}
                      >
                        <span className="cell-content">{cell}</span>
                        {cellIssues.length > 0 && showValidation && (
                          <span className="issue-indicator">
                            {cellIssues.some(i => i.type === 'error') ? '❌' : '⚠️'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TODO: Validation issues summary */}
      {showValidation && data.validationIssues.length > 0 && (
        <div className="validation-issues-summary">
          <h4>Validation Issues</h4>
          <div className="issues-list">
            {data.validationIssues.slice(0, 10).map((issue, index) => (
              <div key={index} className={`issue-item ${issue.type}`}>
                <span className="issue-icon">
                  {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span className="issue-location">
                  Row {issue.row + 1}, Column {issue.column}:
                </span>
                <span className="issue-message">{issue.message}</span>
              </div>
            ))}
            {data.validationIssues.length > 10 && (
              <div className="more-issues">
                ... and {data.validationIssues.length - 10} more issues
              </div>
            )}
          </div>
        </div>
      )}

      {/* TODO: Pagination for large datasets */}
      {data.rows.length > maxRows && (
        <div className="preview-pagination">
          <span>Showing first {maxRows} of {data.rows.length} rows</span>
          <button className="load-more-btn">Load More</button>
        </div>
      )}
    </div>
  );
};

export default PreviewPane;