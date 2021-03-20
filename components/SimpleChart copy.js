import useSWR from "swr";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const dddd = [
  {
    name: "Page A",
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: "Page C",
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: "Page D",
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: "Page E",
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: "Page F",
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: "Page G",
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

const SimpleChart = () => {
  const fetcher = (...args) =>
    fetch(...args)
      .then((res) => res.json())
      .then((res) => res.data);

  const { data, error } = useSWR("/api/metrics/daily-views", fetcher);

  if (error) return <div>failed to load</div>;
  if (!data) return <div>loading...</div>;

  return (
    <div className="bg-white w-full overflow-hidden shadow rounded-lg divide-y divide-gray-200">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Daily Views
        </h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="range" stroke="#9ca3af" tick={{ dx: -15 }} />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            <Bar dataKey="views" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimpleChart;
