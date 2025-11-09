export function attempt<T, E = undefined>(
	cb: () => T,
	catchCb?: (error: unknown) => E,
): T | E;
export function attempt<T, E = undefined>(
	cb: () => Promise<T>,
	catchCb?: (error: unknown) => E,
): Promise<T | E>;
export function attempt<T, E = undefined>(
	cb: () => T | Promise<T>,
	catchCb?: (error: unknown) => E,
): T | E | Promise<T | E> {
	try {
		const res = cb();
		if (res && typeof (res as Promise<T>).then === 'function') {
			return (res as Promise<T>).then((v) => v).catch((e) => catchCb?.(e) as E);
		}
		return res as T;
	} catch (error) {
		return catchCb?.(error) as E;
	}
}

export const attemptCB =
	<R, T extends (...args: unknown[]) => R | Promise<R>, E = undefined>(
		cb: T,
		catchCb?: (error: unknown) => E,
	) =>
	(...args: Parameters<T>) =>
		attempt(() => cb(...args), catchCb);
