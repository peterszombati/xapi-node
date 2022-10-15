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
      target: 'node16',
      define: {
        'process.env.ES_TARGET': '"' + f.format + '"',
      },
    })
    .catch(e => {
      console.log(e)
    })
    .then(() => console.log('Successfully bundled the package in the ' + f.format + ' format'))