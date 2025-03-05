import { linksAtom } from '@src/util/atom';
import { useAtomValue } from 'jotai';
import { Fragment } from 'preact/compat';
import LinkTag from './LinkTag';

export const Links = () => {
  const links = useAtomValue(linksAtom);
  return (
    <div>
      {links ? (
        <Fragment>
          <div className='grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4'>
            {links.map(link => (
              <LinkTag key={link.slug} url={link.url} shortKey={link.slug} />
            ))}
          </div>
          <div className='mb-4 mt-8 text-center text-gray-400'>
        {links.length === 0 ? 'No links found' : 'No more links'}
      </div>
        </Fragment>
      ) : (
        'No links found'
      )}
    </div>
  );
};
