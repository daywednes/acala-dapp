/* eslint-disable */
import React, { createContext, FC, useEffect } from 'react';

import { Fixed18 } from '@acala-network/app-util';
import { useApi } from '@acala-dapp/react-hooks';
import { BareProps } from '@acala-dapp/ui-components/types';

import { usePricesStore, subscribePrice } from './modules/prices';

const StoreContext = createContext({});

export const StoreProvier: FC<BareProps> = ({ children }) => {
  const { api } = useApi();
  // const { state: pricesStore, setState: setPricesStore } = usePricesStore();

  useEffect(() => {
    api.isReady && api.isReady.subscribe(() => {
      subscribePrice(api, () => {});
    });
  }, [api]);

  if (!api) return null;

  return (
    <StoreContext.Provider value={{
    }}>
      {children}
    </StoreContext.Provider>
  );
};
