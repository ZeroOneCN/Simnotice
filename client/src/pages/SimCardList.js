import React, { useState, useEffect } from 'react';
import { Table, Button, message, Popconfirm, Tag, Modal, Input, Select, DatePicker, Space, Row, Col, Card, InputNumber, Form } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, WalletOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import SimCardForm from './SimCardForm';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const SimCardList = () => {
  const [simCards, setSimCards] = useState([]);
  const [filteredSimCards, setFilteredSimCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSimId, setCurrentSimId] = useState(null);
  const [filters, setFilters] = useState({
    phoneNumber: '',
    carrier: undefined,
    location: '',
    activationDateRange: [],
    balanceRange: {
      min: undefined,
      max: undefined
    }
  });
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [isRechargeModalVisible, setIsRechargeModalVisible] = useState(false);
  const [rechargeForm] = Form.useForm();
  const [currentRechargeCard, setCurrentRechargeCard] = useState(null);
  const [rechargingLoading, setRechargingLoading] = useState(false);

  // 加载SIM卡数据
  const loadSimCards = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sim');
      // 默认按入网时间排序，时间越久越靠前
      const sortedData = res.data.sort((a, b) => {
        if (!a.activation_date) return 1;
        if (!b.activation_date) return -1;
        return new Date(a.activation_date) - new Date(b.activation_date);
      });
      setSimCards(sortedData);
      setFilteredSimCards(sortedData);
    } catch (error) {
      message.error('获取SIM卡数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加载运营商数据
  const loadCarriers = async () => {
    try {
      const res = await axios.get('/api/sim/carriers/all');
      setCarriers(res.data);
    } catch (error) {
      message.error('获取运营商数据失败');
      console.error(error);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    loadSimCards();
    loadCarriers();
  }, []);

  // 删除SIM卡
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/sim/${id}`);
      message.success('SIM卡删除成功');
      loadSimCards();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  // 计算入网时间距今的年月
  const calculateYearsAndMonths = (date) => {
    if (!date) return '-';
    const activationDate = dayjs(date);
    const today = dayjs();
    
    // 计算总月数
    const monthsDiff = today.diff(activationDate, 'month');
    
    // 转换为年和月
    const years = Math.floor(monthsDiff / 12);
    const months = monthsDiff % 12;
    
    // 构建显示文本
    let result = '';
    if (years > 0) {
      result += `${years}年`;
    }
    if (months > 0 || years === 0) {
      result += `${months}个月`;
    }
    
    return result;
  };

  // 显示添加/编辑弹窗
  const showModal = (id = null) => {
    setCurrentSimId(id);
    setIsModalVisible(true);
  };

  // 关闭弹窗
  const handleCancel = () => {
    setIsModalVisible(false);
    setCurrentSimId(null);
  };

  // 表单提交成功后关闭弹窗并刷新数据
  const handleFormSuccess = () => {
    setIsModalVisible(false);
    setCurrentSimId(null);
    loadSimCards();
  };

  // 处理筛选条件变化
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 应用筛选
  const applyFilters = () => {
    let result = [...simCards];
    
    // 筛选号码
    if (filters.phoneNumber) {
      result = result.filter(card => 
        card.phone_number.includes(filters.phoneNumber)
      );
    }
    
    // 筛选运营商
    if (filters.carrier) {
      result = result.filter(card => 
        card.carrier === filters.carrier
      );
    }
    
    // 筛选归属地
    if (filters.location) {
      result = result.filter(card => 
        card.location && card.location.includes(filters.location)
      );
    }
    
    // 筛选入网时间
    if (filters.activationDateRange && filters.activationDateRange.length === 2) {
      const startDate = filters.activationDateRange[0].startOf('day');
      const endDate = filters.activationDateRange[1].endOf('day');
      
      result = result.filter(card => {
        if (!card.activation_date) return false;
        const cardDate = dayjs(card.activation_date);
        return cardDate.isAfter(startDate) && cardDate.isBefore(endDate);
      });
    }
    
    // 筛选余额范围
    if (filters.balanceRange.min !== undefined) {
      result = result.filter(card => 
        parseFloat(card.balance) >= parseFloat(filters.balanceRange.min)
      );
    }
    
    if (filters.balanceRange.max !== undefined) {
      result = result.filter(card => 
        parseFloat(card.balance) <= parseFloat(filters.balanceRange.max)
      );
    }
    
    setFilteredSimCards(result);
  };

  // 重置筛选条件
  const resetFilters = () => {
    setFilters({
      phoneNumber: '',
      carrier: undefined,
      location: '',
      activationDateRange: [],
      balanceRange: {
        min: undefined,
        max: undefined
      }
    });
    setFilteredSimCards(simCards);
  };

  // 显示充值弹窗
  const showRechargeModal = (record) => {
    setCurrentRechargeCard(record);
    setIsRechargeModalVisible(true);
    rechargeForm.resetFields();
  };

  // 关闭充值弹窗
  const handleRechargeCancel = () => {
    setIsRechargeModalVisible(false);
    setCurrentRechargeCard(null);
  };

  // 处理充值提交
  const handleRechargeSubmit = async () => {
    try {
      const values = await rechargeForm.validateFields();
      setRechargingLoading(true);
      
      await axios.post(`/api/sim/${currentRechargeCard.id}/recharge`, {
        amount: values.amount,
        description: values.description
      });
      
      message.success('充值成功');
      setIsRechargeModalVisible(false);
      loadSimCards(); // 重新加载SIM卡列表
    } catch (error) {
      if (error.response) {
        message.error(`充值失败: ${error.response.data.message}`);
      } else if (error.message) {
        message.error(`充值失败: ${error.message}`);
      } else {
        message.error('充值失败，请重试');
      }
    } finally {
      setRechargingLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '号码',
      dataIndex: 'phone_number',
      key: 'phone_number',
      align: 'center',
      sorter: (a, b) => a.phone_number.localeCompare(b.phone_number),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      align: 'center',
      render: (text) => `${text} 元`,
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: '运营商',
      dataIndex: 'carrier',
      key: 'carrier',
      align: 'center',
      render: (text) => <Tag color="blue">{text}</Tag>,
      filters: carriers.map(carrier => ({ text: carrier.name, value: carrier.name })),
      onFilter: (value, record) => record.carrier === value,
    },
    {
      title: '归属地',
      dataIndex: 'location',
      key: 'location',
      align: 'center',
      render: (text) => text || '-',
    },
    {
      title: '月租',
      dataIndex: 'monthly_fee',
      key: 'monthly_fee',
      align: 'center',
      render: (text) => `${text} 元`,
      sorter: (a, b) => a.monthly_fee - b.monthly_fee,
    },
    {
      title: '月结日',
      dataIndex: 'billing_day',
      key: 'billing_day',
      align: 'center',
      render: (text) => `${text} 日`,
      sorter: (a, b) => a.billing_day - b.billing_day,
    },
    {
      title: '流量',
      dataIndex: 'data_plan',
      key: 'data_plan',
      align: 'center',
    },
    {
      title: '通话',
      dataIndex: 'call_minutes',
      key: 'call_minutes',
      align: 'center',
    },
    {
      title: '短信',
      dataIndex: 'sms_count',
      key: 'sms_count',
      align: 'center',
    },
    {
      title: '入网时间',
      dataIndex: 'activation_date',
      key: 'activation_date',
      align: 'center',
      render: (text, record) => (
        <span>
          {text ? dayjs(text).format('YYYY-MM-DD') : '-'}
          {text && ` (${calculateYearsAndMonths(text)})`}
        </span>
      ),
      sorter: (a, b) => {
        if (!a.activation_date) return 1;
        if (!b.activation_date) return -1;
        return new Date(a.activation_date) - new Date(b.activation_date);
      },
      defaultSortOrder: 'ascend', // 默认按入网时间排序（升序 = 时间越久越靠前）
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <div>
          <Button type="link" onClick={() => showModal(record.id)}>编辑</Button>
          <Button 
            type="link" 
            icon={<WalletOutlined />} 
            onClick={() => showRechargeModal(record)}
          >
            充值
          </Button>
          <Popconfirm
            title="确定要删除这张SIM卡吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <div className="table-operations" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Button type="primary" onClick={() => showModal()} style={{ marginRight: 8 }}>
                  添加SIM卡
                </Button>
                <Button 
                  icon={<FilterOutlined />} 
                  onClick={() => setFiltersVisible(!filtersVisible)}
                  style={{ marginRight: 8 }}
                >
                  {filtersVisible ? '隐藏筛选' : '显示筛选'}
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadSimCards}
                >
                  刷新
                </Button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Input 
                  placeholder="搜索号码" 
                  value={filters.phoneNumber}
                  onChange={(e) => handleFilterChange('phoneNumber', e.target.value)} 
                  style={{ width: 200 }}
                  prefix={<SearchOutlined />}
                  onPressEnter={applyFilters}
                />
                <Button 
                  type="primary" 
                  onClick={applyFilters} 
                  style={{ marginLeft: 8 }}
                >
                  搜索
                </Button>
              </div>
            </div>

            {filtersVisible && (
              <Card style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <div>
                      <div style={{ marginBottom: 8 }}>运营商</div>
                      <Select
                        placeholder="选择运营商"
                        style={{ width: '100%' }}
                        value={filters.carrier}
                        onChange={(value) => handleFilterChange('carrier', value)}
                        allowClear
                      >
                        {carriers.map(carrier => (
                          <Option key={carrier.id} value={carrier.name}>{carrier.name}</Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <div>
                      <div style={{ marginBottom: 8 }}>归属地</div>
                      <Input
                        placeholder="输入归属地"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <div>
                      <div style={{ marginBottom: 8 }}>入网时间范围</div>
                      <RangePicker 
                        style={{ width: '100%' }}
                        value={filters.activationDateRange}
                        onChange={(dates) => handleFilterChange('activationDateRange', dates)}
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <div>
                      <div style={{ marginBottom: 8 }}>余额范围</div>
                      <Space>
                        <Input
                          placeholder="最小值"
                          type="number"
                          style={{ width: 100 }}
                          value={filters.balanceRange.min}
                          onChange={(e) => handleFilterChange('balanceRange', { 
                            ...filters.balanceRange, 
                            min: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                        />
                        <span>-</span>
                        <Input
                          placeholder="最大值"
                          type="number"
                          style={{ width: 100 }}
                          value={filters.balanceRange.max}
                          onChange={(e) => handleFilterChange('balanceRange', { 
                            ...filters.balanceRange, 
                            max: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                        />
                      </Space>
                    </div>
                  </Col>
                  <Col xs={24} sm={24} md={24} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <Button type="primary" onClick={applyFilters} style={{ marginRight: 8 }}>
                      应用筛选
                    </Button>
                    <Button onClick={resetFilters}>
                      重置
                    </Button>
                  </Col>
                </Row>
              </Card>
            )}

            <Table
              columns={columns}
              dataSource={filteredSimCards.map(card => ({ ...card, key: card.id }))}
              loading={loading}
              pagination={{ pageSize: 10 }}
              bordered
              rowClassName={(record, index) => index % 2 === 0 ? '' : 'table-row-striped'}
              onChange={(pagination, filters, sorter) => {
                console.log('Table params changed:', sorter);
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 充值弹窗 */}
      <Modal
        title={`充值余额 - ${currentRechargeCard?.phone_number || ''}`}
        open={isRechargeModalVisible}
        onCancel={handleRechargeCancel}
        footer={null}
        width={500}
        destroyOnClose={true}
      >
        {currentRechargeCard && (
          <Form
            form={rechargeForm}
            layout="vertical"
            onFinish={handleRechargeSubmit}
          >
            <Row gutter={16}>
              <Col span={24}>
                <div className="card-info" style={{ marginBottom: 20, background: '#f5f5f5', padding: 15, borderRadius: 4 }}>
                  <p><strong>号码：</strong>{currentRechargeCard.phone_number}</p>
                  <p><strong>运营商：</strong>{currentRechargeCard.carrier}</p>
                  <p><strong>当前余额：</strong>{currentRechargeCard.balance} 元</p>
                </div>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="amount"
                  label="充值金额"
                  rules={[
                    { required: true, message: '请输入充值金额' },
                    { type: 'number', min: 0.01, message: '充值金额必须大于0' }
                  ]}
                >
                  <InputNumber
                    min={0.01}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入充值金额"
                    addonAfter="元"
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label="备注"
                >
                  <TextArea rows={3} placeholder="可选，请输入充值备注" />
                </Form.Item>
              </Col>
              <Col span={24} style={{ textAlign: 'right' }}>
                <Button onClick={handleRechargeCancel} style={{ marginRight: 8 }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={rechargingLoading}>
                  确认充值
                </Button>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* 添加/编辑SIM卡弹窗 */}
      <Modal
        title={currentSimId ? "编辑SIM卡" : "添加SIM卡"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={800}
        destroyOnClose={true}
      >
        <SimCardForm 
          id={currentSimId} 
          onSuccess={handleFormSuccess} 
          onCancel={handleCancel}
          carriers={carriers}
          isModal={true}
        />
      </Modal>
    </div>
  );
};

export default SimCardList; 