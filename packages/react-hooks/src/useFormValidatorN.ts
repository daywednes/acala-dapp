import { Fixed18 } from '@acala-network/app-util';
import { getTokenName, isValidateAddress } from '@acala-dapp/react-components';

import { CurrencyLike } from './types';
import { useBalance } from './balanceHooks';

interface UseBalanceValidatorConfig {
  currency: CurrencyLike;
  fieldName: string;
  getFieldValue: any;
}

export const useBalanceValidator = (config: UseBalanceValidatorConfig): () => Promise<any> => {
  const balance = useBalance(config.currency);

  return (): Promise<any> => {
    const value = config.getFieldValue(config.fieldName);

    if (Fixed18.fromNatural(value).isGreaterThan(balance)) {
      return Promise.reject(new Error(`Insufficient ${getTokenName(config.currency)} Balance`));
    }

    return Promise.resolve();
  };
};

interface UseAddressValidatorConfig {
  required?: boolean;
  fieldName: string;
  getFieldVaule: any;
}

export const useAddressValidator = (config: UseAddressValidatorConfig): () => Promise<any> => {
  return (): Promise<any> => {
    const value = config.getFieldVaule(config.fieldName);

    if (config.required && !value) {
      return Promise.reject(new Error('Address is Required'));
    }

    const result = isValidateAddress(value);

    if (!result) {
      return Promise.reject(new Error('Invalid Address'));
    }

    return Promise.resolve();
  };
};
