import { SCENE_GAME, SCHEDULE } from './data.js';

const gameById = Object.fromEntries(SCHEDULE.map(g => [g.g, g]));
const sceneGame = gameById[SCENE_GAME];
const played = g => !!g.line;
const runsOf = (g, t) => g.rhe[t][0];
const winnerOf = g => runsOf(g, 'wc') > runsOf(g, 'ctbc') ? 'wc' : 'ctbc';

export { gameById, sceneGame, played, runsOf, winnerOf };
