//mainfolder/components/Container.js
const Container = ({ children }) => {
  return (
    <div className='max-w-[1250px] mx-auto bg-white min-h-screen flex flex-col border-l border-r'>
      {children}
    </div>
  );
};

export default Container;
