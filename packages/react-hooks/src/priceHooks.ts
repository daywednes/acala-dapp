import { useState, useEffect } from 'react';

import { CurrencyId } from '@acala-network/types/interfaces';
import { Fixed18 } from '@acala-network/app-util';

import { tokenEq } from '@acala-dapp/react-components';
import { PriceData } from '@acala-dapp/react-environment/RxStore/type';

import { useRxStore } from './useRxStore';

/**
 * @name useAllPrices
 * @description get all prices from the chain
 */
export const useAllPrices = (): PriceData[] => {
  const { price: priceStore } = useRxStore();
  const [prices, setPrices] = useState<PriceData[]>([]);

  useEffect(() => {
    const subscribe = priceStore.subscribe(setPrices);

    return (): void => subscribe.unsubscribe();
  }, [priceStore, setPrices]);

  return prices;
};

/**
 * @name usePrice
 * @description get price of `currency`
 * @param currency
 */
export const usePrice = (currency: CurrencyId | string): Fixed18 | undefined => {
  const prices = useAllPrices();

  const result = prices.find((item: PriceData): boolean => tokenEq(item.currency, currency));

  return result ? result.price : undefined;
};
