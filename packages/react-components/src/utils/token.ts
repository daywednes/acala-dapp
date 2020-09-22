import { CurrencyLike } from '@acala-dapp/react-hooks/types';

import AcaIcon from '../assets/coins-icon/ACA.svg';
import AUSDIcon from '../assets/coins-icon/aUSD.svg';
import BtcIcon from '../assets/coins-icon/BTC.svg';
import DotIcon from '../assets/coins-icon/DOT.svg';
import LDotIcon from '../assets/coins-icon/LDOT.svg';
import RenIcon from '../assets/coins-icon/REN.svg';

export const ICON_IMAGES = {
  aca: AcaIcon,
  ausd: AUSDIcon,
  btc: BtcIcon,
  dot: DotIcon,
  ldot: LDotIcon,
  renbtc: RenIcon,
  xbtc: BtcIcon
};

export const ICON_FULLNAMES = {
  aca: 'Acala',
  ausd: 'Acala Dollar',
  btc: 'Bitcoin',
  dot: 'Polkadot',
  ldot: 'Liquid DOT',
  renbtc: 'Ren Bitcoin',
  xbtc: 'Interchain Bitcoin'
};

export const TOKEN_COLOR_MAP: Map<string, string> = new Map([
  ['SYSTEM', '#173DC9'],
  ['BTC', '#F7931A'],
  ['XBTC', '#F7931A'],
  ['RENBTC', '#87888C'],
  ['LDOT', '#00F893'],
  ['DOT', '#e6007a']
]);

export const TOKEN_NAME_MAP: Map<string, string> = new Map([
  ['AUSD', 'aUSD(TEST)'],
  ['ACA', 'ACA(TEST)'],
  ['BTC', 'BTC(TEST)'],
  ['XBTC', 'XBTC(TEST)'],
  ['RENBTC', 'renBTC(TEST)'],
  ['LDOT', 'LDOT(TEST)'],
  ['DOT', 'DOT(TEST)']
]);

export function getTokenColor (token: CurrencyLike): string {
  // default color is black
  return TOKEN_COLOR_MAP.get(token.toString().toUpperCase()) || '#000000';
}

export function getTokenImage (token: CurrencyLike): string {
  return Reflect.get(ICON_IMAGES, token.toString().toLowerCase()) || '';
}

export function getTokenFullName (token: CurrencyLike): string {
  return Reflect.get(ICON_FULLNAMES, token.toString().toLowerCase());
}

export function getTokenName (token: CurrencyLike): string {
  return TOKEN_NAME_MAP.get(token.toString()) || '';
}
