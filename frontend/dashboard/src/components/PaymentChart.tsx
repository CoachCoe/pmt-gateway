import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PaymentIntent } from '@/types';
import { formatDate } from '@/utils/format';

interface PaymentChartProps {
  data: PaymentIntent[];
}

export function PaymentChart({ data }: PaymentChartProps) {
  // Group payments by date and calculate daily totals
  const chartData = data.reduce((acc, payment) => {
    const date = payment.createdAt.split('T')[0];
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.amount += payment.amount;
      existing.count += 1;
    } else {
      acc.push({
        date,
        amount: payment.amount,
        count: 1,
        formattedDate: formatDate(payment.createdAt),
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; amount: number; count: number; formattedDate: string }>)
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(-7); // Last 7 days

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No payment data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              name === 'amount' ? `$${(value / 100).toFixed(2)}` : value,
              name === 'amount' ? 'Amount' : 'Count'
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#0ea5e9" 
            strokeWidth={2}
            dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
