import type { Command } from '../index.ts';

// bref-ui core/cli/commands/{parse,types}.ts at 7096f75.
// Component ID validation and automatic help belong to its CLI implementation.
export const brefUi = {
	name: 'bref-ui',
	utils: { help: true },
	commands: [{ name: 'init' }, { name: 'add', params: [{ name: 'componentId' }] }, { name: 'help' }]
} satisfies Command;

// agent-tests README.md "Get started (WIP)" at 5e5d90c.
// Its current executable is a Hello World stub, not an implemented CLI oracle.
export const agentTests = {
	name: 'agent-tests',
	commands: [
		{ name: 'init' },
		{ name: 'add', params: [{ name: 'id' }, { name: 'targetDir', optional: true }] },
		{ name: 'validate', params: [{ name: 'id' }] },
		{ name: 'list' },
		{ name: 'targets', params: [{ name: 'id' }] },
		{ name: 'eval', params: [{ name: 'id' }] },
		{
			name: 'run',
			flags: [
				{ name: 'changed', type: 'boolean' },
				{ name: 'staged', type: 'boolean' },
				{ name: 'base', type: 'string' }
			]
		},
		{ name: 'docs' },
		{ name: 'vote', params: [{ name: 'id' }] }
	]
} satisfies Command;
