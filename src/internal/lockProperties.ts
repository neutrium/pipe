/** Lock declared fields without preventing subclasses from adding their own fields. */
export function lockProperties(target: object, keys: readonly PropertyKey[]): void
{
	for(const key of keys)
	{
		let owner: object | null = target;
		let descriptor: PropertyDescriptor | undefined;
		while(owner && !(descriptor = Object.getOwnPropertyDescriptor(owner, key)))
		{
			owner = Object.getPrototypeOf(owner);
		}

		if(!descriptor)
		{
			throw new Error('Cannot lock uninitialised property ' + String(key));
		}

		Object.defineProperty(target, key, 'value' in descriptor ?
			{ ...descriptor, writable: false, configurable: false } :
			{ ...descriptor, configurable: false });
	}
}

