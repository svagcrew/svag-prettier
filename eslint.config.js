const getSvagEslintNodeConfigs = require('svag-lint/configs/node')

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  ...getSvagEslintNodeConfigs({
    ignores: [],
  }),
  {
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
]
