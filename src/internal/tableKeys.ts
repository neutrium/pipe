/** Object.keys for closed, explicitly typed lookup tables owned by this library. */
export function tableKeys<K extends string>(table: Partial<Record<K, unknown>>): K[]
{
	return Object.keys(table) as K[];
}
