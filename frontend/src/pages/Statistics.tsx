import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { simApi } from '@/services/api';
import type { SimCard } from '@/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface MonthlyData {
  month: string;
  total: number;
  count: number;
}

interface CarrierData {
  name: string;
  value: number;
}

interface BalanceRangeData {
  range: string;
  count: number;
  avgBalance: number;
}

interface SimCumulativeData {
  sim_id: number;
  phone_number: string;
  bill_count: number;
  total_paid: number;
  avg_monthly_fee: number;
  first_month: string;
  last_month: string;
}

const Statistics = () => {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [carrierData, setCarrierData] = useState<CarrierData[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceRangeData[]>([]);
  const [simCumulativeData, setSimCumulativeData] = useState<SimCumulativeData[]>([]);

  // 加载 SIM 卡数据
  const loadSimCards = useCallback(async () => {
    try {
      const res = await simApi.getAll();
      setSimCards(res.data);
    } catch (error) {
      console.error('获取 SIM 卡数据失败:', error);
    }
  }, []);

  // 加载账单记录
  const loadBillRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/bills/stats/by-sim');
      if (res.ok) {
        const data = await res.json();
        setSimCumulativeData(data);
      }
    } catch (error) {
      console.error('获取账单记录失败:', error);
    }
  }, []);

  useEffect(() => {
    loadSimCards();
    loadBillRecords();
  }, [loadSimCards, loadBillRecords]);

  // 计算单个号码累计扣费（基于实际账单）
  useEffect(() => {
    if (simCumulativeData.length === 0) {
      return;
    }
  }, [simCumulativeData]);

  // 计算月度扣费统计
  useEffect(() => {
    if (simCards.length === 0) return;

    const filteredCards = selectedCarrier === 'all' 
      ? simCards 
      : simCards.filter(card => card.carrier === selectedCarrier);

    const monthMap = new Map<string, { total: number; count: number }>();
    
    filteredCards.forEach(card => {
      const billingDay = card.billing_day || 1;
      const monthKey = `第${billingDay}日`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { total: 0, count: 0 });
      }
      const data = monthMap.get(monthKey)!;
      data.total += Number(card.monthly_fee) || 0;
      data.count += 1;
    });

    const data = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        total: parseFloat(data.total.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => parseInt(a.month.replace('第', '')) - parseInt(b.month.replace('第', '')));

    setMonthlyData(data);
  }, [simCards, selectedCarrier]);

  // 计算运营商分布
  useEffect(() => {
    if (simCards.length === 0) return;

    const carrierMap = new Map<string, number>();
    simCards.forEach(card => {
      const fee = Number(card.monthly_fee) || 0;
      carrierMap.set(card.carrier, (carrierMap.get(card.carrier) || 0) + fee);
    });

    const data = Array.from(carrierMap.entries()).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));

    setCarrierData(data);
  }, [simCards]);

  // 计算余额分布
  useEffect(() => {
    if (simCards.length === 0) return;

    const filteredCards = selectedCarrier === 'all' 
      ? simCards 
      : simCards.filter(card => card.carrier === selectedCarrier);

    const balanceRanges = [
      { range: '0-10 元', min: 0, max: 10, count: 0, total: 0 },
      { range: '10-30 元', min: 10, max: 30, count: 0, total: 0 },
      { range: '30-50 元', min: 30, max: 50, count: 0, total: 0 },
      { range: '50-100 元', min: 50, max: 100, count: 0, total: 0 },
      { range: '100 元以上', min: 100, max: Infinity, count: 0, total: 0 },
    ];

    filteredCards.forEach(card => {
      const balance = Number(card.balance) || 0;
      const range = balanceRanges.find(r => balance >= r.min && balance < r.max);
      if (range) {
        range.count += 1;
        range.total += balance;
      }
    });

    setBalanceData(balanceRanges.map(r => ({
      range: r.range,
      count: r.count,
      avgBalance: r.count > 0 ? parseFloat((r.total / r.count).toFixed(2)) : 0,
    })));
  }, [simCards, selectedCarrier]);

  // 获取运营商列表
  const carriers = useMemo(() => 
    Array.from(new Set(simCards.map(card => card.carrier))), 
    [simCards]
  );

  // 计算总计
  const { totalCards, totalMonthlyFee, totalBalance, lowBalanceCount, totalBills, totalPaid } = useMemo(() => {
    const totalCards = simCards.length;
    const totalMonthlyFee = simCards.reduce((sum, card) => sum + (Number(card.monthly_fee) || 0), 0);
    const totalBalance = simCards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);
    const lowBalanceCount = simCards.filter(card => Number(card.balance) < 10).length;
    const totalBills = simCumulativeData.reduce((sum, record) => sum + (record.bill_count || 0), 0);
    const totalPaid = simCumulativeData.reduce((sum, record) => sum + (record.total_paid || 0), 0);
    return { totalCards, totalMonthlyFee, totalBalance, lowBalanceCount, totalBills, totalPaid };
  }, [simCards, simCumulativeData]);

  // 导出账单模板
  const handleExportTemplate = () => {
    const headers = ['月份 (YYYY-MM)', '电话号码', '月租', '实际扣费', '额外费用', '总费用', '备注'];
    const rows = simCards.map(card => [
      '2026-03',
      card.phone_number,
      card.monthly_fee,
      card.monthly_fee,
      0,
      card.monthly_fee,
      ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '账单导入模板.csv';
    link.click();
  };

  // 导出已录入的账单
  const handleExportBills = () => {
    if (simCumulativeData.length === 0) {
      alert('暂无账单数据可导出');
      return;
    }
    
    const headers = ['号码', '账单月数', '平均月费', '累计扣费', '数据期间'];
    const rows = simCumulativeData.map(s => [
      s.phone_number,
      s.bill_count,
      s.avg_monthly_fee,
      s.total_paid,
      `${s.first_month} ~ ${s.last_month}`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `扣费统计_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSelectChange = useCallback((value: string) => {
    setSelectedCarrier(value);
  }, []);

  return (
    <div className="space-y-4">
      {/* 顶部筛选和操作 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>数据筛选</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportTemplate}>
                下载导入模板
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportBills}>
                导出已录入账单
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">运营商：</span>
              <Select value={selectedCarrier} onValueChange={handleSelectChange}>
                <SelectTrigger className="w-[150px]" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent onClick={(e) => e.stopPropagation()}>
                  <SelectItem value="all">全部</SelectItem>
                  {carriers.map(carrier => (
                    <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总卡数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">月租总计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalMonthlyFee.toFixed(2)} 元</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">余额总计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalBalance.toFixed(2)} 元</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">低余额告警</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowBalanceCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">账单记录数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">累计扣费</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalPaid.toFixed(2)} 元</div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 月度扣费统计 */}
        <Card>
          <CardHeader>
            <CardTitle>按月结日扣费统计</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total" name="月租总额 (元)" fill="#0088FE" />
                <Bar yAxisId="right" dataKey="count" name="卡数量" fill="#82CA9D" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 运营商分布 */}
        <Card>
          <CardHeader>
            <CardTitle>运营商月租分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={carrierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {carrierData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 余额分布 */}
        <Card>
          <CardHeader>
            <CardTitle>余额区间分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="卡数量" fill="#82CA9D" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 号码累计扣费趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>号码累计扣费 TOP10</CardTitle>
          </CardHeader>
          <CardContent>
            {simCumulativeData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无账单数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[...simCumulativeData]
                    .sort((a, b) => b.total_paid - a.total_paid)
                    .slice(0, 10)
                    .map(s => ({
                      phone: s.phone_number,
                      total: s.total_paid,
                    }))
                  }
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="phone" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="total" name="累计扣费 (元)" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 号码累计扣费明细表格 */}
      <Card>
        <CardHeader>
          <CardTitle>号码累计扣费明细</CardTitle>
        </CardHeader>
        <CardContent>
          {simCumulativeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无账单数据</p>
              <p className="text-sm mt-2">请前往「账单管理」页面导入账单记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">号码</th>
                    <th className="text-center py-2 px-3">账单月数</th>
                    <th className="text-center py-2 px-3">平均月费</th>
                    <th className="text-center py-2 px-3">数据期间</th>
                    <th className="text-center py-2 px-3">累计扣费</th>
                  </tr>
                </thead>
                <tbody>
                  {simCumulativeData.map(sim => (
                    <tr key={sim.sim_id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{sim.phone_number}</td>
                      <td className="py-2 px-3 text-center">{sim.bill_count} 个月</td>
                      <td className="py-2 px-3 text-center">{sim.avg_monthly_fee.toFixed(2)} 元</td>
                      <td className="py-2 px-3 text-center text-xs">
                        {sim.first_month} ~ {sim.last_month}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-primary">{sim.total_paid.toFixed(2)} 元</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;