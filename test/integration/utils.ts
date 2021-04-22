/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
