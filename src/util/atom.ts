import { atom } from 'jotai';

export const settingModalAtom = atom(false);

export interface ILink {
  id: string;
  url: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
}

export const linksAtom = atom<ILink[]>();
