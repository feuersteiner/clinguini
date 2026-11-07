export interface Clinguini {
	name: string;
	description?: string;
	commands?: readonly Command[];
	utils?: Utils;
}

export interface Command<
	Params extends readonly Param[] = readonly Param[],
	Flags extends readonly Flag[] = readonly Flag[]
> {
	name: string;
	description?: string;
	params?: Params;
	flags?: Flags;
	commands?: readonly Command[];
	utils?: Utils;
	handler?(args: ParsedArgs<NoInfer<Params>, NoInfer<Flags>>): void | Promise<void>;
}

interface Utils {
	help?: boolean;
	verbose?: boolean;
	header?: string;
	color?: 'auto' | 'always' | 'never';
}

interface FlagBase {
	name: string;
	description?: string;
	shortForm?: string;
}

export type Flag = FlagBase &
	(
		| { type: 'string'; default?: string }
		| { type: 'number'; default?: number }
		| { type: 'boolean'; default?: never }
	);

export interface Param {
	name: string;
	type: 'string';
	description?: string;
	optional?: boolean;
	variadic?: boolean;
}

interface Values {
	string: string;
	number: number;
	boolean: boolean;
}

export interface ParsedArgs<Params extends readonly Param[], Flags extends readonly Flag[]> {
	params: {
		[P in Params[number] as P['name']]: P extends { variadic: true }
			? string[]
			: P extends { optional: true }
				? string | undefined
				: string;
	};
	flags: {
		[F in Flags[number] as F['name']]: F extends { type: 'boolean' } | { default: string | number }
			? Values[F['type']]
			: Values[F['type']] | undefined;
	};
}
