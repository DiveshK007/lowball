import {
  type CircuitContext,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  pureCircuits,
} from "../managed/lowball/contract/index.js";
import {
  emptyLowballPrivateState,
  type LowballPrivateState,
  witnesses,
} from "../witnesses.js";

export class LowballSimulator {
  readonly contract: Contract<LowballPrivateState>;
  circuitContext: CircuitContext<LowballPrivateState>;

  constructor(privateState: LowballPrivateState = emptyLowballPrivateState()) {
    this.contract = new Contract<LowballPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext(privateState, "0".repeat(64)),
    );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): LowballPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public setPrivateState(newState: LowballPrivateState): void {
    this.circuitContext = {
      ...this.circuitContext,
      currentPrivateState: newState,
    };
  }

  public createDrop(
    dropId: Uint8Array,
    commitment: Uint8Array,
    stock: bigint,
    closeTime: bigint,
    metaRef: string,
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.createDrop(
      this.circuitContext,
      dropId,
      commitment,
      stock,
      closeTime,
      metaRef,
    ).context;
    return this.getLedger();
  }

  public placeBid(dropId: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.placeBid(
      this.circuitContext,
      dropId,
    ).context;
    return this.getLedger();
  }

  public revealReserve(dropId: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.revealReserve(
      this.circuitContext,
      dropId,
    ).context;
    return this.getLedger();
  }

  public checkWin(dropId: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.checkWin(
      this.circuitContext,
      dropId,
    ).context;
    return this.getLedger();
  }
}

export { pureCircuits };
