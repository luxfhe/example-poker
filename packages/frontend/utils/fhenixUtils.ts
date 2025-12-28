import { EncryptedNumber, FhenixClientSync } from "fhenixjs";
import {
  EncryptablePrimitive,
  EncryptableBool,
  EncryptableUint8,
  EncryptableUint16,
  EncryptableUint32,
  EncryptableUint64,
  EncryptableUint128,
  EncryptableUint256,
  EncryptableAddress,
  EncryptableItem,
  TFHE_UTYPE,
  EncryptedItem,
  DSealedOutputBool,
  DSealedOutputUint,
  DSealedOutputAddress,
  FhenixMappedOutputTypes,
} from "./fhenixUtilsTypes";
import { toHex } from "viem";

function hexlifyData<T extends EncryptedNumber>(t: T): T {
  return {
    ...t,
    data: toHex(t.data),
  };
}

function isEncryptablePrimitive(item: unknown): item is EncryptableItem {
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    return (
      obj.type === "fhenix-encryptable-input-primitive" &&
      (typeof obj.securityZone === "undefined" || typeof obj.securityZone === "number")
    );
  }
  return false;
}

/**
 * Encrypting option for any data type *(including nested data structures)*. Any EncryptableItems will be encrypted into the Fhenix FHE ready form.
 *
 * ```
 * encrypt([EncryptableUint8, number, { a: EncryptableBool, b: string }]);
 * // [EncryptedUint8, number, { a: EncryptedBool, b: string }]
 *
 * encrypt(EncryptableAddress)
 * // EncryptedAddress
 * ```
 *
 * @param item - Item to be encrypted, nested datatypes will be traversed and children encrypted.
 * @param fhenixClient
 * @returns - Item with self and children encrypted
 */
function encrypt<T>(item: T, fhenixClient: FhenixClientSync | undefined): EncryptedItem<T> | undefined {
  if (fhenixClient == null) return undefined;

  // Check if the item is a EncryptableBase and return 'encrypted'
  if (isEncryptablePrimitive(item)) {
    return item.encrypt(fhenixClient) as EncryptedItem<T>;
  }

  // If the item is an array, recursively process each element
  if (Array.isArray(item)) {
    return item.map(nestedItem => encrypt(nestedItem, fhenixClient)) as EncryptedItem<T>;
  }

  // If the item is an object, recursively process each property
  if (typeof item === "object" && item !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, nestedItem] of Object.entries(item)) {
      result[key] = encrypt(nestedItem, fhenixClient);
    }
    return result as EncryptedItem<T>;
  }

  // If the item is neither encryptable nor nested, return the item unchanged
  return item as EncryptedItem<T>;
}

/**
 * Create `EncryptableBool`, encrypts to `EncryptedBool (inEbool)`
 */
const createEncryptableBool = (value: boolean, securityZone = 0): EncryptableBool => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Bool,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_bool(this.value));
    },
  };
};

/**
 * Create `EncryptableUint8`, encrypts to `EncryptedUint8 (inEuint8)`
 */
const createEncryptableUint8 = (value: bigint | number | string, securityZone = 0): EncryptableUint8 => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Uint8,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_uint8(Number(this.value)));
    },
  };
};

/**
 * Create `EncryptableUint16`, encrypts to `EncryptedUint16 (inEuint16)`
 */
const createEncryptableUint16 = (value: bigint | number | string, securityZone = 0): EncryptableUint16 => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Uint16,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_uint16(Number(this.value)));
    },
  };
};

/**
 * Create `EncryptableUint32`, encrypts to `EncryptedUint32 (inEuint32)`
 */
const createEncryptableUint32 = (value: bigint | number | string, securityZone = 0): EncryptableUint32 => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Uint32,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_uint32(Number(this.value)));
    },
  };
};

/**
 * Create `EncryptableUint64`, encrypts to `EncryptedUint64 (inEuint64)`
 */
const createEncryptableUint64 = (value: bigint | number | string, securityZone = 0): EncryptableUint64 => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Uint64,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_uint64(BigInt(this.value)));
    },
  };
};

/**
 * Create `EncryptableUint128`, encrypts to `EncryptedUint128 (inEuint128)`
 */
const createEncryptableUint128 = (value: bigint | number | string, securityZone = 0): EncryptableUint128 => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Uint128,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_uint128(BigInt(this.value)));
    },
  };
};

/**
 * Create `EncryptableUint256`, encrypts to `EncryptedUint256 (inEuint256)`
 */
const createEncryptableUint256 = (value: bigint | number | string, securityZone = 0): EncryptableUint256 => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Uint256,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_uint256(BigInt(this.value)));
    },
  };
};

/**
 * Create `EncryptableAddress`, encrypts to `EncryptedAddress (inEaddress)`
 */
const createEncryptableAddress = (value: `0x${string}`, securityZone = 0): EncryptableAddress => {
  return {
    type: "fhenix-encryptable-input-primitive",
    securityZone,
    subtype: EncryptablePrimitive.Address,
    value,
    // @ts-expect-error Discriminating not working well
    encrypt: function (fhenixClient) {
      if (fhenixClient == null) return undefined;
      return hexlifyData(fhenixClient.encrypt_address(this.value));
    },
  };
};

/**
 * **Convenience functions for creating and encrypting values to be passed to Fhenix FHE powered smart contracts.**
 *
 * Usage:
 *
 * ```
 * const n: EncryptableUint8 = Encryptable.uint8(5);
 * const e: EncryptedUint8 = n.encrypt(client);
 * ```
 */
export const Encryptable = {
  // Create
  bool: createEncryptableBool,
  uint8: createEncryptableUint8,
  uint16: createEncryptableUint16,
  uint32: createEncryptableUint32,
  uint64: createEncryptableUint64,
  uint128: createEncryptableUint128,
  uint256: createEncryptableUint256,
  address: createEncryptableAddress,

  encrypt,
};

// const fhenixClient = {} as any;

// const encryptableUint8Narrowed = createEncryptableUint8<string>("5");
// const encryptedUint8Narrowed = encryptEncryptable(encryptableUint8Narrowed, fhenixClient);

// const encryptableUint8 = createEncryptableUint8("5");
// const encryptedUint8 = encryptEncryptable(encryptableUint8, fhenixClient);

// const encryptableBool = createEncryptableBool(false);
// const encryptedBool = encryptEncryptable(encryptableBool, fhenixClient);

// const encryptableObject = createEncryptableObject({ a: 5, b: createEncryptableUint8(5n) });
// const encryptedObject = encryptEncryptable(encryptableObject, fhenixClient);

// const encryptableObjectInObject = createEncryptableObject({
//   a: 5,
//   b: createEncryptableUint8(5n),
//   c: createEncryptableObject({ a: "hello", b: createEncryptableBool(false) }),
// });
// const encryptedObjectInObject = encryptEncryptable(encryptableObjectInObject, fhenixClient);

// const encryptableArray = createEncryptableArray([5, createEncryptableUint8(5n)]);
// const encryptedArray = encryptEncryptable(encryptableArray, fhenixClient);

// const encryptableArrayInArray = createEncryptableArray([
//   5,
//   createEncryptableUint8(5n),
//   createEncryptableArray(["hello", createEncryptableBool(false)]),
// ]);
// const encryptedArrayInArray = encryptEncryptable(encryptableArrayInArray, fhenixClient);

// const encryptableArrayInObject = createEncryptableObject({
//   a: 5,
//   b: createEncryptableUint8(5n),
//   c: createEncryptableArray(["hello", createEncryptableBool(false)]),
// });
// const encryptedArrayInObject = encryptEncryptable(encryptableArrayInObject, fhenixClient);

// const encryptableObjectInArray = Encryptable.array([
//   5,
//   Encryptable.uint8("5"),
//   Encryptable.uint8<bigint>(5n),
//   Encryptable.object({
//     a: 5,
//     b: Encryptable.bool(false),
//   }),
// ]);

/*

  const encryptableObjectInArray: EncryptableArray<[
    number,
    EncryptableUint8<string | number | bigint>,
    EncryptableUint8<bigint>,
    EncryptableObject<{
      a: number;
      b: EncryptableBool;
    }>
  ]>

*/

// const encryptedObjectInArray = await Encryptable.encrypt(encryptableObjectInArray, fhenixClient);

/*

  const encryptedObjectInArray: [
    number,
    EncryptedUint8,
    EncryptedUint8,
    {
      a: number;
      b: EncryptedBool;
    }
  ]

*/

// UNSEALABLE

const isFhenixSealedAddress = (item: any): item is DSealedOutputAddress => {
  return item && typeof item === "object" && item.utype === TFHE_UTYPE.EADDRESS;
};

const isFhenixSealedBool = (item: any): item is DSealedOutputBool => {
  return item && typeof item === "object" && item.utype === TFHE_UTYPE.EBOOL;
};

const isFhenixSealedUint = (item: any): item is DSealedOutputUint => {
  return item && typeof item === "object" && TFHE_UTYPE.EUINT.includes(item.utype);
};

const sealedBoolItem = {
  data: "0x000",
  utype: 12,
  type: "fhenix-sealed-output",
} as DSealedOutputAddress;

const test = unsealFhenixSealedItems([sealedBoolItem, sealedBoolItem], "0x...", "0x...", {} as FhenixClientSync);

export function unsealFhenixSealedItems<T extends any[]>(
  item: [...T],
  contractAddress: `0x${string}`,
  account: `0x${string}`,
  fhenixClient: FhenixClientSync,
): [...FhenixMappedOutputTypes<T, "fhenix-utils-modified">];
export function unsealFhenixSealedItems<T>(
  item: T,
  contractAddress: `0x${string}`,
  account: `0x${string}`,
  fhenixClient: FhenixClientSync,
): FhenixMappedOutputTypes<T, "fhenix-utils-modified">;
export function unsealFhenixSealedItems<T>(
  item: T,
  contractAddress: `0x${string}`,
  account: `0x${string}`,
  fhenixClient: FhenixClientSync,
) {
  if (isFhenixSealedAddress(item)) {
    // return fhenixClient.unseal(contractAddress, item.data, account)
    return `0xFILL_ME_OUT_IN_UNSEAL_ITEM` as string;
  }
  if (isFhenixSealedUint(item)) {
    return fhenixClient.unseal(contractAddress, item.data, account);
  }
  if (isFhenixSealedBool(item)) {
    const unsealed = fhenixClient.unseal(contractAddress, item.data, account);
    return unsealed === 1n;
  }

  if (typeof item === "object" && item !== null) {
    // Handle array
    if (Array.isArray(item)) {
      return item.map(nestedItem => unsealFhenixSealedItems(nestedItem, contractAddress, account, fhenixClient));
    } else {
      // Handle object
      const result: any = {};
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          result[key] = unsealFhenixSealedItems(item[key], contractAddress, account, fhenixClient);
        }
      }
      return result;
    }
  }

  return item;
}
