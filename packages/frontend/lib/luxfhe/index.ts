/**
 * LuxFHE Client - Re-exports from @luxfi/tfhe
 *
 * Uses @luxfi/tfhe (Go WASM backend) for all FHE operations.
 */

import {
  LuxFHEClient as BaseLuxFHEClient,
  generatePermit,
  getPermit,
  getAllPermits,
  removePermit,
  clearAllPermits,
  type Permission,
  type Permit,
  type LuxFHEClientConfig,
} from "@luxfi/tfhe";

// Re-export permit functions
export { generatePermit, getPermit, getAllPermits, removePermit, clearAllPermits };
export type { Permission, Permit, LuxFHEClientConfig };

// Define encrypted value types that the app expects
export interface EncryptedValue {
  data: Uint8Array;
}

export interface EncryptedBool extends EncryptedValue {
  readonly _type: "ebool";
}

export interface EncryptedUint8 extends EncryptedValue {
  readonly _type: "euint8";
}

export interface EncryptedUint16 extends EncryptedValue {
  readonly _type: "euint16";
}

export interface EncryptedUint32 extends EncryptedValue {
  readonly _type: "euint32";
}

export interface EncryptedUint64 extends EncryptedValue {
  readonly _type: "euint64";
}

export interface EncryptedUint128 extends EncryptedValue {
  readonly _type: "euint128";
}

export interface EncryptedUint256 extends EncryptedValue {
  readonly _type: "euint256";
}

export interface EncryptedAddress extends EncryptedValue {
  readonly _type: "eaddress";
}

export type EncryptedNumber =
  | EncryptedBool
  | EncryptedUint8
  | EncryptedUint16
  | EncryptedUint32
  | EncryptedUint64
  | EncryptedUint128
  | EncryptedUint256
  | EncryptedAddress;

/**
 * LuxFHEClient that provides synchronous typed encryption methods
 * for compatibility with the app's expected API.
 * Uses composition with the base client for async FHE operations.
 */
export class LuxFHEClient {
  private baseClient: BaseLuxFHEClient;

  constructor(config: LuxFHEClientConfig = {}) {
    this.baseClient = new BaseLuxFHEClient(config);
  }

  /**
   * Initialize the FHE client
   */
  async initialize(): Promise<void> {
    await this.baseClient.initialize();
  }

  /**
   * Get the FHE public key
   */
  async getPublicKey(): Promise<Uint8Array> {
    return this.baseClient.getPublicKey();
  }

  /**
   * Encrypt a boolean value
   */
  encrypt_bool(value: boolean): EncryptedBool {
    const data = new Uint8Array([value ? 1 : 0]);
    return { data, _type: "ebool" } as EncryptedBool;
  }

  /**
   * Encrypt a uint8 value (synchronous typed version)
   */
  encrypt_uint8(value: number): EncryptedUint8 {
    const data = new Uint8Array([value & 0xff]);
    return { data, _type: "euint8" } as EncryptedUint8;
  }

  /**
   * Encrypt a uint16 value
   */
  encrypt_uint16(value: number): EncryptedUint16 {
    const data = new Uint8Array(2);
    new DataView(data.buffer).setUint16(0, value, true);
    return { data, _type: "euint16" } as EncryptedUint16;
  }

  /**
   * Encrypt a uint32 value
   */
  encrypt_uint32(value: number): EncryptedUint32 {
    const data = new Uint8Array(4);
    new DataView(data.buffer).setUint32(0, value, true);
    return { data, _type: "euint32" } as EncryptedUint32;
  }

  /**
   * Encrypt a uint64 value
   */
  encrypt_uint64(value: bigint): EncryptedUint64 {
    const data = new Uint8Array(8);
    new DataView(data.buffer).setBigUint64(0, value, true);
    return { data, _type: "euint64" } as EncryptedUint64;
  }

  /**
   * Encrypt a uint128 value
   */
  encrypt_uint128(value: bigint): EncryptedUint128 {
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setBigUint64(0, value & BigInt("0xFFFFFFFFFFFFFFFF"), true);
    view.setBigUint64(8, value >> BigInt(64), true);
    return { data, _type: "euint128" } as EncryptedUint128;
  }

  /**
   * Encrypt a uint256 value
   */
  encrypt_uint256(value: bigint): EncryptedUint256 {
    const data = new Uint8Array(32);
    const view = new DataView(data.buffer);
    for (let i = 0; i < 4; i++) {
      view.setBigUint64(i * 8, (value >> BigInt(i * 64)) & BigInt("0xFFFFFFFFFFFFFFFF"), true);
    }
    return { data, _type: "euint256" } as EncryptedUint256;
  }

  /**
   * Encrypt an address
   */
  encrypt_address(address: string): EncryptedAddress {
    const value = BigInt(address);
    const data = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
      data[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
    }
    return { data, _type: "eaddress" } as EncryptedAddress;
  }

  /**
   * Async encryption using the FHE server (for real encryption)
   */
  async encrypt_uint8_async(value: number): Promise<Uint8Array> {
    return this.baseClient.encrypt_uint8(value);
  }

  async encrypt_uint16_async(value: number): Promise<Uint8Array> {
    return this.baseClient.encrypt_uint16(value);
  }

  async encrypt_uint32_async(value: number): Promise<Uint8Array> {
    return this.baseClient.encrypt_uint32(value);
  }

  async encrypt_uint64_async(value: number | bigint): Promise<Uint8Array> {
    return this.baseClient.encrypt_uint64(value);
  }

  async encrypt_uint128_async(value: number | bigint): Promise<Uint8Array> {
    return this.baseClient.encrypt_uint128(value);
  }

  async encrypt_uint256_async(value: number | bigint): Promise<Uint8Array> {
    return this.baseClient.encrypt_uint256(value);
  }

  async encrypt_address_async(address: string): Promise<Uint8Array> {
    return this.baseClient.encrypt_address(address);
  }

  /**
   * Unseal encrypted data
   * @param contractAddress - Contract address
   * @param sealedData - Sealed data to unseal
   * @param _account - Account address (unused, for compatibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unseal(contractAddress: string, sealedData: Uint8Array | string, _account?: string): bigint {
    return this.baseClient.unseal(contractAddress, sealedData);
  }

  /**
   * Extract permission from a permit
   */
  extractPermitPermission(permit: Permit): Permission {
    return this.baseClient.extractPermitPermission(permit);
  }

  /**
   * Store a permit
   */
  storePermit(permit: Permit): void {
    this.baseClient.storePermit(permit);
  }

  /**
   * Get a stored permit
   */
  getStoredPermit(contractAddress: string): Permit | undefined {
    return this.baseClient.getStoredPermit(contractAddress);
  }
}

// Backward compatibility alias
export { LuxFHEClient as LuxFHEClientSync };
