import { getExecuteEventSlug } from './events';

describe('getExecuteEventSlug', () => {
	test('generates a valid slug', () => {
		const eventSlug = getExecuteEventSlug({
			id: 'test',
		});
		expect(eventSlug).toBe('execute-test');
	});
});
