import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import pug from 'pug'
import { defineConfig, type Plugin } from 'vite'

const PUG_MARKER_RE =
  /<template\s+data-type=["']pug["']\s+data-src=["']([^"']+)["']\s*><\/template>/i

function pugHtmlTemplate(): Plugin {
  let root = process.cwd()
  const watchedPugDeps = new Set<string>()
  const pugLocals = {}

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
          ...pugLocals,
        })

        return html.replace(markerMatch[0], rendered)
      },
    },
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.pug') && watchedPugDeps.has(ctx.file)) {
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
})
