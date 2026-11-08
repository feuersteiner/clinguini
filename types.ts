/** Shared identifying information for commands, flags and positional parameters. */
interface Metadata {
	/** Name used to identify this definition. */
	name: string;
	/** Optional explanation for generated help. */
	description?: string;
}

/** Configuration for a root command, a subcommand or a group of subcommands. */
export interface Command extends Metadata {
	/** Positional string parameters, in the order they appear on the command line. */
	params?: Param[];
	/** Named flags accepted by this command. */
	flags?: Flag[];
	/** Child commands selected by name before positional params; -- forces params. */
	commands?: Command[];
	/** Built-in utility settings for this command. */
	utils?: Utils;
	/** Callback for this command; omitted for command groups without an action. */
	handler?: Handler;
}

/**
 * Handles parsed arguments synchronously or asynchronously.
 * Values are keyed by their configured names; narrow them before use when needed.
 * @param args Parsed positional parameters and flags.
 * @returns Nothing, or a promise that resolves when the command finishes.
 */
export type Handler = (args: {
	/** String values by parameter name; an omitted optional parameter is undefined. */
	params: Record<string, string | undefined>;
	/** Parsed flag values by name; an absent flag may be undefined. */
	flags: Record<string, string | number | boolean | undefined>;
}) => void | Promise<void>;

/** Built-in utilities inherited by children unless overridden. */
interface Utils {
	/** Enable --help / -h; optionally supply the application's help handler. */
	help?: boolean | (() => void | Promise<void>);
	/** Enable the --verbose / -v flag. */
	verbose?: boolean;
	/** Text to print once at startup; child settings override root settings. */
	header?: string;
	/** Root-level overrides for argument errors; handler failures retain their own messages. */
	argumentError?: { message?: string; exitCode?: number };
}

/** Configuration for a named string, number or boolean flag. */
export interface Flag extends Metadata {
	/** Optional single-letter alias, without a leading dash. */
	shortForm?: string;
	/** Value type the argument parser should produce. */
	type: 'string' | 'number' | 'boolean';
	/** Fallback value to parse using type; the factory accepts it without validation. */
	default?: unknown;
}

/** Configuration for one positional string value. */
export interface Param extends Metadata {
	/** Allow the value to be omitted. Parameters are required by default. */
	optional?: boolean;
}
