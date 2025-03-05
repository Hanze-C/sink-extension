import { Logo } from '@src/assets/img/logo';
import { Footer } from '@src/components/Footer';
import { useLinks } from '@src/util/useLinks';
import { Links } from './Links';
import { NewShortURL } from './NewShortURL';
import { useEffect, useState } from 'preact/hooks';

export default function Popup() {
  const { links, setLinks, queryLinks, isLoading } = useLinks(1000);
  
  return (
    <div className='w-full min-w-[450px] p-5 pb-1'>
      <div className='flex items-center justify-center text-lg'>
        <Logo size={30} />
        <h2 className='ml-2 font-bold'>Sink</h2>
      </div>
      <div className='mt-8 w-full'>
        <div className='flex w-full flex-col items-center justify-center'>
          {links ? (
            <NewShortURL
              links={links}
              isLoading={isLoading}
              refetch={() => {
                return queryLinks(1000)
                  .then(data => {
                    if (data.statusMessage) {
                      throw Error();
                    }
                    setLinks(data.links);
                    return data;
                  })
                  .catch(() => {
                    setLinks(undefined);
                  });
              }}
            />
          ) : (
            'Please update the token in the options Page!'
          )}
        </div>
      </div>
      <Footer hideGift hideGithub />
      <Links />
    </div>
  );
}
