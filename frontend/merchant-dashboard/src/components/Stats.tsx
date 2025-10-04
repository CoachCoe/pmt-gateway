import { DollarSign, TrendingUp, Users, Clock } from 'lucide-react'

export function Stats() {
  // TODO: Fetch real stats from blockchain
  const stats = [
    { label: 'Total Volume', value: '$12,345', change: '+12.5%', icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Successful Payments', value: '42', change: '+8', icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Pending Payouts', value: '3', change: '2.5 DOT', icon: Clock, color: 'bg-yellow-500' },
    { label: 'Platform Fee', value: '2.5%', change: '250 bps', icon: Users, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="font-medium text-gray-900">Create Payment Link</div>
            <div className="text-sm text-gray-500 mt-1">Generate a new payment intent</div>
          </button>
          <button className="px-4 py-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="font-medium text-gray-900">View API Docs</div>
            <div className="text-sm text-gray-500 mt-1">Integration documentation</div>
          </button>
          <button className="px-4 py-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="font-medium text-gray-900">Download SDK</div>
            <div className="text-sm text-gray-500 mt-1">JavaScript & Python SDKs</div>
          </button>
        </div>
      </div>
    </div>
  )
}
