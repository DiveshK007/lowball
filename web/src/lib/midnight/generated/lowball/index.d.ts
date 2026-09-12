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
             dropId__0: Uint8Array,
             commitment__0: Uint8Array,
             stock__0: bigint,
             closeTime__0: bigint,
             metaRef__0: string): __compactRuntime.CircuitResults<PS, []>;
  placeBid(context: __compactRuntime.CircuitContext<PS>, dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealReserve(context: __compactRuntime.CircuitContext<PS>,
                dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkWin(context: __compactRuntime.CircuitContext<PS>, dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  createDrop(context: __compactRuntime.CircuitContext<PS>,
             dropId__0: Uint8Array,
             commitment__0: Uint8Array,
             stock__0: bigint,
             closeTime__0: bigint,
             metaRef__0: string): __compactRuntime.CircuitResults<PS, []>;
  placeBid(context: __compactRuntime.CircuitContext<PS>, dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealReserve(context: __compactRuntime.CircuitContext<PS>,
                dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkWin(context: __compactRuntime.CircuitContext<PS>, dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
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
             dropId__0: Uint8Array,
             commitment__0: Uint8Array,
             stock__0: bigint,
             closeTime__0: bigint,
             metaRef__0: string): __compactRuntime.CircuitResults<PS, []>;
  placeBid(context: __compactRuntime.CircuitContext<PS>, dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealReserve(context: __compactRuntime.CircuitContext<PS>,
                dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkWin(context: __compactRuntime.CircuitContext<PS>, dropId__0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  dropStatus: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): DropStatus;
    [Symbol.iterator](): Iterator<[Uint8Array, DropStatus]>
  };
  dropCommitment: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  dropStock: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  dropCloseTime: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  dropMetaRef: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): string;
    [Symbol.iterator](): Iterator<[Uint8Array, string]>
  };
  dropBidCount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { read(): bigint }
  };
  dropLatestBid: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  dropRevealed: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  dropWinnerFound: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly dropCount: bigint;
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
