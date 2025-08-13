export const metadata = {
  title: 'Phoenix carehome',
  description: 'Simple timesheet app for Deerpark staffs...',
};

const Home = () => {
  return (
    <>
      <main className='flex flex-col items-center justify-center flex-1 w-full px-4 bg-gradient-to-r from-gray-50 to-gray-100 min-h-[calc(100vh-100px)]'>
        <div className='text-center max-w-2xl'>
          <h1 className='text-4xl md:text-5xl font-extrabold text-gray-700 mb-4'>
            Deer Park Timesheet.
          </h1>
          <p className='text-lg md:text-xl text-slate-700 font-semibold'>
            Please submit your hours...
          </p>
        </div>
      </main>
    </>
  );
};

export default Home;
