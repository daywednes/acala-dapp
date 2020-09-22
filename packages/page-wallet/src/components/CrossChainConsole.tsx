import React, { FC, ReactElement } from 'react';

import { CurrencyLike } from '@acala-dapp/react-hooks/types';
import { TokenImage, TokenName, TokenFullName } from '@acala-dapp/react-components';
import { useConstants } from '@acala-dapp/react-hooks';
import { Tabs } from '@acala-dapp/ui-components';

import classes from './CrossChainConsole.module.scss';
import { RenBtc } from './crosschain/RenBtc';
import { AUSD } from './crosschain/AUSD';
import { DOT } from './crosschain/DOT';

const AssetCard: FC<{ currency: CurrencyLike}> = ({ currency }) => {
  return (
    <div className={classes.assetCard}>
      <div className={classes.assetImg}>
        <TokenImage currency={currency} />
      </div>
      <div className={classes.assetName}>
        <TokenName currency={currency} />
        <TokenFullName currency={currency} />
      </div>
    </div>
  );
};

const crossChainConsoleList: Map<string, ReactElement> = new Map([
  ['RENBTC', <RenBtc key='renbtc' />],
  ['AUSD', <AUSD key='ausd' />],
  ['DOT', <DOT key='dot' />]
]);

const crossChainEnable: Map<string, boolean> = new Map([
  ['RENBTC', true],
  ['AUSD', true],
  ['DOT', true]
]);

export const CrossChainConsole: FC = () => {
  const { crossChainCurrencies } = useConstants();

  return (
    <Tabs
      className={classes.tabs}
      defaultKey='RENBTC'
    >
      {
        crossChainCurrencies.map((currency) => {
          return (
            <Tabs.Panel
              disabled={!crossChainEnable.get(currency.toString())}
              key={currency.toString()}
              tab={<AssetCard currency={currency} />}
            >
              {
                crossChainConsoleList.get(currency.toString())
              }
            </Tabs.Panel>
          );
        })
      }
    </Tabs>
  );
};
