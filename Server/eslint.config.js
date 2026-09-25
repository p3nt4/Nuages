module.exports = [
  {
    ignores: ['**/node_modules/**'],
  },
  {
    files: ['src/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        Buffer: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', {
        args: 'none',
        vars: 'all',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_|^options$|^hook$|^data$|^e$|^err$|^error$|^pipe$'
      }],
    },
  },
];
