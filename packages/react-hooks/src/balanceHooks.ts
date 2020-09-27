import { useState, useEffect, useMemo } from 'react';
import { combineLatest, Observable } from 'rxjs';

import { CurrencyId, Balance } from '@acala-network/types/interfaces';
import { Fixed18, convertToFixed18 } from '@acala-network/app-util';

import { tokenEq } from '@acala-dapp/react-components';
import { PriceData } from '@acala-dapp/react-environment/RxStore/type';

import { useApi } from './useApi';
import { useAccounts } from './useAccounts';
import { useCall } from './useCall';
import { useConstants } from './useConstants';
import { CurrencyLike, AccountLike } from './types';
import { usePrice, useAllPrices } from './priceHooks';

export type BalanceData = { currency: CurrencyLike; balance: Fixed18 };

/**
 * @name useBalance
 * @description get input account or active account  balances of currencie
 * @param currency
 * @param account
 */
export const useBalance = (currency: CurrencyLike, account?: AccountLike): Fixed18 => {
  const { active } = useAccounts();
  const _account = useMemo(() => account || (active ? active.address : '_'), [account, active]);
  const balance = useCall<Balance>('derive.currencies.balance', [_account, currency]);

  if (!currency || !balance) {
    return Fixed18.ZERO;
  }

  return convertToFixed18(balance);
};

/**
 * @name useBalances
 * @description get input account or active account  balances of currencies
 * @param currencies
 * @param account
 */
export const useBalances = (currencies: CurrencyLike[], account?: AccountLike): BalanceData[] => {
  const { api } = useApi();
  const { active } = useAccounts();
  const _account = useMemo(() => account || (active ? active.address : '_'), [account, active]);
  const [balances, setBalances] = useState<BalanceData[]>([]);

  useEffect(() => {
    if (!_account) {
      return;
    }

    const subscribe = combineLatest(currencies.map((currency: CurrencyLike) => {
      return (api.derive as any).currencies.balance(_account, currency) as Observable<Balance>;
    })).subscribe({
      next: (result) => setBalances(currencies.map((currency: CurrencyLike, index: number): BalanceData => ({
        balance: result ? convertToFixed18(result[index]) : Fixed18.ZERO,
        currency
      })))
    });

    return (): void => subscribe.unsubscribe();
  }, [_account, api.derive, currencies, setBalances]);

  return balances;
};

/**
 * @name useAllBalances
 * @name get current account or input account all currencies balances
 */
export const useAllBalances = (account?: AccountLike): BalanceData[] => {
  const { allCurrencies } = useConstants();
  const balances = useBalances(allCurrencies, account);

  return balances;
};

/**
 * @name useValue
 * @description get currency value in USD
 * @param currency
 * @param account
 */
export const useValue = (currency: CurrencyId | string, account?: AccountLike): Fixed18 | undefined => {
  const balance = useBalance(currency, account);
  const price = usePrice(currency);

  if (!balance || !price) {
    return;
  }

  return balance.mul(price);
};

const calcTotalAmount = (prices: PriceData[], amount: BalanceData[]): Fixed18 => {
  return amount.reduce((acc: Fixed18, current: BalanceData): Fixed18 => {
    const price = prices.find((value: PriceData): boolean => tokenEq(value.currency, current.currency));
    const amount = (price?.price || Fixed18.ZERO).mul(current.balance);

    return acc.add(amount);
  }, Fixed18.ZERO);
};

/**
 * @name useTotalValue
 * @description get total value in USD of all currencies
 * @param account
 */
export const useTotalValue = (account?: AccountLike): Fixed18 | undefined => {
  const { allCurrencies } = useConstants();
  const balances = useBalances(allCurrencies, account);
  const prices = useAllPrices();
  const [result, setResult] = useState<Fixed18 | undefined>();

  useEffect(() => {
    if (balances && prices) {
      setResult(calcTotalAmount(prices, balances));
    }
  }, [balances, prices]);

  return result;
};

export const useIssuance = (asset: CurrencyLike): Fixed18 => {
  const issuance = useCall<Balance>('query.tokens.totalIssuance', [asset]);

  return issuance ? convertToFixed18(issuance) : Fixed18.ZERO;
};
