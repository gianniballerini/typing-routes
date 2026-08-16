// The trophy catalog. Pure data: every rule that reads it lives in `Achievements`.
//
// `id` is the persisted key. Renaming one silently takes the trophy away from
// everyone who already earned it, so ids are append-only.

interface AchievementDefinition {
    id: string;
    title: string;
    description: string;
    // Real art drops in later; rows fall back to the placeholder while it is null.
    imageUrl: string | null;
}

const ACHIEVEMENT_PLACEHOLDER_IMAGE = '/images/achievements/placeholder.svg';

// The fractions behind the four completion tiers and the four star tiers. Kept
// next to the definitions so a tier and its threshold can never drift apart.
const ROUTE_COMPLETION_TIERS: Record<string, number> = {
    'routes-10': 0.1,
    'routes-50': 0.5,
    'routes-80': 0.8,
    'routes-100': 1
};

const THREE_STAR_TIERS: Record<string, number> = {
    'stars-10': 0.1,
    'stars-50': 0.5,
    'stars-80': 0.8,
    'stars-100': 1
};

// Awarded once every other trophy is unlocked, so it is always evaluated last.
const ALL_TROPHIES_ID = 'all-trophies';

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    {
        id: 'first-route',
        title: 'Primer viaje',
        description: 'Completá tu primera ruta.',
        imageUrl: null
    },
    {
        id: 'first-three-stars',
        title: 'Scaloneta',
        description: 'Conseguí 3 estrellas en una ruta.',
        imageUrl: null
    },
    {
        id: 'longest-route',
        title: 'De punta a punta',
        description: 'Completá la ruta más larga del país.',
        imageUrl: null
    },
    {
        id: 'longest-route-perfect',
        title: 'La 40 sin pinchar',
        description: 'Conseguí 3 estrellas en la ruta más larga del país.',
        imageUrl: null
    },
    {
        id: 'shortest-route',
        title: 'Vuelta a la esquina',
        description: 'Completá la ruta más corta del país.',
        imageUrl: null
    },
    {
        id: 'what-is-a-mouse',
        title: '¿Qué es un mouse?',
        description: 'Navegá el menú y elegí una opción sin tocar el mouse.',
        imageUrl: null
    },
    {
        id: 'shared-score',
        title: 'Presumido',
        description: 'Compartí el resultado de una ruta con un amigo.',
        imageUrl: null
    },
    {
        id: 'routes-10',
        title: 'En marcha',
        description: 'Completá el 10% de las rutas.',
        imageUrl: null
    },
    {
        id: 'routes-50',
        title: 'Medio país',
        description: 'Completá el 50% de las rutas.',
        imageUrl: null
    },
    {
        id: 'routes-80',
        title: 'Casi todo',
        description: 'Completá el 80% de las rutas.',
        imageUrl: null
    },
    {
        id: 'routes-100',
        title: 'Cartógrafo',
        description: 'Completá el 100% de las rutas.',
        imageUrl: null
    },
    {
        id: 'stars-10',
        title: 'Primer brillo',
        description: 'Conseguí 3 estrellas en el 10% de las rutas.',
        imageUrl: null
    },
    {
        id: 'stars-50',
        title: 'Cielo estrellado',
        description: 'Conseguí 3 estrellas en el 50% de las rutas.',
        imageUrl: null
    },
    {
        id: 'stars-80',
        title: 'Constelación',
        description: 'Conseguí 3 estrellas en el 80% de las rutas.',
        imageUrl: null
    },
    {
        id: 'stars-100',
        title: 'Vía Láctea',
        description: 'Conseguí 3 estrellas en el 100% de las rutas.',
        imageUrl: null
    },
    {
        id: ALL_TROPHIES_ID,
        title: 'Coleccionista',
        description: 'Desbloqueá todos los trofeos.',
        imageUrl: null
    }
];

export {
    ACHIEVEMENT_DEFINITIONS,
    ACHIEVEMENT_PLACEHOLDER_IMAGE,
    ALL_TROPHIES_ID,
    ROUTE_COMPLETION_TIERS,
    THREE_STAR_TIERS
};
export type { AchievementDefinition };

