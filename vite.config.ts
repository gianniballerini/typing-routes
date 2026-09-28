import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pug from 'pug';
import { defineConfig, type Plugin } from 'vite';

const useHttps = process.env.VITE_USE_HTTPS === 'true';
const certKeyPath = resolve(process.cwd(), 'certificates', 'localhost-key.pem')
const certPath = resolve(process.cwd(), 'certificates', 'localhost.pem')
const hasHttpsCertificates = existsSync(certKeyPath) && existsSync(certPath)

if (useHttps && !hasHttpsCertificates) {
  console.warn('[vite] VITE_USE_HTTPS=true but certificates are missing. Starting in HTTP mode.')
}

const ROUTES_DATA_PATH = resolve(process.cwd(), 'src', 'assets', 'data', 'routes.json')
const CITIES_DATA_PATH = resolve(process.cwd(), 'src', 'assets', 'data', 'cities.json')

type RouteEntry = { cities?: string[] }
type CityEntry = { id: string; kind?: string }

/**
 * Totals quoted in the loading screen copy, derived from the game data so they
 * never drift from it. A route counts once it has something to type (the same
 * rule as the route picker in GameFlowCoordinator); a stop counts as a town
 * unless it has a `kind` (bridge, ferry, detour, endpoint).
 */
function readDataStats(): { routeCount: number; townCount: number } {
  const routes: RouteEntry[] = JSON.parse(readFileSync(ROUTES_DATA_PATH, 'utf8')).routes
  const cities: CityEntry[] = JSON.parse(readFileSync(CITIES_DATA_PATH, 'utf8')).cities
  const kindById = new Map(cities.map((city) => [city.id, city.kind]))

  const playableRoutes = routes.filter((route) => (route.cities ?? []).length > 0)
  const stopIds = new Set(playableRoutes.flatMap((route) => route.cities ?? []))
  const townCount = [...stopIds].filter((id) => kindById.has(id) && !kindById.get(id)).length

  return { routeCount: playableRoutes.length, townCount }
}

const PUG_MARKER_RE =
  /<template\s+data-type=["']pug["']\s+data-src=["']([^"']+)["']\s*><\/template>/i

function pugHtmlTemplate(): Plugin {
  let root = process.cwd()
  const watchedPugDeps = new Set<string>()

  return {
    name: 'pug-html-template',
    configResolved(config) {
      root = config.root
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const markerMatch = html.match(PUG_MARKER_RE)
        if (!markerMatch) {
          return html
        }

        const srcAttr = markerMatch[1]
        const htmlDir = ctx?.path ? dirname(resolve(root, ctx.path.replace(/^\//, ''))) : root
        const pugPath = resolve(htmlDir, srcAttr)

        const source = readFileSync(pugPath, 'utf8')
        const tracked = pug.compileClientWithDependenciesTracked(source, {
          filename: pugPath,
          basedir: root,
          doctype: 'html',
        })

        watchedPugDeps.clear()
        watchedPugDeps.add(pugPath)
        for (const dependency of tracked.dependencies) {
          watchedPugDeps.add(dependency)
        }

        const rendered = pug.renderFile(pugPath, {
          basedir: root,
          doctype: 'html',
          dataStats: readDataStats(),
        })

        return html.replace(markerMatch[0], rendered)
      },
    },
    handleHotUpdate(ctx) {
      const isPugDep = ctx.file.endsWith('.pug') && watchedPugDeps.has(ctx.file)
      // The page copy quotes totals from these (see `readDataStats`).
      const isDataStatsSource = ctx.file === ROUTES_DATA_PATH || ctx.file === CITIES_DATA_PATH
      if (isPugDep || isDataStatsSource) {
        ctx.server.ws.send({
          type: 'full-reload',
        })
        return []
      }

      return undefined
    },
  }
}

export default defineConfig({
  plugins: [pugHtmlTemplate()],
  // The simplified route geometry ships as a binary blob (see
  // `data/simplify_geometries.py`); Vite does not treat `.bin` as an asset by default.
  assetsInclude: ['**/*.bin'],
  server: {
    https: useHttps && hasHttpsCertificates
      ? {
        key: readFileSync(certKeyPath),
        cert: readFileSync(certPath)
      }
      : false,
    host: true // allows external access
  }
})
