// Replacement for Bref's cli/index.ts. No import of its bespoke argument parser.
export const brefEntry = `#!/usr/bin/env node
import { clinguini } from 'clinguini';
import { execute } from './commands/execute.js';

const args = process.argv.slice(2);
const message = 'Expected init or add <component>. Use --help for usage.';
const reject = (): never => { throw new Error(message); };
const help = async (): Promise<void> => {
 const [name, option] = args;
 if (!(args.length === 0 ||
       (args.length === 1 && ['help', '--help', '-h'].includes(name)) ||
       (args.length === 2 && ['init', 'add'].includes(name) && ['--help', '-h'].includes(option)))) reject();
 await execute({ name: 'help' }, process.cwd());
};

await clinguini(args, {
 name: 'bref-ui',
 utils: { help, argumentError: { message, exitCode: 1 } },
 commands: [
  { name: 'init', handler: async () => {
   if (args.length !== 1) reject();
   await execute({ name: 'init' }, process.cwd());
  } },
  { name: 'add', params: [{ name: 'componentId' }], handler: async ({ params }) => {
   const componentId = params.componentId;
   if (args.length !== 2 || !componentId || componentId.startsWith('-')) return reject();
   await execute({ name: 'add', componentId }, process.cwd());
  } },
  { name: 'help', handler: help }
 ]
});
`;
