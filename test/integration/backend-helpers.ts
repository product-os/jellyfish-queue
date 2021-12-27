// TODO: Deep importing core modules in this way is an abomination
import { defaultEnvironment } from '@balena/jellyfish-environment';
import { LogContext } from '@balena/jellyfish-logger';
import { v4 as uuidv4 } from 'uuid';
import * as utils from './utils';
import { Kernel, Cache } from '@balena/jellyfish-core';

export interface BackendTestContext {
	logContext: LogContext;
	cache: Cache;
	kernel: Kernel;

	generateRandomSlug: typeof utils.generateRandomSlug;
	generateRandomID: typeof utils.generateRandomID;
}

export const before = async (): Promise<BackendTestContext> => {
	const dbName = `test_${uuidv4().replace(/-/g, '_')}`;
	const logContext = {
		id: `CORE-TEST-${uuidv4()}`,
	};
	const cache = new Cache(
		Object.assign({}, defaultEnvironment.redis, {
			namespace: dbName,
		}),
	);
	await cache.connect();
	const kernel = await Kernel.withPostgres(
		logContext,
		cache,
		Object.assign({}, defaultEnvironment.database.options, {
			database: dbName,
		}),
	);

	return {
		logContext,
		cache,
		kernel,

		generateRandomSlug: utils.generateRandomSlug,
		generateRandomID: utils.generateRandomID,
	};
};

export const after = async (context: BackendTestContext): Promise<void> => {
	await context.kernel.drop(context.logContext);
	await context.kernel.disconnect(context.logContext);
	await context.cache.disconnect();
};
