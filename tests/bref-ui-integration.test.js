import { test } from 'node:test';
import { prepareBref } from './bref-ui-fixture.js';
import { checkArguments, checkProcesses } from './bref-ui-parity.js';

test(
	'Bref unchanged CLI suite passes against its original and clinguini executables',
	{
		skip: !process.env.BREF_UI_DIR && 'Set BREF_UI_DIR to a bref-ui checkout'
	},
	async (context) => {
		const bref = prepareBref(context);
		bref.runSuite();
		bref.replaceEntry();
		bref.runSuite();
		checkProcesses(bref);
		context.diagnostic(`${await checkArguments(bref)} argument cases match the original CLI`);
	}
);
