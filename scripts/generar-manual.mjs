// Convierte docs/manual-de-uso.md en docs/manual-de-uso.html, listo para abrir e imprimir.
// Uso: node scripts/generar-manual.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { marked } from 'marked'

const md = readFileSync('docs/manual-de-uso.md', 'utf8')
const cuerpo = marked.parse(md)

const html = `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manual de uso · El Apache Bebidas</title>
<style>
  :root { --azul: #1F5AC8; --azul-oscuro: #103A8B; --amarillo: #F5B301; --tinta: #16161D; --gris: #4B5565; --borde: #E7EAF0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: var(--tinta); line-height: 1.55; font-size: 15px; background: #fff; }
  main { max-width: 820px; margin: 0 auto; padding: 32px 24px 64px; }
  h1 { color: var(--azul-oscuro); font-size: 30px; margin: 0 0 6px; border-bottom: 4px solid var(--amarillo); padding-bottom: 10px; }
  h2 { color: var(--azul); font-size: 21px; margin: 34px 0 10px; page-break-after: avoid; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  p, li { color: var(--tinta); }
  hr { border: 0; border-top: 1px solid var(--borde); margin: 28px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
  th, td { border: 1px solid var(--borde); padding: 6px 10px; text-align: left; }
  th { background: #EEF3FF; color: var(--azul-oscuro); }
  td:not(:first-child), th:not(:first-child) { text-align: center; }
  code { background: #F3F5F9; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
  strong { color: var(--tinta); }
  a { color: var(--azul); }
  @media print {
    @page { size: A4; margin: 16mm; }
    main { padding: 0; max-width: none; }
    h2 { page-break-before: auto; }
    table, li { page-break-inside: avoid; }
    a { text-decoration: none; color: inherit; }
  }
</style>
</head>
<body>
<main>
${cuerpo}
</main>
</body>
</html>
`
writeFileSync('docs/manual-de-uso.html', html)
console.log('Manual generado en docs/manual-de-uso.html')
