import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, DatePicker, InputNumber, message, Row, Col } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

const SimCardForm = ({ id, onSuccess, onCancel, carriers: propCarriers, isModal = false }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState([]);
  
  // 如果是弹窗模式，使用props传入的id，否则使用路由参数
  const simId = id || params.id;
  const isEditing = !!simId;

  // 加载运营商数据
  const loadCarriers = async () => {
    // 如果已经从props传入了carriers，则直接使用
    if (propCarriers && propCarriers.length > 0) {
      setCarriers(propCarriers);
      return;
    }

    try {
      const res = await axios.get('/api/sim/carriers/all');
      setCarriers(res.data);
    } catch (error) {
      message.error('获取运营商数据失败');
      console.error(error);
    }
  };

  // 加载SIM卡数据（编辑模式）
  const loadSimCard = async () => {
    if (!isEditing) return;

    setLoading(true);
    try {
      const res = await axios.get(`/api/sim/${simId}`);
      const simCard = res.data;

      // 格式化日期
      const formattedData = {
        ...simCard,
        activation_date: simCard.activation_date ? dayjs(simCard.activation_date) : null
      };

      form.setFieldsValue(formattedData);
    } catch (error) {
      message.error('获取SIM卡数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCarriers();
    loadSimCard();
  }, [simId]);

  // 提交表单
  const onFinish = async (values) => {
    setLoading(true);

    // 格式化日期
    const formattedValues = {
      ...values,
      activation_date: values.activation_date ? values.activation_date.format('YYYY-MM-DD') : null
    };

    try {
      if (isEditing) {
        await axios.put(`/api/sim/${simId}`, formattedValues);
        message.success('SIM卡更新成功');
      } else {
        await axios.post('/api/sim', formattedValues);
        message.success('SIM卡添加成功');
      }
      
      // 如果是弹窗模式，则调用成功回调
      if (isModal && onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    } catch (error) {
      message.error(isEditing ? '更新失败' : '添加失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 表单布局
  const formItemLayout = isModal 
    ? { labelCol: { span: 8 }, wrapperCol: { span: 16 } }
    : null;

  return (
    <div style={{ maxWidth: isModal ? '100%' : 800, margin: isModal ? 0 : '0 auto' }}>
      {!isModal && <h2>{isEditing ? '编辑SIM卡' : '添加SIM卡'}</h2>}
      <Form
        form={form}
        layout="horizontal"
        onFinish={onFinish}
        initialValues={{
          balance: 0,
          monthly_fee: 0,
          billing_day: 1
        }}
        labelCol={{ span: isModal ? 8 : 6 }}
        wrapperCol={{ span: isModal ? 16 : 18 }}
      >
        <Row gutter={16}>
          <Col span={isModal ? 12 : 24}>
            <Form.Item
              name="phone_number"
              label="电话号码"
              rules={[
                { required: true, message: '请输入电话号码' },
                { pattern: /^[0-9]{5,20}$/, message: '请输入有效的电话号码' }
              ]}
            >
              <Input placeholder="请输入电话号码" />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item
              name="carrier"
              label="运营商"
              rules={[{ required: true, message: '请选择运营商' }]}
            >
              <Select placeholder="请选择运营商">
                {carriers.map(carrier => (
                  <Option key={carrier.id} value={carrier.name}>
                    {carrier.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item
              name="balance"
              label="余额"
              rules={[{ required: true, message: '请输入余额' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入余额"
                addonAfter="元"
              />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item
              name="monthly_fee"
              label="月租"
              rules={[{ required: true, message: '请输入月租' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入月租"
                addonAfter="元"
              />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item
              name="billing_day"
              label="月结日"
              rules={[{ required: true, message: '请输入月结日' }]}
            >
              <InputNumber
                min={1}
                max={31}
                style={{ width: '100%' }}
                placeholder="请输入月结日"
                addonAfter="日"
              />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item 
              name="location" 
              label="归属地"
            >
              <Input placeholder="例如：上海" />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item 
              name="data_plan" 
              label="流量套餐"
            >
              <Input placeholder="例如：5GB/月" />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item 
              name="call_minutes" 
              label="通话分钟"
            >
              <Input placeholder="例如：100分钟/月" />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item 
              name="sms_count" 
              label="短信条数"
            >
              <Input placeholder="例如：50条/月" />
            </Form.Item>
          </Col>
          
          <Col span={isModal ? 12 : 24}>
            <Form.Item 
              name="activation_date" 
              label="开卡时间"
            >
              <DatePicker style={{ width: '100%' }} placeholder="选择开卡日期" />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'right', marginTop: 16 }}>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 10 }}>
            {isEditing ? '更新' : '添加'}
          </Button>
          <Button onClick={isModal ? onCancel : () => navigate('/')}>
            取消
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SimCardForm; 