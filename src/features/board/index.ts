/**
 * Board feature barrel exports
 * Components exported as named (re-exported from default exports)
 * Hooks, services, and utilities exported as named
 */

// Main Board component
export { default as Board } from './Board';

// Board types
export type { OfferValue, PriorityValue, StatusValue } from './types';

// Board components
export { StatusChip, ResultChip, AngebotChip } from './StatusChips';
export { AssignDropdown } from './AssignDropdown';
export { FollowupPicker } from './FollowupPicker';

// Component sub-barrels
export * from './components';
export * from './hooks';
export * from './services';
export * from './utils';