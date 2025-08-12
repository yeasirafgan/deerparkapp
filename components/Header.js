// mainfolder/components/Header.js


'use client';

import {
  LoginLink,
  LogoutLink,
  useKindeBrowserClient,
} from '@kinde-oss/kinde-auth-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import OutsideClickHandler from './OutsideClickHandler';



const Header = () => {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfilePicClicked, setIsProfilePicClicked] = useState(false); // New state variable
  const { user, isAuthenticated, signOut } = useKindeBrowserClient();
  const dropdownRef = useRef(null);
  const profilePicRef = useRef(null);

const navLinks = [
  {
    href: '/',
    label: 'Home',
  },
  {
    href: '/timesheet',
    label: 'Timesheet',
    requiredPermissions: ['submit:timesheet'],
  },
  {
    href: '/admin',
    label: 'Admin',
    requiredPermissions: ['delete:timesheet'],
  },
  // {
  //   href: '/rota',
  //   label: 'Rota',
  //   // requiredPermissions: ['create:rota'],
  // },
];


{navLinks.map((link) => {
  // Check if the link requires permissions and if the user has the required permissions
  const hasPermission = link.requiredPermissions
    ? link.requiredPermissions.every(permission => user?.permissions?.includes(permission))
    : true;

  if (isAuthenticated && hasPermission) {
    return (
      <li key={link.href}>
        <Link
          className={`text-zinc-500 ${
            pathname === link.href ? 'font-bold' : ''
          }`}
          href={link.href}
        >
          {link.label}
        </Link>
      </li>
    );
  }

  // For logged-out users, only display Home link
  if (!isAuthenticated && link.href === '/') {
    return (
      <li key={link.href}>
        <Link
          className={`text-zinc-500 ${
            pathname === link.href ? 'font-bold' : ''
          }`}
          href={link.href}
        >
          {link.label}
        </Link>
      </li>
    );
  }

  return null;
})}




  // Toggle dropdown menu for desktop
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
    setIsProfilePicClicked(true); // Set to true when profile picture is clicked
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !profilePicRef.current.contains(event.target) &&
        !isProfilePicClicked
      ) {
        setIsDropdownOpen(false);
      }
      setIsProfilePicClicked(false); // Reset the state after handling
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfilePicClicked]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      // Redirect after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <header className='sticky top-0 z-50 flex flex-col md:flex-row justify-between items-center py-4 px-7 border-b bg-slate-50 text-zinc-500'>
      <div className='flex justify-between items-center w-full md:w-auto'>
        <Link href={'/'}>
          <h1 className='text-xl font-semibold text-slate-700'>
            Phoenix carehome
          </h1>
        </Link>
        {/* Mobile menu button */}
        <button
          className='md:hidden text-2xl text-slate-700'
          onClick={toggleMobileMenu}
        >
          &#9776;
        </button>
      </div>

      {/* Desktop Menu */}
      <nav className='hidden md:flex md:items-center ml-auto'>
        <ul className='flex gap-x-5 items-center text-[14px]'>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                className={`text-zinc-500 ${
                  pathname === link.href ? 'font-bold' : ''
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {/* Login/Logout and Profile Picture */}
          <li className='ml-4 relative'>
            {isAuthenticated ? (
              <div className='flex items-center'>
                <div
                  className='cursor-pointer'
                  onClick={toggleDropdown}
                  ref={profilePicRef}
                >
                  {user?.picture ? (
                    <Image
                      src={user.picture}
                      alt='Profile picture'
                      width={30}
                      height={30}
                      className='rounded-full border'
                    />
                  ) : (
                    <div className='h-10 w-10 rounded-full bg-zinc-800 text-white text-center flex justify-center items-center'>
                      {user?.given_name?.[0] || 'U'}
                    </div>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className='absolute right-0 mt-2 w-96  px -4 bg-white rounded-lg shadow-lg py-2 z-20'
                    style={{ top: '50px' }}
                  >
                    <div className='flex items-center px-4  py-2'>
                      {user?.picture ? (
                        <Image
                          src={user.picture}
                          alt='Profile picture'
                          width={40}
                          height={40}
                          className='rounded-full border'
                        />
                      ) : (
                        <div className='h-10 w-10 rounded-full bg-zinc-800 text-white text-center flex justify-center items-center'>
                          {user?.given_name?.[0] || 'U'}
                        </div>
                      )}
                      <div className='ml-3'>
                        <p className='text-sm font-semibold'>
                          Hi, {user?.given_name || 'User'}
                        </p>
                        <p className='text-xs text-gray-500'>{user?.email}</p>
                      </div>
                    </div>
                    <LogoutLink className='block text-center text-white px-4 py-2 bg-slate-700 hover:bg-slate-900 hover:text-white transition duration-300 rounded-lg mx-4'>
                      Logout
                    </LogoutLink>
                  </div>
                )}
              </div>
            ) : (
              <LoginLink className='text-white px-4 py-2 bg-teal-900 hover:bg-teal-800 transition duration-300 rounded-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-opacity-50'>
                Log in
              </LoginLink>
            )}
          </li>
        </ul>
      </nav>

      {/* Mobile Menu */}
      <OutsideClickHandler
        onOutsideClick={() => {
          setIsMobileMenuOpen(false);
        }}
      >
        <div
          className={`fixed inset-y-0 right-0 bg-gradient-to-r from-slate-400 to-slate-200 shadow-lg md:hidden transform transition-transform duration-300 mt-20 rounded-s-3xl h-[88vh] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ zIndex: 999 }}
        >
          <nav className='w-60 h-full flex flex-col '>
            <div className='flex items-center justify-center px-4 py-3 border-b border-slate-300'>
              <Link href={'/'}>
              <h2 className='text-xl p-1 font-semibold text-lime-100'>
                Phoenix carehome
              </h2>
              </Link>
              <button
                className='text-lime-100 text-2xl pl-1'
                onClick={closeMobileMenu} // Close mobile menu on click
              >
                &times;
              </button>
            </div>

            {/* Profile Section */}
            {isAuthenticated ? (
              <div className='w-full p-4 bg-gradient-to-r from-slate-300 to-slate-400'>
                <div
                  className='cursor-pointer flex items-center justify-center'
                  onClick={toggleDropdown}
                  ref={profilePicRef}
                >
                  {user?.picture ? (
                    <Image
                      src={user.picture}
                      alt='Profile picture'
                      width={60}
                      height={60}
                      className='rounded-full border'
                    />
                  ) : (
                    <div className='h-12 w-12 rounded-full bg-gray-400 text-gray-800 text-center flex justify-center items-center'>
                      {user?.given_name?.[0] || 'U'}
                    </div>
                  )}
                </div>

                {/* User Details */}
                <div className='flex flex-col items-center mt-2'>
                  <p className='text-sm font-semibold text-lime-100'>
                    Hi, {user?.given_name || 'User'}
                  </p>
                  <p className='text-xs text-lime-100'>{user?.email}</p>
                </div>

                {isDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className='w-full mt-3 bg-slate-200 rounded-lg shadow-lg py-2 '
                  >
                    <div className='flex flex-col items-center px-4'>
                      <LogoutLink className='text-gray-800 px-12 py-2 bg-slate-400 hover:bg-slate-300 transition duration-300 rounded-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75'>
                        Logout
                      </LogoutLink>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='w-full px-4 flex flex-col items-center mt-6'>
                <LoginLink className='text-gray-800 px-12 py-2 bg-slate-400 hover:bg-slate-300 transition duration-300 rounded-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75'>
                  Login
                </LoginLink>
              </div>
            )}

            {/* Navigation Links */}
            <div className="mt-4 p-4 text-gray-800 flex-grow">
            <ul className='flex flex-col gap-y-4 py-4 px-4'>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className={`block text-lime-100 text-md py-3 px-4 rounded-lg hover:bg-slate-300 hover:shadow-lg transition duration-300 ${
                      pathname === link.href
                        ? 'bg-slate-300 font-extrabold' : ''
                    }`}
                    href={link.href}
                    onClick={closeMobileMenu} // Close mobile menu on link click
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            </div>
            {/* Bottom Section - Fixed to Bottom */}
    <div className="mt-auto bg-slate-400">
      <hr className="border-slate-300" />
      <p className="text-center text-xs text-lime-100 py-4">
        Deerpark work timetable
      </p>
    </div>
          </nav>
        </div>
      </OutsideClickHandler>
    </header>
  );
};

export default Header;





