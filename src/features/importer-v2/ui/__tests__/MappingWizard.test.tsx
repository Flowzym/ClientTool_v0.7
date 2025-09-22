/**
 * Tests for MappingWizard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MappingWizard } from '../MappingWizard';

// Mock dependencies
vi.mock('../../../components/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>
}));

vi.mock('../../../components/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('../../../components/Badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>
}));

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn()
  }
}));

vi.mock('../templates/store', () => ({
  templateStore: {
    listTemplates: vi.fn().mockResolvedValue([]),
    autoDetectTemplate: vi.fn().mockResolvedValue(null)
  }
}));

describe('MappingWizard', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file upload step initially', () => {
    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Datei auswählen')).toBeInTheDocument();
    expect(screen.getByText('Excel/CSV-Datei hochladen')).toBeInTheDocument();
    expect(screen.getByText('Abbrechen')).toBeInTheDocument();
  });

  it('shows experimental badge', () => {
    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Experimental')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables next button initially', () => {
    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const nextButton = screen.getByText('Weiter');
    expect(nextButton).toBeDisabled();
  });

  it('shows step indicators', () => {
    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // Should show 4 step badges (1, 2, 3, 4)
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(5); // 4 steps + 1 experimental badge
  });

  it('accepts file input', () => {
    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const fileInput = screen.getByRole('button', { name: /excel\/csv-datei hochladen/i })
      .closest('div')?.querySelector('input[type="file"]');
    
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls,.csv');
  });

  it('shows encoding repair information', async () => {
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Mock XLSX to return data with encoding issues
    const XLSX = await import('xlsx');
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    } as any);
    
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      ['Stra�e', 'Vorname', 'Nachname'],
      ['Musterstraße 1', 'Max', 'Mustermann']
    ]);

    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const fileInput = screen.getByRole('button', { name: /excel\/csv-datei hochladen/i })
      .closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file upload
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/encoding-reparaturen erkannt/i)).toBeInTheDocument();
    });
  });

  it('shows auto-mapping toggle in mapping step', async () => {
    // First, simulate successful file upload to get to mapping step
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const XLSX = await import('xlsx');
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} }
    } as any);
    
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      ['Vorname', 'Nachname', 'Email'],
      ['Max', 'Mustermann', 'max@example.com']
    ]);

    render(
      <MappingWizard 
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    const fileInput = screen.getByRole('button', { name: /excel\/csv-datei hochladen/i })
      .closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('Spalten-Zuordnung')).toBeInTheDocument();
      expect(screen.getByText('Automatisch zuordnen')).toBeInTheDocument();
    });
  });
});