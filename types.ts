export interface Command {
	name: string;
	description?: string;
	params?: Param[];
	flags?: Flag[];
	commands?: Command[];
	utils?: Utils;
	handler?: Handler;
}

export type Handler = (args: {
	params: Record<string, string | undefined>;
	flags: Record<string, string | number | boolean | undefined>;
}) => void | Promise<void>;

interface Utils {
	help?: boolean;
	verbose?: boolean;
	header?: string;
}

export interface Flag {
	name: string;
	description?: string;
	shortForm?: string;
	type: 'string' | 'number' | 'boolean';
	default?: unknown;
}

export interface Param {
	name: string;
	description?: string;
	optional?: boolean;
}
