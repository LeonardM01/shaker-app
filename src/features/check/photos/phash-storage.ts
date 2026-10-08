// pHashes are 64-bit unsigned hex in code and signed BIGINT in Postgres.

export function toSignedPhash(hex: string): bigint {
  return BigInt.asIntN(64, BigInt(`0x${hex}`))
}

export function fromSignedPhash(value: bigint): string {
  return BigInt.asUintN(64, value).toString(16).padStart(16, '0')
}
