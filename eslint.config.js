import tseslint from 'typescript-eslint';

export default [
  {
    files: ['src/**/core/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/render',
                '**/render/**',
                '**/audio',
                '**/audio/**',
                '**/main',
                '**/main/**',
              ],
              message:
                'core/** is the pure layer and must not import from the render, audio, or main layers.',
            },
          ],
        },
      ],
    },
  },
];
