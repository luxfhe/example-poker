import { DEncryptedInputTypes, DSealedOutputTypes, DFhenixPermission } from "~~/utils/fhenixUtilsTypes";

type EBool = bigint & {
  type: "fhe-encrypted-bool";
};
type EUint8 = bigint & {
  type: "fhe-encrypted-euint8";
};
type EUint16 = bigint & {
  type: "fhe-encrypted-euint16";
};
type EUint32 = bigint & {
  type: "fhe-encrypted-euint32";
};
type EUint64 = bigint & {
  type: "fhe-encrypted-euint64";
};
type EUint128 = bigint & {
  type: "fhe-encrypted-euint128";
};
type EUint256 = bigint & {
  type: "fhe-encrypted-euint256";
};
type EAddress = bigint & {
  type: "fhe-encrypted-address";
};

declare module "abitype" {
  export interface Register {
    structTypeMatches: {
      inBool: DEncryptedInputTypes["bool"];
      inEuint8: DEncryptedInputTypes["uint8"];
      inEuint16: DEncryptedInputTypes["uint16"];
      inEuint32: DEncryptedInputTypes["uint32"];
      inEuint64: DEncryptedInputTypes["uint64"];
      inEuint128: DEncryptedInputTypes["uint128"];
      inEuint256: DEncryptedInputTypes["uint256"];
      inAddress: DEncryptedInputTypes["address"];

      Permission: DFhenixPermission;

      SealedBool: DSealedOutputTypes["bool"];
      SealedUint: DSealedOutputTypes["uint"];
      SealedAddress: DSealedOutputTypes["address"];

      ebool: EBool;
      euint8: EUint8;
      euint16: EUint16;
      euint32: EUint32;
      euint64: EUint64;
      euint128: EUint128;
      euint256: EUint256;
      eaddress: EAddress;
    };
  }
}
