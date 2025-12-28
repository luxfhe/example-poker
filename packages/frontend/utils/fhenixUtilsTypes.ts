import {
  type EncryptedBool,
  type EncryptedUint8,
  type EncryptedUint16,
  type EncryptedUint32,
  type EncryptedUint64,
  type EncryptedUint128,
  type EncryptedUint256,
  type EncryptedAddress,
  Permission,
  FhenixClientSync,
  EncryptedNumber,
} from "fhenixjs";
import { Primitive } from "type-fest";

// Permission

export interface DFhenixPermission extends Permission {
  type: "fhenix-permission";
}

/**
 * Used as a placeholder to be replaced with a Fhenix `Permission` signed object.
 *
 * _For use with utility fhenix call hooks (eg. useFhenixScaffoldContractWrite)._
 */
export const InjectFhenixPermission = "inject-fhenix-permission" as const;

type FhenixPermissionTypeMap<E extends FhenixUtilsTypeModificationOption = "raw"> = E extends "raw"
  ? Permission
  : typeof InjectFhenixPermission;

// Encryptable Primitives

export const EncryptablePrimitive = {
  Uint8: "uint8",
  Uint16: "uint16",
  Uint32: "uint32",
  Uint64: "uint64",
  Uint128: "uint128",
  Uint256: "uint256",
  Address: "address",
  Bool: "bool",
} as const;

export type EncryptFunction<T extends EncryptedNumber> = <C extends FhenixClientSync | undefined>(
  fhenixClient: C,
) => C extends undefined ? undefined : T;

export type EncryptableBase = {
  readonly type: "fhenix-encryptable-input-primitive";
  securityZone?: number;
};

export type EncryptableBool = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Bool;
  value: boolean;
  /**
   * Encrypt this **SealableBool** into an **EncryptedBool (inEbool)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedBool (FHE.sol :: inEbool)**
   */
  encrypt: EncryptFunction<EncryptedBool>;
};

export type EncryptableUint8 = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Uint8;
  value: bigint | number | string;
  /**
   * Encrypt this **SealableUint8** into an **EncryptedUint8 (inEuint8)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedUint8 (FHE.sol :: inEuint8)**
   */
  encrypt: EncryptFunction<EncryptedUint8>;
};

export type EncryptableUint16 = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Uint16;
  value: bigint | number | string;
  /**
   * Encrypt this **SealableUint16** into an **EncryptedUint16 (inEuint16)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedUint16 (FHE.sol :: inEuint16)**
   */
  encrypt: EncryptFunction<EncryptedUint16>;
};

export type EncryptableUint32 = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Uint32;
  value: bigint | number | string;
  /**
   * Encrypt this **SealableUint32** into an **EncryptedUint32 (inEuint32)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedUint32 (FHE.sol :: inEuint32)**
   */
  encrypt: EncryptFunction<EncryptedUint32>;
};

export type EncryptableUint64 = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Uint64;
  value: bigint | number | string;
  /**
   * Encrypt this **SealableUint64** into an **EncryptedUint64 (inEuint64)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedUint64 (FHE.sol :: inEuint64)**
   */
  encrypt: EncryptFunction<EncryptedUint64>;
};

export type EncryptableUint128 = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Uint128;
  value: bigint | number | string;
  /**
   * Encrypt this **SealableUint128** into an **EncryptedUint128 (inEuint128)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedUint128 (FHE.sol :: inEuint128)**
   */
  encrypt: EncryptFunction<EncryptedUint128>;
};

export type EncryptableUint256 = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Uint256;
  value: bigint | number | string;
  /**
   * Encrypt this **SealableUint256** into an **EncryptedUint256 (inEuint32)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedUint256 (FHE.sol :: inEuint32)**
   */
  encrypt: EncryptFunction<EncryptedUint256>;
};

export type EncryptableAddress = EncryptableBase & {
  readonly subtype: typeof EncryptablePrimitive.Address;
  value: `0x${string}`;
  /**
   * Encrypt this **SealableAddress** into an **EncryptedAddress (inAddress)**
   * to be passed securely into Fhenix FHE powered contracts.
   * @param {FhenixClientSync | undefined } fhenixClient - Client performing the encryption
   * @returns **EncryptedAddress (FHE.sol :: inAddress)**
   */
  encrypt: EncryptFunction<EncryptedAddress>;
};

export type EncryptableItem =
  | EncryptableBool
  | EncryptableUint8
  | EncryptableUint16
  | EncryptableUint32
  | EncryptableUint64
  | EncryptableUint128
  | EncryptableUint256
  | EncryptableAddress;

export type EncryptedPrimitiveMap = {
  [EncryptablePrimitive.Bool]: EncryptedBool;
  [EncryptablePrimitive.Uint8]: EncryptedUint8;
  [EncryptablePrimitive.Uint16]: EncryptedUint16;
  [EncryptablePrimitive.Uint32]: EncryptedUint32;
  [EncryptablePrimitive.Uint64]: EncryptedUint64;
  [EncryptablePrimitive.Uint128]: EncryptedUint128;
  [EncryptablePrimitive.Uint256]: EncryptedUint256;
  [EncryptablePrimitive.Address]: EncryptedAddress;
};

export type EncryptedItem<T> = T extends EncryptableItem ? EncryptedPrimitiveMap[T["subtype"]] : T;

// Discriminated versions

interface DEncryptedBool extends EncryptedBool {
  type: typeof EncryptablePrimitive.Bool;
}
interface DEncryptedUint8 extends EncryptedUint8 {
  type: typeof EncryptablePrimitive.Uint8;
}
interface DEncryptedUint16 extends EncryptedUint16 {
  type: typeof EncryptablePrimitive.Uint16;
}
interface DEncryptedUint32 extends EncryptedUint32 {
  type: typeof EncryptablePrimitive.Uint32;
}
interface DEncryptedUint64 extends EncryptedUint64 {
  type: typeof EncryptablePrimitive.Uint64;
}
interface DEncryptedUint128 extends EncryptedUint128 {
  type: typeof EncryptablePrimitive.Uint128;
}
interface DEncryptedUint256 extends EncryptedUint256 {
  type: typeof EncryptablePrimitive.Uint256;
}
interface DEncryptedAddress extends EncryptedAddress {
  type: typeof EncryptablePrimitive.Address;
}

type DEncryptedItem =
  | DEncryptedBool
  | DEncryptedUint8
  | DEncryptedUint16
  | DEncryptedUint32
  | DEncryptedUint64
  | DEncryptedUint128
  | DEncryptedUint256
  | DEncryptedAddress;

export interface DEncryptedInputTypes {
  [EncryptablePrimitive.Bool]: DEncryptedBool;
  [EncryptablePrimitive.Uint8]: DEncryptedUint8;
  [EncryptablePrimitive.Uint16]: DEncryptedUint16;
  [EncryptablePrimitive.Uint32]: DEncryptedUint32;
  [EncryptablePrimitive.Uint64]: DEncryptedUint64;
  [EncryptablePrimitive.Uint128]: DEncryptedUint128;
  [EncryptablePrimitive.Uint256]: DEncryptedUint256;
  [EncryptablePrimitive.Address]: DEncryptedAddress;
}

export type FhenixUtilsTypeModificationOption = "raw" | "fhenix-utils-modified";

type EncryptableInputTypeMap<E extends FhenixUtilsTypeModificationOption = "raw"> = {
  [EncryptablePrimitive.Bool]: E extends "raw" ? EncryptedBool : EncryptableBool;
  [EncryptablePrimitive.Uint8]: E extends "raw" ? EncryptedUint8 : EncryptableUint8;
  [EncryptablePrimitive.Uint16]: E extends "raw" ? EncryptedUint16 : EncryptableUint16;
  [EncryptablePrimitive.Uint32]: E extends "raw" ? EncryptedUint32 : EncryptableUint32;
  [EncryptablePrimitive.Uint64]: E extends "raw" ? EncryptedUint64 : EncryptableUint64;
  [EncryptablePrimitive.Uint128]: E extends "raw" ? EncryptedUint128 : EncryptableUint128;
  [EncryptablePrimitive.Uint256]: E extends "raw" ? EncryptedUint256 : EncryptableUint256;
  [EncryptablePrimitive.Address]: E extends "raw" ? EncryptedAddress : EncryptableAddress;
};

type FhenixMappedInputType<T, E extends FhenixUtilsTypeModificationOption = "raw"> = T extends DFhenixPermission
  ? FhenixPermissionTypeMap<E>
  : T extends DEncryptedItem
  ? EncryptableInputTypeMap<E>[T["type"]]
  : FhenixMappedInputTypes<T, E>;

export type FhenixMappedInputTypes<T, E extends FhenixUtilsTypeModificationOption = "raw"> = {
  [K in keyof T]: FhenixMappedInputType<T[K], E>;
};

// Discriminated Sealed Values

const TFHE_EUINT8 = 0;
const TFHE_EUINT16 = 1;
const TFHE_EUINT32 = 2;
const TFHE_EUINT64 = 3;
const TFHE_EUINT128 = 4;
const TFHE_EUINT256 = 5;
const TFHE_EADDRESS = 12;
const TFHE_EBOOL = 13;

export const TFHE_UTYPE = {
  EUINT8: TFHE_EUINT8,
  EUINT16: TFHE_EUINT16,
  EUINT32: TFHE_EUINT32,
  EUINT64: TFHE_EUINT64,
  EUINT128: TFHE_EUINT128,
  EUINT256: TFHE_EUINT256,
  EADDRESS: TFHE_EADDRESS,
  EBOOL: TFHE_EBOOL,
  EUINT: [TFHE_EUINT8, TFHE_EUINT16, TFHE_EUINT32, TFHE_EUINT64, TFHE_EUINT128, TFHE_EUINT256],
  ALL: [TFHE_EBOOL, TFHE_EUINT8, TFHE_EUINT16, TFHE_EUINT32, TFHE_EUINT64, TFHE_EUINT128, TFHE_EUINT256, TFHE_EADDRESS],
} as const;

interface SealedOutputBool {
  data: string;
  utype: typeof TFHE_UTYPE.EBOOL;
}
interface SealedOutputUint {
  data: string;
  utype: (typeof TFHE_UTYPE.EUINT)[number];
}
interface SealedOutputAddress {
  data: `0x${string}`;
  utype: typeof TFHE_UTYPE.EADDRESS;
}
interface DSealedOutputBase {
  data: string;
  type: "fhenix-sealed-output";
}
export type DSealedOutputBool = SealedOutputBool & DSealedOutputBase;
export type DSealedOutputUint = SealedOutputUint & DSealedOutputBase;
export type DSealedOutputAddress = SealedOutputAddress & DSealedOutputBase;

export type DSealedOutputItem = DSealedOutputBool | DSealedOutputUint | DSealedOutputAddress;

export interface DSealedOutputTypes {
  bool: DSealedOutputBool;
  uint: DSealedOutputUint;
  address: DSealedOutputAddress;
}

type AbiOutputPrimitive = string | number | bigint | boolean | undefined;

export type FhenixMappedOutputTypes<
  T,
  E extends FhenixUtilsTypeModificationOption = "raw",
> = T extends AbiOutputPrimitive
  ? T
  : T extends DSealedOutputBool
  ? E extends "raw"
    ? SealedOutputBool
    : boolean
  : T extends DSealedOutputUint
  ? E extends "raw"
    ? SealedOutputUint
    : bigint
  : T extends DSealedOutputAddress
  ? E extends "raw"
    ? SealedOutputAddress
    : `0x${string}`
  : {
      [K in keyof T]: FhenixMappedOutputTypes<T[K], E>;
    };
