// The intro (story-and-levels.md, part 1): in the Wieliczka Salt Mine, Smok Junior finds a glowing red stone, wants
// to see it shine in the sun, and in the crowd on the way out the friends lose each other. A first version: the
// story lines are final-ish, the staging gets better with the painted backdrop and the panel art (7.4).
import type { Cutscene } from './types';

export const intro: Cutscene = {
    id: 'intro',
    backdrop: 'salt-mine',
    actors: {
        smok: { x: 250 },
        kiwi: { x: 500, face: 'left' },
        sofi: { x: 590, face: 'left' },
    },
    beats: [
        { move: 'smok', to: 330 },
        { say: 'smok', line: 'story.intro.found' },
        { panel: 'red-stone-glow', line: 'story.intro.glow' },
        { say: 'sofi', line: 'story.intro.sun' },
        { say: 'smok', line: 'story.intro.castle' },
        { together: [{ move: 'smok', to: -120, speed: 'run' }, { wait: 300 }] },
        { say: 'kiwi', line: 'story.intro.lost' },
        { say: 'sofi', line: 'story.intro.wawel' },
    ],
};
