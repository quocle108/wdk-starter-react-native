import { networkConfigs, NetworkType } from '@/config/networks';
import WAValidator from 'multicoin-address-validator';

export type AddressValidationResult = { valid: true } | { valid: false; error: string };
export type AddressValidator = (address: string) => AddressValidationResult;

export function getAddressValidatorForNetwork(
  networkId: NetworkType
): AddressValidator | undefined {
  return networkConfigs[networkId]?.addressValidator;
}

export function validateEvmAddress(address: string): AddressValidationResult {
  const isValid = WAValidator.validate(address, 'eth');

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid EVM address. Please check the address and try again.',
    };
  }

  return { valid: true };
}

export function validateBitcoinAddress(address: string): AddressValidationResult {
  const isValid = WAValidator.validate(address, 'btc');

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid Bitcoin address. Please check the address format.',
    };
  }

  return { valid: true };
}

export function validateAddressByNetwork(
  networkId: NetworkType,
  address: string
): AddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Recipient address is required' };
  }

  const validator = getAddressValidatorForNetwork(networkId);

  if (!validator) {
    return {
      valid: false,
      error: 'Address validation is not supported for this network.',
    };
  }

  return validator(trimmed);
}
