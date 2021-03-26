/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as events from './events';

describe('getExecuteEventSlug', () => {
	test('generates a valid slug', () => {
		const eventSlug = events.getExecuteEventSlug({
			id: 'test',
		});
		expect(eventSlug).toBe('execute-test');
	});
});
