import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum DropStatus { UNSET = 0, OPEN = 1, REVEALED = 2 }

export type Witnesses<PS> = {
  bidAmountWitness(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  bidderSecretWitness(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  reserveWitness(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  saltWitness(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  createDrop(context: __compactRuntime.CircuitContext<PS>,
             commitment__0: Uint8Array,
             stock__0: bigint,
             closeTime__0: bigint,
             metaRef__0: string): __compactRuntime.CircuitResults<PS, []>;
  placeBid(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revealReserve(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  checkWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  createDrop(context: __compactRuntime.CircuitContext<PS>,
             commitment__0: Uint8Array,
             stock__0: bigint,
             closeTime__0: bigint,
             metaRef__0: string): __compactRuntime.CircuitResults<PS, []>;
  placeBid(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revealReserve(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  checkWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  bidHash(amount_0: bigint, secret_0: Uint8Array): Uint8Array;
  reserveHash(reserve_0: bigint, salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  bidHash(context: __compactRuntime.CircuitContext<PS>,
          amount_0: bigint,
          secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  reserveHash(context: __compactRuntime.CircuitContext<PS>,
              reserve_0: bigint,
              salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  createDrop(context: __compactRuntime.CircuitContext<PS>,
             commitment__0: Uint8Array,
             stock__0: bigint,
             closeTime__0: bigint,
             metaRef__0: string): __compactRuntime.CircuitResults<PS, []>;
  placeBid(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revealReserve(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  checkWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly status: DropStatus;
  readonly commitment: Uint8Array;
  readonly stock: bigint;
  readonly closeTime: bigint;
  readonly metaRef: string;
  readonly bidCount: bigint;
  readonly latestBidCommitment: Uint8Array;
  readonly revealedReserve: bigint;
  readonly winnerFound: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
