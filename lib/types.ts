import type {
	Contract,
	ContractDefinition,
} from '@balena/jellyfish-types/build/core';

export interface ExecuteData {
	actor: string;
	target: string;
	payload: {
		card: string;
		data:
			| {
					[k: string]: unknown;
			  }
			| string
			| number
			| boolean
			| unknown[]
			| null;
		error: boolean;
		action: string;
		timestamp: string;
		[k: string]: unknown;
	};
	timestamp: string;
	originator?: string;
	[k: string]: unknown;
}

export interface ExecuteContractDefinition
	extends ContractDefinition<ExecuteData> {}

export interface ExecuteContract extends Contract<ExecuteData> {}
