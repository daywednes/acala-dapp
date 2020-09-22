import React, { createContext, memo, FC, useState, useMemo, useCallback, useEffect } from 'react';
import { ACTION_TYPE } from '../types';
import { CurrencyId, Rate } from '@acala-network/types/interfaces';
import { Vec } from '@polkadot/types';

import { useApi, useInitialize, useDexExchangeRate } from '@acala-dapp/react-hooks';
import { BareProps } from '@acala-dapp/ui-components/types';
import { PageLoading } from '@acala-dapp/ui-components';

interface DepositContextData {
  action: ACTION_TYPE;
  setActiveAction: (type: ACTION_TYPE) => void;
  enabledCurrencyIds: Vec<CurrencyId>;
  baseCurrencyId: CurrencyId;
  exchangeFee: Rate;
}

export const DepositContext = createContext<DepositContextData>({} as DepositContextData);

export const DepositProvider: FC<BareProps> = memo(({ children }) => {
  const { api } = useApi();
  const [action, _setAction] = useState<ACTION_TYPE>('deposit');
  const { isInitialized, setEnd } = useInitialize();

  const enabledCurrencyIds = useMemo(() => api?.consts.dex.enabledCurrencyIds as unknown as Vec<CurrencyId>, [api]);

  const baseCurrencyId = useMemo(() => api?.consts.dex.getBaseCurrencyId as unknown as CurrencyId, [api]);

  const exchangeFee = useMemo(() => api?.consts.dex.getExchangeFee as unknown as Rate, [api]);

  const exchangeRate = useDexExchangeRate(enabledCurrencyIds[0]);

  const setActiveAction = useCallback((type: ACTION_TYPE): void => {
    _setAction(type);
  }, [_setAction]);

  useEffect(() => {
    if (!exchangeRate.isZero()) {
      setEnd();
    }
  }, [exchangeRate, setEnd]);

  return (
    <DepositContext.Provider value={{
      action,
      baseCurrencyId,
      enabledCurrencyIds,
      exchangeFee,
      setActiveAction
    }}>
      { isInitialized ? children : <PageLoading /> }
    </DepositContext.Provider>
  );
});

DepositProvider.displayName = 'DepositProvider';
