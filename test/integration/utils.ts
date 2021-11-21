import { v4 as uuid } from 'uuid';

export const generateRandomID = (): string => {
	return uuid();
};

export const generateRandomSlug = (
	options: { prefix?: string } = {},
): string => {
	const slug = generateRandomID();
	if (options.prefix) {
		return `${options.prefix}-${slug}`;
	}

	return slug;
};
