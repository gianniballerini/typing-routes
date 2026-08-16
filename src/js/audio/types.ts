// Shapes for `src/assets/data/sounds.json` and for the Mechvibes pack descriptor
// that ships alongside each keyboard sprite in `public/sounds/<pack>/config.json`.

type SoundCategory = 'music' | 'sfx' | 'keys';

interface KeyPackSource {
    url: string;
    // Passed verbatim to `HTMLAudioElement.canPlayType` to pick a source the
    // browser can actually decode. Every pack ships AAC only: it is the one
    // encoding Safari and iOS are certain to take, and it is also the smaller
    // file for these sprites.
    type: string;
    size: number;
    // AAC carries encoder priming delay. If a transcoded sprite plays shifted
    // against its config offsets, correct it here rather than in code.
    offsetCompensationMs?: number;
}

interface KeyPackDefinition {
    configUrl: string;
    sources: KeyPackSource[];
    volume?: number;
}

interface SoundDefinition {
    name: string;
    url: string;
    // Second encoding for browsers that cannot play `url`. Unused while
    // everything ships as AAC, which decodes everywhere.
    fallbackUrl?: string;
    size: number;
    loop?: boolean;
    volume?: number;
    category?: SoundCategory;
    // Play through an `HTMLAudioElement` instead of decoding to PCM. A couple of
    // MB of music decodes to tens of MB of float32 samples; short cues do not.
    stream?: boolean;
}

interface SoundManifest {
    // The in-game typing sprite.
    keyPack?: KeyPackDefinition;
    // A second sprite, played for buttons and every other UI interaction, so the
    // menu does not sound like the keyboard the player types on.
    uiPack?: KeyPackDefinition;
    sounds: SoundDefinition[];
}

// Mechvibes sound-pack descriptor. `defines` maps an iohook keycode (see
// `KeycodeMap`) to a `[startMs, durationMs]` region inside the sprite.
interface MechvibesConfig {
    id?: string;
    name?: string;
    sound: string;
    defines: Record<string, [number, number] | null>;
}

export type {
    KeyPackDefinition,
    KeyPackSource,
    MechvibesConfig,
    SoundCategory,
    SoundDefinition,
    SoundManifest,
};
