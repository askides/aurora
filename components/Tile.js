import CountUp from "react-countup";

const Tile = ({ bgColor = "indigo-400", borderColor = "indigo-500", children }) => (
  <div
    className={`h-96 flex shadow-lg rounded-lg sm:rounded-xl cursor-pointer hover:shadow-xl hover:transform hover:scale-95 hover:-rotate-3 duration-150 flex items-center justify-center hover:border-4 flex text-white text-2xl font-extrabold border-${borderColor} bg-${bgColor}`}>
    <CountUp end={100} />
  </div>
);
export default Tile;
