const esbuild = require('esbuild')
const package = require('./package.json')

console.log('external dependencies: ' + JSON.stringify(Object.keys(package.dependencies)))

const formats = [
  { format: 'cjs', extension: '.cjs' },
  { format: 'esm', extension: '.mjs' },
]

for (const f of formats)
  esbuild
    .build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      external: Object.keys(package.dependencies),
      format: f.format,
      outfile: 'build/index' + f.extension,
    })
    .catch(() => process.exit(1))
    .then(() => console.log('Successfully bundled the package in the ' + f.format + ' format'))
