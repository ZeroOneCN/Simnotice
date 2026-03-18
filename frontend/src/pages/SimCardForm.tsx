import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { simApi } from '@/services/api';
import type { Carrier, SimCardFormData } from '@/types';

interface SimCardFormProps {
  id: number | null;
  carriers: Carrier[];
  onSuccess: () => void;
  onCancel: () => void;
}

const SimCardForm = ({ id, carriers, onSuccess, onCancel }: SimCardFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SimCardFormData>({
    phone_number: '',
    carrier: '',
    balance: 0,
    monthly_fee: 0,
    billing_day: 1,
    location: '',
    data_plan: '',
    call_minutes: '',
    sms_count: '',
    activation_date: '',
  });

  const isEditing = !!id;

  // 加载SIM卡数据（编辑模式）
  useEffect(() => {
    if (!isEditing) return;
    const loadSimCard = async () => {
      setLoading(true);
      try {
        const res = await simApi.getById(id);
        const data = res.data;
        // 处理日期格式：支持 "2015-07-25 16:00:00" 或 "2015-07-25T16:00:00" 格式
        let activationDate = '';
        if (data.activation_date) {
          activationDate = data.activation_date.split(' ')[0].split('T')[0];
        }
        setFormData({
          phone_number: data.phone_number,
          carrier: data.carrier,
          balance: data.balance,
          monthly_fee: data.monthly_fee,
          billing_day: data.billing_day,
          location: data.location || '',
          data_plan: data.data_plan || '',
          call_minutes: data.call_minutes || '',
          sms_count: data.sms_count || '',
          activation_date: activationDate,
        });
      } catch (error) {
        console.error('获取SIM卡数据失败:', error);
        toast.error('获取SIM卡数据失败');
      } finally {
        setLoading(false);
      }
    };
    loadSimCard();
  }, [id, isEditing]);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await simApi.update(id, formData);
        toast.success('SIM卡更新成功');
      } else {
        await simApi.create(formData);
        toast.success('SIM卡添加成功');
      }
      onSuccess();
    } catch (error) {
      console.error(isEditing ? '更新失败:' : '添加失败:', error);
      toast.error(isEditing ? '更新失败' : '添加失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone_number">电话号码 <span className="text-red-500">*</span></Label>
          <Input
            id="phone_number"
            value={formData.phone_number}
            onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="请输入电话号码"
            required
          />
        </div>

        <div>
          <Label htmlFor="carrier">运营商 <span className="text-red-500">*</span></Label>
          <Select value={formData.carrier} onValueChange={v => setFormData({ ...formData, carrier: v })}>
            <SelectTrigger>
              <SelectValue placeholder="请选择运营商" />
            </SelectTrigger>
            <SelectContent>
              {carriers.map(carrier => (
                <SelectItem key={carrier.id} value={carrier.name}>{carrier.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="balance">余额 (元) <span className="text-red-500">*</span></Label>
          <Input
            id="balance"
            type="number"
            step="0.01"
            value={formData.balance}
            onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <Label htmlFor="monthly_fee">月租 (元) <span className="text-red-500">*</span></Label>
          <Input
            id="monthly_fee"
            type="number"
            step="0.01"
            value={formData.monthly_fee}
            onChange={e => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <Label htmlFor="billing_day">月结日 <span className="text-red-500">*</span></Label>
          <Input
            id="billing_day"
            type="number"
            min={1}
            max={31}
            value={formData.billing_day}
            onChange={e => setFormData({ ...formData, billing_day: parseInt(e.target.value) || 1 })}
            required
          />
        </div>

        <div>
          <Label htmlFor="location">归属地</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={e => setFormData({ ...formData, location: e.target.value })}
            placeholder="例如：上海"
          />
        </div>

        <div>
          <Label htmlFor="data_plan">流量套餐</Label>
          <Input
            id="data_plan"
            value={formData.data_plan}
            onChange={e => setFormData({ ...formData, data_plan: e.target.value })}
            placeholder="例如：5GB/月"
          />
        </div>

        <div>
          <Label htmlFor="call_minutes">通话分钟</Label>
          <Input
            id="call_minutes"
            value={formData.call_minutes}
            onChange={e => setFormData({ ...formData, call_minutes: e.target.value })}
            placeholder="例如：100分钟/月"
          />
        </div>

        <div>
          <Label htmlFor="sms_count">短信条数</Label>
          <Input
            id="sms_count"
            value={formData.sms_count}
            onChange={e => setFormData({ ...formData, sms_count: e.target.value })}
            placeholder="例如：50条/月"
          />
        </div>

        <div>
          <Label htmlFor="activation_date">开卡时间</Label>
          <Input
            id="activation_date"
            type="date"
            value={formData.activation_date}
            onChange={e => setFormData({ ...formData, activation_date: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={loading}>
          {loading ? '提交中...' : (isEditing ? '更新' : '添加')}
        </Button>
      </div>
    </form>
  );
};

export default SimCardForm;