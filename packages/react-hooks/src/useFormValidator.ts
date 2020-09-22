import { FormikErrors } from 'formik';
import { useMemo } from 'react';

import { ApiRx } from '@polkadot/api';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { Fixed18 } from '@acala-network/app-util';
import { tokenEq, getTokenName } from '@acala-dapp/react-components';

import { useApi } from './useApi';
import { useAccounts } from './useAccounts';
import { CurrencyLike } from './types';
import { useAllBalances, BalanceData } from './balanceHooks';

interface BaseConfig {
  custom?: (value: any) => string | undefined;
}

interface BalanceConfig extends BaseConfig {
  type: 'balance';
  currency?: CurrencyLike;
  max?: number;
  min?: number;
  errorMsg?: string;
}

interface NumberConfig extends BaseConfig {
  type: 'number';
  max?: number;
  min?: number;
  equalMax?: boolean;
  equalMin?: boolean;
  errorMsg?: string;
}

interface StringConfig extends BaseConfig {
  type: 'string';
  pattern?: RegExp;
  max?: number;
  min?: number;
  errorMsg?: string;
}

type Config = {
  [k in string]: BalanceConfig | NumberConfig | StringConfig;
}

export function getFormValidator<T> (config: Config, api: ApiRx, active: InjectedAccountWithMeta, allBalance: BalanceData[]): (values: T) => void | object | Promise<FormikErrors<T>> {
  const numberPattern = /^([1-9]\d*|0)(\.\d*)?$/;

  return (values: any): void | object | Promise<FormikErrors<T>> => {
    const error = {} as any;

    return new Promise((resolve) => {
      Object.keys(values).forEach((key): void => {
        const _config = config[key];
        const value = values[key];

        if (_config.type === 'balance' && _config.currency) {
          const _balanceData = allBalance.find((item) => tokenEq(item.currency, _config.currency as CurrencyLike));

          if (!_balanceData) {
            error[key] = `Insufficient ${getTokenName(_config.currency)} Balance`;
            resolve(error);

            return;
          }

          const _balance = _balanceData.balance;

          const _value = Fixed18.fromNatural(value);
          const _max = Fixed18.fromNatural(_config.max !== undefined ? _config.max : Number.MAX_VALUE);
          const _min = Fixed18.fromNatural(_config.min !== undefined ? _config.min : 0);

          // ensure balance is sufficient
          if (_value.isGreaterThan(_balance)) {
            error[key] = `Insufficient ${getTokenName(_config.currency)} Balance`;
          }

          // ensure balance is less than max
          if (_value.isGreaterThan(_max)) {
            error[key] = `Value is greater than ${_max.toNumber()}`;
          }

          // ensure balance is greater than min
          if (_value.isLessThan(_min)) {
            error[key] = `Value is less than ${_min.toNumber()}`;
          }
        }

        if (_config.type === 'number') {
          if (value.toString() && !numberPattern.test(value.toString())) {
            error[key] = 'Not a valid number';
          }

          if (_config.max !== undefined && value > _config.max) {
            error[key] = `Value is bigger than ${_config.max}`;
          }

          if (_config.min !== undefined && value < _config.min) {
            error[key] = `Value is less than ${_config.min}`;
          }

          if (_config.equalMax === false && value === _config.max) {
            error[key] = `Value should not equal ${_config.max}`;
          }

          if (_config.equalMin === false && value === _config.min) {
            error[key] = `Value should not equal ${_config.min}`;
          }
        }

        if (_config.type === 'string') {
          const length = (value as string).length;

          if (_config.pattern !== undefined && !_config.pattern.test(value)) {
            error[key] = 'Value is not a valid string';
          }

          if (_config.max !== undefined && length > _config.max) {
            error[key] = `Value's length is bigger than ${_config.max}`;
          }

          if (_config.min !== undefined && length < _config.min) {
            error[key] = `Value's length is less than ${_config.min}`;
          }
        }

        const preCheckCustom = _config.custom ? _config.custom(value) : undefined;

        if (preCheckCustom) {
          error[key] = preCheckCustom;
        }
      });

      resolve(error);
    });
  };
}

export function useFormValidator<T extends any> (_config: Config): (values: T) => void | object | Promise<FormikErrors<T>> {
  const { api } = useApi();
  const { active } = useAccounts();
  const allBalance = useAllBalances();

  const formValidator = useMemo(() => {
    if (!active) {
      return (): object => ({ global: "can't get user address" });
    }

    if (!api) {
      return (): object => ({ global: "can't connect endpoint" });
    }

    return getFormValidator(_config, api, active, allBalance);
  }, [api, active, allBalance, _config]);

  return formValidator;
}
