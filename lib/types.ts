import type { LogContext } from '@balena/jellyfish-logger';
import type {
	Contract,
	ContractDefinition,
} from '@balena/jellyfish-types/build/core';

export interface ActionRequestData {
	actor: string;
	epoch: number;
	input: {
		id: string;
		[k: string]: unknown;
	};
	action: string;
	logContext: LogContext;
	arguments: {
		[k: string]: unknown;
	};
	timestamp: string;
	originator?: string;
	[k: string]: unknown;
}

export interface ActionRequestContractDefinition
	extends ContractDefinition<ActionRequestData> {}

export interface ActionRequestContract extends Contract<ActionRequestData> {}
