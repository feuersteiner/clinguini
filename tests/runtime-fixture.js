/** Capture runtime output and restore the caller's exit code after every request. */
export const capture = async (run) => {
	const stdout = [];
	const stderr = [];
	const log = console.log;
	const error = console.error;
	const exitCode = process.exitCode;
	console.log = (...values) => stdout.push(values.join(' '));
	console.error = (...values) => stderr.push(values.join(' '));
	process.exitCode = 0;
	try {
		await run();
		return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode: process.exitCode };
	} finally {
		console.log = log;
		console.error = error;
		process.exitCode = exitCode;
	}
};
