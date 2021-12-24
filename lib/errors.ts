import { errors } from '@balena/jellyfish-core';
import { TypedError } from 'typed-error';

export class BaseTypedError
	extends TypedError
	implements errors.JellyfishError
{
	expected: boolean = false;
}

export class QueueInvalidAction extends BaseTypedError {}
export class QueueInvalidRequest extends BaseTypedError {}
export class QueueInvalidSession extends BaseTypedError {}
export class QueueNoRequest extends BaseTypedError {}
export class QueueServiceError extends BaseTypedError {}
