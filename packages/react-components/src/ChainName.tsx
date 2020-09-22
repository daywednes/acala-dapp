import React, { FC, useCallback } from 'react';
import { isEmpty } from 'lodash';
import clsx from 'clsx';

import { useApi, useModal } from '@acala-dapp/react-hooks';
import { BareProps } from '@acala-dapp/ui-components/types';
import { Skeleton } from '@acala-dapp/ui-components';

import { ReactComponent as NetworkIcon } from './assets/network.svg';
import { ReactComponent as AcalaIcon } from './assets/aca-network.svg';
import classes from './ChainName.module.scss';
import { SelectNetwork } from './SelectNetwork';

export const ChainName: FC<BareProps> = ({ className }) => {
  const { chainInfo, loading } = useApi();
  const { close, open, status } = useModal();

  const openChainSelect = useCallback(() => {
    open();
  }, [open]);

  return (
    <>
      <div
        className={
          clsx(
            className,
            classes.root
          )
        }
        onClick={openChainSelect}
      >
        {
          loading || !chainInfo?.chainName ? (
            <Skeleton.Button
              active
              className={classes.skeleton}
              size='small'
            />
          ) : (
            <>
              <NetworkIcon className={classes.networkIcon} />
              <div
                className={classes.chainName}
              >
                <AcalaIcon className={classes.chainIcon} />
                {chainInfo.chainName}
              </div>
            </>
          )
        }
      </div>
      <SelectNetwork
        onClose={close}
        visiable={status}
      />
    </>
  );
};
