import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Send, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { settingsApi, carrierApi } from '@/services/api';
import type { Carrier, SettingsForm } from '@/types';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [isCarrierModalVisible, setIsCarrierModalVisible] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [carrierName, setCarrierName] = useState('');
  const [deleteCarrierId, setDeleteCarrierId] = useState<number | null>(null);

  // 设置表单
  const [settings, setSettings] = useState<SettingsForm>({
    notification_type: 'email',
    email_enabled: true,
    email_subject: '',
    email_template: '',
    wechat_enabled: false,
    wechat_webhook_url: '',
    wechat_template: '',
    balance_threshold: 10,
    notification_days_before: 3,
  });

  // 测试状态
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testWechatLoading, setTestWechatLoading] = useState(false);

  // 加载设置
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingsApi.getAll();
      const formValues: Partial<SettingsForm> = {};
      res.data.forEach((setting: { setting_key: string; setting_value: string }) => {
        let value: string | number | boolean = setting.setting_value;
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        if (setting.setting_key === 'balance_threshold' || setting.setting_key === 'notification_days_before') {
          value = parseFloat(value as string);
        }
        (formValues as Record<string, string | number | boolean>)[setting.setting_key] = value;
      });
      setSettings(prev => ({ ...prev, ...formValues as SettingsForm }));
    } catch (error) {
      console.error('获取设置失败:', error);
      toast.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载运营商
  const loadCarriers = useCallback(async () => {
    setCarriersLoading(true);
    try {
      const res = await carrierApi.getAll();
      setCarriers(res.data);
    } catch (error) {
      console.error('获取运营商数据失败:', error);
      toast.error('获取运营商数据失败');
    } finally {
      setCarriersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadCarriers();
  }, [loadSettings, loadCarriers]);

  // 保存设置
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await settingsApi.batchUpdate(settings as unknown as Record<string, string | number | boolean>);
      toast.success('设置保存成功');
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试邮件
  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱地址');
      return;
    }
    setTestEmailLoading(true);
    try {
      await settingsApi.testEmail(testEmail);
      toast.success('测试邮件发送成功');
    } catch (error) {
      console.error('测试邮件发送失败:', error);
      toast.error('测试邮件发送失败');
    } finally {
      setTestEmailLoading(false);
    }
  };

  // 测试企业微信
  const handleTestWechat = async () => {
    setTestWechatLoading(true);
    try {
      await settingsApi.testWechat();
      toast.success('企业微信测试成功');
    } catch (error) {
      console.error('企业微信测试失败:', error);
      toast.error('企业微信测试失败');
    } finally {
      setTestWechatLoading(false);
    }
  };

  // 运营商操作
  const handleSaveCarrier = async () => {
    if (!carrierName.trim()) {
      toast.error('请输入运营商名称');
      return;
    }
    try {
      if (editingCarrier) {
        await carrierApi.update(editingCarrier.id, { name: carrierName });
        toast.success('运营商更新成功');
      } else {
        await carrierApi.create({ name: carrierName });
        toast.success('运营商添加成功');
      }
      setIsCarrierModalVisible(false);
      loadCarriers();
    } catch (error) {
      console.error('保存运营商失败:', error);
      toast.error('保存运营商失败');
    }
  };

  const handleDeleteCarrier = async () => {
    if (!deleteCarrierId) return;
    try {
      await carrierApi.delete(deleteCarrierId);
      toast.success('运营商删除成功');
      loadCarriers();
    } catch (error) {
      console.error('删除运营商失败:', error);
      toast.error('删除运营商失败');
    } finally {
      setDeleteCarrierId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="notification">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="notification" className="flex-1 sm:flex-none">通知设置</TabsTrigger>
          <TabsTrigger value="carrier" className="flex-1 sm:flex-none">运营商管理</TabsTrigger>
        </TabsList>

        <TabsContent value="notification" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">提醒设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 通知方式 */}
              <div>
                <Label className="text-sm font-medium">通知方式</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { value: 'email', label: '邮件通知' },
                    { value: 'wechat', label: '企业微信' },
                    { value: 'both', label: '两者都启用' },
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="notification_type"
                        value={option.value}
                        checked={settings.notification_type === option.value}
                        onChange={() => setSettings({ ...settings, notification_type: option.value as 'email' | 'wechat' | 'both' })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 邮件通知设置 */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 text-sm">邮件通知设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm">启用邮件通知</Label>
                    <Switch
                      checked={settings.email_enabled}
                      onCheckedChange={v => setSettings({ ...settings, email_enabled: v })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">邮件主题</Label>
                    <Input
                      value={settings.email_subject}
                      onChange={e => setSettings({ ...settings, email_subject: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">邮件模板（HTML格式）</Label>
                    <Textarea
                      rows={4}
                      value={settings.email_template}
                      onChange={e => setSettings({ ...settings, email_template: e.target.value })}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 企业微信通知设置 */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 text-sm">企业微信通知设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm">启用企业微信通知</Label>
                    <Switch
                      checked={settings.wechat_enabled}
                      onCheckedChange={v => setSettings({ ...settings, wechat_enabled: v })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Webhook地址</Label>
                    <Input
                      placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx"
                      value={settings.wechat_webhook_url}
                      onChange={e => setSettings({ ...settings, wechat_webhook_url: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">企业微信消息模板</Label>
                    <Textarea
                      rows={3}
                      value={settings.wechat_template}
                      onChange={e => setSettings({ ...settings, wechat_template: e.target.value })}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 通用设置 */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 text-sm">通用设置</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">余额阈值（元）</Label>
                    <Input
                      type="number"
                      value={settings.balance_threshold}
                      onChange={e => setSettings({ ...settings, balance_threshold: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">提前通知天数</Label>
                    <Input
                      type="number"
                      value={settings.notification_days_before}
                      onChange={e => setSettings({ ...settings, notification_days_before: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={loading} className="w-full sm:w-auto">
                {loading ? '保存中...' : '保存设置'}
              </Button>
            </CardContent>
          </Card>

          {/* 测试通知 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">测试通知</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="email">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="email" className="flex-1 sm:flex-none">测试邮件</TabsTrigger>
                  <TabsTrigger value="wechat" className="flex-1 sm:flex-none">测试企业微信</TabsTrigger>
                </TabsList>
                <TabsContent value="email" className="mt-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="请输入测试接收邮箱"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleTestEmail} disabled={testEmailLoading} className="w-full sm:w-auto">
                      <Send className="h-4 w-4 mr-2" />
                      发送测试邮件
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="wechat" className="mt-4">
                  <Button onClick={handleTestWechat} disabled={testWechatLoading}>
                    <Wifi className="h-4 w-4 mr-2" />
                    发送企业微信测试通知
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 运营商管理 */}
        <TabsContent value="carrier" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-lg">运营商管理</CardTitle>
                <Button onClick={() => { setEditingCarrier(null); setCarrierName(''); setIsCarrierModalVisible(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加运营商
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 桌面端表格 */}
              <div className="hidden sm:block border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">名称</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carriersLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8">加载中...</TableCell>
                      </TableRow>
                    ) : carriers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8">暂无数据</TableCell>
                      </TableRow>
                    ) : (
                      carriers.map(carrier => (
                        <TableRow key={carrier.id}>
                          <TableCell className="text-center font-medium">{carrier.name}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCarrier(carrier);
                                  setCarrierName(carrier.name);
                                  setIsCarrierModalVisible(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setDeleteCarrierId(carrier.id)}
                              >
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

              {/* 移动端卡片视图 */}
              <div className="sm:hidden space-y-2">
                {carriersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : carriers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">暂无数据</div>
                ) : (
                  carriers.map(carrier => (
                    <div key={carrier.id} className="flex items-center justify-between p-3 border rounded-md">
                      <span className="font-medium">{carrier.name}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCarrier(carrier);
                            setCarrierName(carrier.name);
                            setIsCarrierModalVisible(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setDeleteCarrierId(carrier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 运营商弹窗 */}
      <Dialog open={isCarrierModalVisible} onOpenChange={setIsCarrierModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCarrier ? '编辑运营商' : '添加运营商'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>运营商名称</Label>
              <Input
                value={carrierName}
                onChange={e => setCarrierName(e.target.value)}
                placeholder="请输入运营商名称"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCarrierModalVisible(false)}>取消</Button>
              <Button onClick={handleSaveCarrier}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteCarrierId} onOpenChange={() => setDeleteCarrierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个运营商吗？</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCarrier} className="bg-destructive text-destructive-foreground">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;