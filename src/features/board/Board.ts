// Robust barrel for Board component.
// Works whether './Board.tsx' exports default, named `Board`, or any single React component.
// This avoids static named/default imports that might fail linkage.
import * as Mod from './Board.tsx';

// Prefer default, then named `Board`, then first export.
const BoardComponent = (Mod as any).default ?? (Mod as any).Board ?? (Object.values(Mod)[0] as any);

export default BoardComponent;
export const Board = BoardComponent;
