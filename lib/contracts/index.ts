import { action } from './action';
import { actionRequest } from './action-request';
import { execute } from './execute';

export const contracts = {
	action,
	'action-request': actionRequest,
	execute,
};
