interface Metadata {
	name: string;
	description?: string;
}

export interface Command extends Metadata {
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

export interface Flag extends Metadata {
	shortForm?: string;
	type: 'string' | 'number' | 'boolean';
	default?: unknown;
}

export interface Param extends Metadata {
	optional?: boolean;
}
