import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import path from 'node:path';
import js from '@eslint/js';
import { defineConfig, globalIgnores, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import { filenameRules, sharedRules } from './eslint-rules.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');
const sourceFiles = ['**/*.{js,mjs,cjs,ts,mts,cts}'];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	globalIgnores(['**/node_modules/**', '**/build/**', '**/dist/**', '**/dist-cli/**']),
	js.configs.recommended,
	ts.configs.recommended,
	prettier,
	{
		files: sourceFiles,
		languageOptions: { globals: globals.node },
		linterOptions: { reportUnusedDisableDirectives: 'error' },
		rules: sharedRules
	},
	{
		files: sourceFiles,
		plugins: { 'check-file': checkFile },
		rules: filenameRules
	}
);
