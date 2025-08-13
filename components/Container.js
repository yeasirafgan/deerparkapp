//mainfolder/components/Container.js
const Container = ({ children }) => {
  return (
    <div className='w-full bg-white min-h-screen flex flex-col'>
      {children}
    </div>
  );
};

export default Container;
