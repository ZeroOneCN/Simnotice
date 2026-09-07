import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Download } from 'lucide-react';

interface BillImportProps {
  onImportComplete: () => void;
}

const BillImport = ({ onImportComplete }: BillImportProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('请上传 CSV 格式文件');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV 文件内容为空');
        return;
      }

      // 跳过表头
      const dataLines = lines.slice(1);
      const records = [];

      for (const line of dataLines) {
        const [billing_month, phone_number, monthly_fee, actual_fee, extra_charges, total_fee, note] = line.split(',');
        
        if (!billing_month || !phone_number || !total_fee) {
          continue;
        }

        records.push({
          billing_month: billing_month.trim(),
          phone_number: phone_number.trim(),
          monthly_fee: parseFloat(monthly_fee) || 0,
          actual_fee: parseFloat(actual_fee) || 0,
          extra_charges: parseFloat(extra_charges) || 0,
          total_fee: parseFloat(total_fee) || 0,
          note: note?.trim() || '',
        });
      }

      if (records.length === 0) {
        toast.error('文件中没有有效的账单记录');
        return;
      }

      // 提交到后端
      const res = await fetch('/api/bills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (!res.ok) {
        throw new Error('导入失败');
      }

      const result = await res.json();
      toast.success(`成功导入 ${result.count} 条账单记录`);
      onImportComplete();
    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['月份 (YYYY-MM)', '电话号码', '月租', '实际扣费', '额外费用', '总费用', '备注'];
    const exampleRows = [
      ['2026-03', '18316426417', '8', '8', '0', '8', '正常月租'],
      ['2026-03', '13377632105', '5', '5', '0', '5', '正常月租'],
      ['2026-02', '18316426417', '8', '8', '2', '10', '含来电显示'],
    ];
    
    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '账单导入模板.csv';
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>导入账单</CardTitle>
        <CardDescription>支持 CSV 格式，下载模板后填写实际扣费数据</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-200'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleChange}
            />
            
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              拖拽文件到此处，或点击选择文件
            </p>
            <p className="text-xs text-muted-foreground">
              仅支持 CSV 格式文件
            </p>
            
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? '导入中...' : '选择文件'}
            </Button>
          </div>
          
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              下载模板
            </Button>
            <span className="text-xs text-muted-foreground">
              模板包含示例数据，请根据实际账单填写
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillImport;