export function attempt<T>(cb: () => T): T | undefined;
export function attempt<T>(cb: () => Promise<T>): Promise<T | undefined>;
export function attempt<T>(
	cb: () => T | Promise<T>,
): T | Promise<T | undefined> | undefined {
	try {
		const res = cb();
		if (res && typeof (res as Promise<T>).then === 'function') {
			return (res as Promise<T>).then((v) => v).catch(() => undefined);
		}
		return res as T;
	} catch {
		return undefined;
	}
}

export const attemptCB =
	<T extends (...args: unknown[]) => unknown>(cb: T) =>
	(...args: Parameters<T>) =>
		attempt(() => cb(...args));
