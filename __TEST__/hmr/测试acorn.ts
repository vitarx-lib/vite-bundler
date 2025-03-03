import { parse } from 'acorn'

parse('class {}', {
  ecmaVersion: 'latest',
  sourceType: 'module'
})
