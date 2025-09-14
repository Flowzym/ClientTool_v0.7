# ADR-0013: Follow-up Filter Semantics and Day Boundaries

## Status
Accepted and Implemented

## Context

The Board component includes follow-up date filtering for client management. Clear semantics are needed for day boundary calculations, timezone handling, and filter behavior to ensure consistent user experience across different environments and timezones.

### Requirements
- **Day boundaries**: Local timezone with inclusive boundaries
- **Filter stability**: Consistent results regardless of time of day
- **Timezone awareness**: Handle user's local timezone correctly
- **Date parsing**: Support multiple input formats (German, ISO, mixed)

## Decision

Implement **local day boundary semantics** with inclusive filtering and robust date parsing.

### Day Boundary Rules

#### Local Timezone Calculation
```typescript
// Today: 00:00:00 to 23:59:59 in user's local timezone
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);
```

#### Inclusive Boundaries
- **Today**: Follow-up date falls within today's local day (00:00 - 23:59)
- **Overdue**: Follow-up date is before today's start (< 00:00 today)
- **Next 7 days**: Follow-up date is within next 7 local days (inclusive)

#### Examples (User in Vienna, CET/CEST)

**Today Filter (2024-01-15)**:
- ✅ `2024-01-15T08:00:00Z` (09:00 CET) - included
- ✅ `2024-01-15T22:00:00Z` (23:00 CET) - included  
- ❌ `2024-01-14T23:00:00Z` (00:00 CET) - yesterday
- ❌ `2024-01-16T07:00:00Z` (08:00 CET) - tomorrow

**Overdue Filter (2024-01-15)**:
- ✅ `2024-01-14T15:00:00Z` (16:00 CET) - overdue
- ✅ `2024-01-10T10:00:00Z` (11:00 CET) - overdue
- ❌ `2024-01-15T08:00:00Z` (09:00 CET) - today
- ❌ `2024-01-16T10:00:00Z` (11:00 CET) - future

### Date Parsing Strategy

#### Supported Formats
1. **ISO format**: `2024-01-15`, `2024-01-15T10:30:00Z`
2. **German format**: `15.01.2024`, `15/01/2024`
3. **Single digits**: `1.9.2024`, `5/3/2024`
4. **Ambiguous handling**: Prefer German format for day ≤ 12

#### Implementation
```typescript
export function safeParseToISO(input: unknown): string | undefined {
  // German format: dd.mm.yyyy or dd/mm/yyyy
  const germanMatch = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  
  // US format only when day > 12 (unambiguous)
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch && Number(usMatch[2]) > 12) {
    // First is month, second is day
    const d = new Date(Number(usMatch[3]), Number(usMatch[1]) - 1, Number(usMatch[2]));
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
}
```

## Implementation

### Filter Logic
```typescript
function isToday(followUpISO: string): boolean {
  const followUpDate = new Date(followUpISO);
  const today = new Date();
  
  return followUpDate.getFullYear() === today.getFullYear() &&
         followUpDate.getMonth() === today.getMonth() &&
         followUpDate.getDate() === today.getDate();
}

function isOverdue(followUpISO: string): boolean {
  const followUpDate = new Date(followUpISO);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  return followUpDate < startOfToday;
}
```

### Timezone Considerations
- **User timezone**: All calculations use `new Date()` which respects user's system timezone
- **ISO storage**: Follow-up dates stored as ISO strings in UTC
- **Local display**: Converted to local timezone for filtering and display
- **DST handling**: JavaScript Date handles daylight saving transitions automatically

## Consequences

### Positive
- **Predictable behavior**: Filters work consistently regardless of time of day
- **Timezone aware**: Respects user's local timezone settings
- **Inclusive boundaries**: Clear semantics for "today" and "overdue"
- **Robust parsing**: Handles multiple date input formats gracefully

### Negative
- **Timezone complexity**: Requires careful handling of UTC ↔ local conversions
- **Testing complexity**: Need to test across different timezones and DST transitions
- **Performance**: Date calculations on every filter operation

### Trade-offs
- **Local vs UTC**: Chose local timezone for better user experience
- **Inclusive vs exclusive**: Chose inclusive boundaries for intuitive behavior
- **Format support**: Support multiple formats vs strict ISO-only

## Testing Strategy

### Unit Tests
- Date parsing with various formats
- Boundary calculations across timezones
- Edge cases (leap years, DST transitions)

### Integration Tests
- Filter behavior with real follow-up data
- Timezone consistency across components
- User interaction with date inputs

### Edge Cases
- **Leap years**: February 29th handling
- **DST transitions**: Spring forward/fall back
- **Year boundaries**: December 31st → January 1st
- **Invalid dates**: Graceful handling of malformed input

## Monitoring

### Quality Metrics
- **Parse success rate**: Percentage of successful date parsing
- **Filter consistency**: Same results across page reloads
- **Performance**: Filter operation timing

### User Experience
- **Intuitive behavior**: Filters match user expectations
- **Clear feedback**: Invalid dates handled gracefully
- **Consistent display**: Date formatting matches input format

## Future Considerations

### Potential Enhancements
- **Timezone selection**: Allow users to override system timezone
- **Custom date formats**: Support additional regional formats
- **Relative dates**: "Next week", "Last month" filters
- **Date range filters**: From/to date selection

### Known Limitations
- **System timezone dependency**: Relies on user's system settings
- **Format detection**: Ambiguous dates default to German format
- **Performance**: No caching of boundary calculations

## References
- Date parsing implementation: `src/utils/date/safeParseToISO.ts`
- Filter logic: `src/features/board/useBoardData.ts`
- Boundary tests: `src/features/board/__tests__/followup.filter.boundary.test.ts`
- Parse tests: `src/features/import/__tests__/date.parse.safe.test.ts`

## Appendix: Operational Hygiene

### Date Parsing Performance
- **Caching**: Consider memoization for repeated parsing
- **Validation**: Early rejection of obviously invalid formats
- **Error handling**: Graceful degradation for parse failures

### Filter Stability
- **Boundary consistency**: Same filter results throughout the day
- **Timezone handling**: Proper DST transition support
- **Performance**: Efficient date comparison algorithms

### User Experience Guidelines
- **Clear feedback**: Show parsing errors to users
- **Format hints**: Indicate expected date formats
- **Timezone display**: Show user's timezone in UI when relevant