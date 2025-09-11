// Barrel to provide a named export `Board` for consumers doing:
//   import { Board } from './features/board/Board';
// It re-exports the default component from the TSX file.
export { default as Board } from './Board.tsx';
export { default } from './Board.tsx';
