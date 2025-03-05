import { useEffect, useState } from 'preact/hooks';
import { request } from '.';
import { useAtom, useSetAtom } from 'jotai';
import { linksAtom, optionLoginModalAtom } from './atom';


export const useLinks = (count: number = 100) => {
  const setHidden = useSetAtom(optionLoginModalAtom)

  const [links, setLinks] = useAtom(linksAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 从本地缓存初始化数据
  useEffect(() => {
    const cachedLinks = localStorage.getItem('cachedLinks');
    if (cachedLinks) {
      setLinks(JSON.parse(cachedLinks));
    }
  }, []);

  const queryLinks = (count = 100, error?: () => void) => {
    setIsRefreshing(true);
    return request(`/api/link/list?limit=${count}&cursor`)
      .then(data => {
        if (data.statusMessage) {
          throw Error();
        }
        setLinks(data.links);
        localStorage.setItem('cachedLinks', JSON.stringify(data.links));
        setHidden(true)
        return data;
      })
      .catch(() => {
        setLinks(undefined);
        error?.();
      })
      .finally(() => {
        setIsRefreshing(false);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    queryLinks(count).finally(() => setIsLoading(false));
  }, [count]);

  return { links, setLinks, queryLinks, isLoading, isRefreshing };
};
