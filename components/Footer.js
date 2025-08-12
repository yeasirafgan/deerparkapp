// // mainfolder/components/Footer.js

'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

const Footer = () => {
  const { user, isAuthenticated } = useKindeBrowserClient();
  const currentYear = new Date().getFullYear();

  return (
    <footer className='mt-auto bg-slate-50 text-zinc-500 py-5 px-7 border-t flex flex-col md:flex-row md:justify-between items-center'>
      {isAuthenticated && (
        <p className='text-xs md:text-sm pb -2 md:pb-0 text-center md:text-left'>
          Logged in as {user?.email}
        </p>
      )}
      <p className='text-center md:text-right text-xs md:text-sm'>
        All Rights Reserved &copy; Deerpark | {currentYear}
      </p>
    </footer>
  );
};

export default Footer;
