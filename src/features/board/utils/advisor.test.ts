/**
 * Tests für AMS-Berater Parser
 */

import { describe, it, expect } from 'vitest';
import { computeAdvisor, type ClientAdvisor } from './advisor';

describe('computeAdvisor', () => {
  it('should use manual amsAdvisor when available', () => {
    const client: ClientAdvisor = {
      amsAdvisor: 'Claudia Schmitt',
      amsAgentFirstName: 'Max',
      amsAgentLastName: 'Berater'
    };
    
    expect(computeAdvisor(client)).toBe('Claudia Schmitt');
  });

  it('should combine first and last name when no manual advisor', () => {
    const client: ClientAdvisor = {
      amsAgentFirstName: 'Max',
      amsAgentLastName: 'Berater'
    };
    
    expect(computeAdvisor(client)).toBe('Max Berater');
  });

  it('should handle only first name', () => {
    const client: ClientAdvisor = {
      amsAgentFirstName: 'Max'
    };
    
    expect(computeAdvisor(client)).toBe('Max');
  });

  it('should handle only last name', () => {
    const client: ClientAdvisor = {
      amsAgentLastName: 'Berater'
    };
    
    expect(computeAdvisor(client)).toBe('Berater');
  });

  it('should return empty string when no data available', () => {
    const client: ClientAdvisor = {};
    
    expect(computeAdvisor(client)).toBe('');
  });

  it('should trim whitespace correctly', () => {
    const client: ClientAdvisor = {
      amsAdvisor: '  Claudia Schmitt  '
    };
    
    expect(computeAdvisor(client)).toBe('Claudia Schmitt');
  });

  it('should handle null values', () => {
    const client: ClientAdvisor = {
      amsAdvisor: null,
      amsAgentFirstName: null,
      amsAgentLastName: 'Berater'
    };
    
    expect(computeAdvisor(client)).toBe('Berater');
  });
});