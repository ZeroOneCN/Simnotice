import { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, RefreshCw, Wallet, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { simApi, carrierApi } from '@/services/api';
import type { SimCard, Carrier, RechargeForm } from '@/types';
import SimCardForm from './SimCardForm';

const SimCardList = () => {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [filteredSimCards, setFilteredSimCards] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSimId, setCurrentSimId] = useState<number | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // 筛选状态
  const [filters, setFilters] = useState({
    phoneNumber: '',
    carrier: '',
    location: '',
    balanceMin: '',
    balanceMax: '',
  });

  // 充值弹窗状态
  const [isRechargeModalVisible, setIsRechargeModalVisible] = useState(false);
  const [currentRechargeCard, setCurrentRechargeCard] = useState<SimCard | null>(null);
  const [rechargeForm, setRechargeForm] = useState<RechargeForm>({ amount: 0, description: '' });
  const [rechargingLoading, setRechargingLoading] = useState(false);

  // 删除确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [simToDelete, setSimToDelete] = useState<number | null>(null);

  // 加载SIM卡数据
  const loadSimCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await simApi.getAll();
      const sortedData = res.data.sort((a: SimCard, b: SimCard) => {
        if (!a.activation_date) return 1;
        if (!b.activation_date) return -1;
        return new Date(a.activation_date).getTime() - new Date(b.activation_date).getTime();
      });
      setSimCards(sortedData);
      setFilteredSimCards(sortedData);
    } catch (error) {
      console.error('获取SIM卡数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载运营商数据
  const loadCarriers = useCallback(async () => {
    try {
      const res = await carrierApi.getAll();
      setCarriers(res.data);
    } catch (error) {
      console.error('获取运营商数据失败:', error);
    }
  }, []);

  useEffect(() => {
    loadSimCards();
    loadCarriers();
  }, [loadSimCards, loadCarriers]);

  // 删除SIM卡
  const handleDelete = async () => {
    if (!simToDelete) return;
    try {
      await simApi.delete(simToDelete);
      toast.success('SIM卡删除成功');
      loadSimCards();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    } finally {
      setDeleteDialogOpen(false);
      setSimToDelete(null);
    }
  };

  // 计算入网时间
  const calculateYearsAndMonths = (date: string | null) => {
    if (!date) return '-';
    const activationDate = dayjs(date);
    const today = dayjs();
    const monthsDiff = today.diff(activationDate, 'month');
    const years = Math.floor(monthsDiff / 12);
    const months = monthsDiff % 12;
    let result = '';
    if (years > 0) result += `${years}年`;
    if (months > 0 || years === 0) result += `${months}个月`;
    return result;
  };

  // 应用筛选
  const applyFilters = () => {
    let result = [...simCards];
    if (filters.phoneNumber) {
      result = result.filter(card => card.phone_number.includes(filters.phoneNumber));
    }
    if (filters.carrier) {
      result = result.filter(card => card.carrier === filters.carrier);
    }
    if (filters.location) {
      result = result.filter(card => card.location?.includes(filters.location));
    }
    if (filters.balanceMin) {
      result = result.filter(card => card.balance >= parseFloat(filters.balanceMin));
    }
    if (filters.balanceMax) {
      result = result.filter(card => card.balance <= parseFloat(filters.balanceMax));
    }
    setFilteredSimCards(result);
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({ phoneNumber: '', carrier: '', location: '', balanceMin: '', balanceMax: '' });
    setFilteredSimCards(simCards);
  };

  // 充值提交
  const handleRechargeSubmit = async () => {
    if (!currentRechargeCard) return;
    setRechargingLoading(true);
    try {
      await simApi.recharge(currentRechargeCard.id, rechargeForm);
      toast.success(`充值成功，余额已更新`);
      setIsRechargeModalVisible(false);
      loadSimCards();
    } catch (error) {
      console.error('充值失败:', error);
      toast.error('充值失败');
    } finally {
      setRechargingLoading(false);
    }
  };

  // 获取运营商颜色
  const getCarrierColor = (carrier: string) => {
    const colors: Record<string, string> = {
      '中国移动': 'bg-blue-100 text-blue-800',
      '中国电信': 'bg-sky-100 text-sky-800',
      '中国联通': 'bg-red-100 text-red-800',
      '中国广电': 'bg-green-100 text-green-800',
    };
    return colors[carrier] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          {/* 工具栏 - 响应式布局 */}
          <div className="flex flex-col gap-4">
            {/* 第一行：按钮组 */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setCurrentSimId(null); setIsModalVisible(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                添加SIM卡
              </Button>
              <Button variant="outline" onClick={() => setFiltersVisible(!filtersVisible)}>
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{filtersVisible ? '隐藏筛选' : '显示筛选'}</span>
                <span className="sm:hidden">筛选</span>
              </Button>
              <Button variant="outline" onClick={loadSimCards}>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">刷新</span>
              </Button>
            </div>
            {/* 第二行：搜索框 */}
            <div className="flex gap-2">
              <Input
                placeholder="搜索号码..."
                value={filters.phoneNumber}
                onChange={e => setFilters({ ...filters, phoneNumber: e.target.value })}
                className="flex-1 max-w-xs"
              />
              <Button onClick={applyFilters}>
                <Search className="h-4 w-4 mr-2" />
                搜索
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 筛选面板 */}
          {filtersVisible && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">运营商</Label>
                    <Select value={filters.carrier} onValueChange={v => setFilters({ ...filters, carrier: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择运营商" />
                      </SelectTrigger>
                      <SelectContent>
                        {carriers.map(carrier => (
                          <SelectItem key={carrier.id} value={carrier.name}>{carrier.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">归属地</Label>
                    <Input
                      placeholder="输入归属地"
                      value={filters.location}
                      onChange={e => setFilters({ ...filters, location: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">最小余额</Label>
                    <Input
                      type="number"
                      placeholder="最小值"
                      value={filters.balanceMin}
                      onChange={e => setFilters({ ...filters, balanceMin: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">最大余额</Label>
                    <Input
                      type="number"
                      placeholder="最大值"
                      value={filters.balanceMax}
                      onChange={e => setFilters({ ...filters, balanceMax: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button size="sm" onClick={applyFilters}>应用筛选</Button>
                  <Button size="sm" variant="outline" onClick={resetFilters}>重置</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 移动端卡片视图 */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : filteredSimCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无数据</div>
            ) : (
              filteredSimCards.map(card => (
                <Card key={card.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-lg">{card.phone_number}</div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getCarrierColor(card.carrier)}`}>
                          {card.carrier}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-primary">{card.balance} 元</div>
                        <div className="text-xs text-muted-foreground">月租 {card.monthly_fee} 元</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                      <div>归属地：{card.location || '-'}</div>
                      <div>月结日：{card.billing_day} 日</div>
                      <div>流量：{card.data_plan || '-'}</div>
                      <div>通话：{card.call_minutes || '-'}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      入网：{card.activation_date ? dayjs(card.activation_date).format('YYYY-MM-DD') : '-'}
                      {card.activation_date && ` (${calculateYearsAndMonths(card.activation_date)})`}
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setCurrentSimId(card.id); setIsModalVisible(true); }}>
                        <Pencil className="h-3 w-3 mr-1" /> 编辑
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setCurrentRechargeCard(card); setIsRechargeModalVisible(true); }}>
                        <Wallet className="h-3 w-3 mr-1" /> 充值
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setSimToDelete(card.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* 桌面端表格视图 */}
          <div className="hidden md:block border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center whitespace-nowrap">号码</TableHead>
                  <TableHead className="text-center whitespace-nowrap">余额</TableHead>
                  <TableHead className="text-center whitespace-nowrap">运营商</TableHead>
                  <TableHead className="text-center whitespace-nowrap">归属地</TableHead>
                  <TableHead className="text-center whitespace-nowrap">月租</TableHead>
                  <TableHead className="text-center whitespace-nowrap">月结日</TableHead>
                  <TableHead className="text-center whitespace-nowrap">流量</TableHead>
                  <TableHead className="text-center whitespace-nowrap">通话</TableHead>
                  <TableHead className="text-center whitespace-nowrap">短信</TableHead>
                  <TableHead className="text-center whitespace-nowrap">入网时间</TableHead>
                  <TableHead className="text-center whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">加载中...</TableCell>
                  </TableRow>
                ) : filteredSimCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">暂无数据</TableCell>
                  </TableRow>
                ) : (
                  filteredSimCards.map(card => (
                    <TableRow key={card.id}>
                      <TableCell className="text-center font-medium">{card.phone_number}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">{card.balance} 元</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getCarrierColor(card.carrier)}`}>
                          {card.carrier}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{card.location || '-'}</TableCell>
                      <TableCell className="text-center">{card.monthly_fee} 元</TableCell>
                      <TableCell className="text-center">{card.billing_day} 日</TableCell>
                      <TableCell className="text-center">{card.data_plan || '-'}</TableCell>
                      <TableCell className="text-center">{card.call_minutes || '-'}</TableCell>
                      <TableCell className="text-center">{card.sms_count || '-'}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {card.activation_date ? (
                          <div>
                            {dayjs(card.activation_date).format('YYYY-MM-DD')}
                            <span className="text-xs text-muted-foreground ml-1">({calculateYearsAndMonths(card.activation_date)})</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="sm" variant="ghost" title="编辑" onClick={() => { setCurrentSimId(card.id); setIsModalVisible(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="充值" onClick={() => { setCurrentRechargeCard(card); setIsRechargeModalVisible(true); }}>
                            <Wallet className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" title="删除" onClick={() => { setSimToDelete(card.id); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 添加/编辑弹窗 */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentSimId ? '编辑SIM卡' : '添加SIM卡'}</DialogTitle>
          </DialogHeader>
          <SimCardForm
            id={currentSimId}
            carriers={carriers}
            onSuccess={() => { setIsModalVisible(false); loadSimCards(); }}
            onCancel={() => setIsModalVisible(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 充值弹窗 */}
      <Dialog open={isRechargeModalVisible} onOpenChange={setIsRechargeModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>充值余额 - {currentRechargeCard?.phone_number}</DialogTitle>
          </DialogHeader>
          {currentRechargeCard && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md space-y-1">
                <p><strong>号码：</strong>{currentRechargeCard.phone_number}</p>
                <p><strong>运营商：</strong>{currentRechargeCard.carrier}</p>
                <p><strong>当前余额：</strong>{currentRechargeCard.balance} 元</p>
              </div>
              <div>
                <Label>充值金额</Label>
                <Input
                  type="number"
                  value={rechargeForm.amount}
                  onChange={e => setRechargeForm({ ...rechargeForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>备注</Label>
                <Input
                  value={rechargeForm.description || ''}
                  onChange={e => setRechargeForm({ ...rechargeForm, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRechargeModalVisible(false)}>取消</Button>
                <Button onClick={handleRechargeSubmit} disabled={rechargingLoading}>确认充值</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这张SIM卡吗？</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SimCardList;