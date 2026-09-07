import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Download } from 'lucide-react';
import BillImport from './BillImport';
import { simApi } from '@/services/api';
import type { SimCard } from '@/types';

interface BillRecord {
  id: number;
  sim_id: number;
  phone_number: string;
  billing_month: string;
  monthly_fee: number;
  actual_fee: number;
  extra_charges: number;
  total_fee: number;
  note: string;
  created_at: string;
}

const BillManagement = () => {
  const [billRecords, setBillRecords] = useState<BillRecord[]>([]);
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSimCards = useCallback(async () => {
    try {
      const res = await simApi.getAll();
      setSimCards(res.data);
    } catch (error) {
      console.error('获取 SIM 卡数据失败:', error);
    }
  }, []);

  const loadBillRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bills');
      if (res.ok) {
        const data = await res.json();
        setBillRecords(data);
      }
    } catch (error) {
      console.error('获取账单记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSimCards();
    loadBillRecords();
  }, [loadSimCards, loadBillRecords]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条账单记录吗？')) return;
    
    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('删除成功');
        loadBillRecords();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handleExport = () => {
    if (billRecords.length === 0) {
      toast.error('暂无账单数据可导出');
      return;
    }
    
    const headers = ['月份', '电话号码', '运营商', '月租', '实际扣费', '额外费用', '总费用', '备注'];
    const rows = billRecords.map(record => [
      record.billing_month,
      record.phone_number,
      simCards.find(s => s.id === record.sim_id)?.carrier || '',
      record.monthly_fee,
      record.actual_fee,
      record.extra_charges,
      record.total_fee,
      record.note || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `账单导出_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('导出成功');
  };

  const totalPaid = billRecords.reduce((sum, record) => sum + record.total_fee, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>账单管理</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              导出账单
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>月份</TableHead>
                      <TableHead>号码</TableHead>
                      <TableHead className="text-right">月租</TableHead>
                      <TableHead className="text-right">实际</TableHead>
                      <TableHead className="text-right">额外</TableHead>
                      <TableHead className="text-right">总计</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">加载中...</TableCell>
                      </TableRow>
                    ) : billRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无账单记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      billRecords.map(record => (
                        <TableRow key={record.id}>
                          <TableCell>{record.billing_month}</TableCell>
                          <TableCell className="font-medium">{record.phone_number}</TableCell>
                          <TableCell className="text-right">{record.monthly_fee.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{record.actual_fee.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{record.extra_charges.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">{record.total_fee.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <BillImport onImportComplete={loadBillRecords} />
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">统计</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">记录数</span>
                    <span className="font-medium">{billRecords.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">累计扣费</span>
                    <span className="font-semibold text-primary">{totalPaid.toFixed(2)} 元</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillManagement;