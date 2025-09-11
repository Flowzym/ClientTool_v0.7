// Barrel that adapts named export to default export.
// Works when `src/features/board/Board.tsx` has: `export function Board(...) {}` or `export const Board = ...`.
export { Board } from './Board.tsx';
import { Board as BoardComponent } from './Board.tsx';
export default BoardComponent;
