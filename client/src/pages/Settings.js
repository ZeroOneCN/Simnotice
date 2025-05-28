import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Switch, InputNumber, Tabs, Card, message, Divider, Table, Space, Popconfirm, Modal, Radio, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;
const { TextArea } = Input;

const Settings = () => {
  const [form] = Form.useForm();
  const [carrierForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState([]);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [carriers, setCarriers] = useState([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [isCarrierModalVisible, setIsCarrierModalVisible] = useState(false);
  const [editingCarrierId, setEditingCarrierId] = useState(null);
  const [testWeChatLoading, setTestWeChatLoading] = useState(false);

  // 加载设置数据
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);

      // 格式化设置数据为表单值
      const formValues = {};
      res.data.forEach(setting => {
        let value = setting.setting_value;

        // 转换布尔值
        if (value === 'true') value = true;
        if (value === 'false') value = false;

        // 转换数字
        if (setting.setting_key === 'balance_threshold' || 
            setting.setting_key === 'notification_days_before') {
          value = parseFloat(value);
        }

        formValues[setting.setting_key] = value;
      });

      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('获取设置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加载运营商数据
  const loadCarriers = async () => {
    setCarriersLoading(true);
    try {
      const res = await axios.get('/api/sim/carriers/all');
      setCarriers(res.data);
    } catch (error) {
      message.error('获取运营商数据失败');
      console.error(error);
    } finally {
      setCarriersLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadCarriers();
  }, []);

  // 保存设置
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/settings/batch', values);
      message.success('设置保存成功');
      loadSettings();
    } catch (error) {
      message.error('保存设置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 测试邮件
  const testEmailSend = async () => {
    if (!testEmail) {
      message.error('请输入测试接收邮箱');
      return;
    }

    setTestEmailLoading(true);
    try {
      await axios.post('/api/settings/test-email', { recipient: testEmail });
      message.success('测试邮件发送成功');
    } catch (error) {
      message.error('测试邮件发送失败');
      console.error(error);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // 测试邮件服务器连接
  const testEmailConnection = async () => {
    setTestEmailLoading(true);
    try {
      const res = await axios.get('/api/settings/test-email-connection');
      message.success(res.data.message);
    } catch (error) {
      message.error('邮件服务器连接失败');
      console.error(error);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // 测试企业微信通知
  const testWeChatNotification = async () => {
    setTestWeChatLoading(true);
    try {
      await axios.post('/api/settings/test-wechat');
      message.success('企业微信测试通知发送成功');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('企业微信测试通知发送失败');
      }
      console.error(error);
    } finally {
      setTestWeChatLoading(false);
    }
  };

  // 删除运营商
  const handleDeleteCarrier = async (id) => {
    try {
      await axios.delete(`/api/sim/carriers/${id}`);
      message.success('运营商删除成功');
      loadCarriers();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('删除运营商失败');
      }
      console.error(error);
    }
  };

  // 显示添加/编辑运营商弹窗
  const showCarrierModal = (carrier = null) => {
    if (carrier) {
      setEditingCarrierId(carrier.id);
      carrierForm.setFieldsValue({ name: carrier.name });
    } else {
      setEditingCarrierId(null);
      carrierForm.resetFields();
    }
    setIsCarrierModalVisible(true);
  };

  // 关闭运营商弹窗
  const handleCarrierCancel = () => {
    setIsCarrierModalVisible(false);
    setEditingCarrierId(null);
  };

  // 提交运营商表单
  const handleCarrierSubmit = async () => {
    try {
      const values = await carrierForm.validateFields();
      
      if (editingCarrierId) {
        // 更新运营商
        await axios.put(`/api/sim/carriers/${editingCarrierId}`, { name: values.name });
        message.success('运营商更新成功');
      } else {
        // 添加运营商
        await axios.post('/api/sim/carriers', { name: values.name });
        message.success('运营商添加成功');
      }
      
      setIsCarrierModalVisible(false);
      loadCarriers();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('保存运营商失败');
      }
      console.error(error);
    }
  };

  // 运营商表格列
  const carrierColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showCarrierModal(record)}>编辑</Button>
          <Popconfirm
            title="确定要删除这个运营商吗？"
            onConfirm={() => handleDeleteCarrier(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 邮件模板示例
  const emailTemplateExample = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #1890ff;">SIM卡提醒通知</h2>
  </div>
  <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
    <p>尊敬的用户：</p>
    <p>您的SIM卡 <strong>{{phone_number}}</strong> 当前状态如下：</p>
    <ul>
      <li>当前余额：<span style="color: {{balance < 20 ? 'red' : 'green'}};">{{balance}} 元</span></li>
      <li>月租费用：{{monthly_fee}} 元</li>
      <li>账单日期：每月 {{billing_day}} 日</li>
    </ul>
    <p>请注意及时充值，避免影响正常使用。</p>
  </div>
  <div style="text-align: center; font-size: 12px; color: #999;">
    <p>此邮件由系统自动发送，请勿回复</p>
  </div>
</div>
  `;

  const cardStyle = {
    borderRadius: '8px',
    marginBottom: '16px'
  };

  return (
    <div>
      <Tabs defaultActiveKey="1">
        <TabPane tab="通知设置" key="1">
          <Card title="提醒设置" style={cardStyle}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
            >
              <Form.Item
                name="notification_type"
                label="通知方式"
                initialValue="email"
              >
                <Radio.Group>
                  <Radio value="email">邮件通知</Radio>
                  <Radio value="wechat">企业微信通知</Radio>
                  <Radio value="both">两者都启用</Radio>
                </Radio.Group>
              </Form.Item>

              <Divider orientation="left">邮件通知设置</Divider>

              <Form.Item
                name="email_enabled"
                label="启用邮件通知"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="email_subject"
                label="邮件主题"
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="email_template"
                label={
                  <span>
                    邮件模板（HTML格式）
                    <Tooltip title="可以使用HTML格式美化邮件，支持样式和布局">
                      <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                    </Tooltip>
                  </span>
                }
                tooltip="可使用的变量: {{phone_number}}, {{balance}}, {{monthly_fee}}, {{billing_day}}"
                extra={
                  <Button 
                    type="link" 
                    onClick={() => form.setFieldsValue({ email_template: emailTemplateExample })}
                    style={{ padding: 0 }}
                  >
                    使用示例模板
                  </Button>
                }
              >
                <TextArea rows={8} />
              </Form.Item>

              <Divider orientation="left">企业微信通知设置</Divider>

              <Form.Item
                name="wechat_enabled"
                label="启用企业微信通知"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="wechat_webhook_url"
                label={
                  <span>
                    Webhook地址
                    <Tooltip title="企业微信机器人的Webhook地址，在企业微信群中添加机器人获取">
                      <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                    </Tooltip>
                  </span>
                }
              >
                <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx" />
              </Form.Item>

              <Form.Item
                name="wechat_template"
                label="企业微信消息模板"
                tooltip="可使用的变量: {{phone_number}}, {{balance}}, {{monthly_fee}}, {{billing_day}}"
                extra="企业微信通知支持markdown格式，可以使用文本样式"
              >
                <TextArea rows={4} placeholder="SIM卡 {{phone_number}} 余额提醒：\n- 当前余额：{{balance}}元\n- 月租费用：{{monthly_fee}}元\n- 账单日期：每月{{billing_day}}日" />
              </Form.Item>

              <Divider orientation="left">通用设置</Divider>

              <Form.Item
                name="balance_threshold"
                label="余额阈值（元）"
                tooltip="当SIM卡余额低于此值时发送提醒"
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="notification_days_before"
                label="提前通知天数"
                tooltip="账单日前几天发送提醒"
              >
                <InputNumber min={0} max={31} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="测试通知" style={cardStyle}>
            <Tabs defaultActiveKey="email">
              <TabPane tab="测试邮件" key="email">
                <div style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="请输入测试接收邮箱"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    style={{ width: 300, marginRight: 16 }}
                  />
                  <Button 
                    type="primary" 
                    onClick={testEmailSend} 
                    loading={testEmailLoading}
                    style={{ marginRight: 8 }}
                  >
                    发送测试邮件
                  </Button>
                  <Button onClick={testEmailConnection} loading={testEmailLoading}>
                    测试服务器连接
                  </Button>
                </div>
                <p>测试邮件将使用当前设置的模板和内容发送到指定邮箱。</p>
              </TabPane>
              <TabPane tab="测试企业微信" key="wechat">
                <div style={{ marginBottom: 16 }}>
                  <Button 
                    type="primary" 
                    onClick={testWeChatNotification} 
                    loading={testWeChatLoading}
                  >
                    发送企业微信测试通知
                  </Button>
                </div>
                <p>测试通知将使用当前设置的Webhook地址和模板发送到企业微信。</p>
              </TabPane>
            </Tabs>
          </Card>
        </TabPane>

        <TabPane tab="运营商管理" key="2">
          <Card title="运营商管理" style={cardStyle}>
            <div className="table-operations" style={{ marginBottom: 16 }}>
              <Button type="primary" onClick={() => showCarrierModal()}>
                添加运营商
              </Button>
            </div>
            <Table
              columns={carrierColumns}
              dataSource={carriers.map(carrier => ({ ...carrier, key: carrier.id }))}
              loading={carriersLoading}
              pagination={false}
              bordered
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 添加/编辑运营商弹窗 */}
      <Modal
        title={editingCarrierId ? "编辑运营商" : "添加运营商"}
        open={isCarrierModalVisible}
        onCancel={handleCarrierCancel}
        onOk={handleCarrierSubmit}
        destroyOnClose={true}
      >
        <Form
          form={carrierForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="运营商名称"
            rules={[{ required: true, message: '请输入运营商名称' }]}
          >
            <Input placeholder="请输入运营商名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings; 