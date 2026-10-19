// Leva o contrato para dentro de public/, que é o que o Vite publica.
// A fonte única continua sendo contrato/openapi.yaml.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = resolve(root, 'contrato/openapi.yaml')
const to = resolve(root, 'public/openapi.yaml')

mkdirSync(dirname(to), { recursive: true })
copyFileSync(from, to)
console.log('contrato -> public/openapi.yaml')
