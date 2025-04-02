import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ExcelJS from "exceljs";
import { db, ref, set, onValue } from "@/lib/firebase";

interface DailySales {
  date: string;
  meituanYFF: number;
  meituanQJC: number;
  elemeYFF: number;
  elemeQJC: number;
  kezhilian: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function SalesDashboard() {
  const [data, setData] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [newRecord, setNewRecord] = useState<Omit<DailySales, "date">>({
    meituanYFF: 0,
    meituanQJC: 0,
    elemeYFF: 0,
    elemeQJC: 0,
    kezhilian: 0
  });

  // 从Firebase加载数据
  useEffect(() => {
    const salesRef = ref(db, 'salesData');
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const firebaseData = snapshot.val();
      if (firebaseData) {
        // 将Firebase对象转换为数组
        const dataArray = Object.keys(firebaseData).map(key => firebaseData[key]);
        setData(dataArray);
      } else {
        setData([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 获取当前选中日期的数据
  const currentDateData = data.find(item => item.date === selectedDate);
  
  // 准备图表数据
  const chartData = currentDateData ? [
    { name: "美团-喻发发", value: currentDateData.meituanYFF },
    { name: "美团-秋金川", value: currentDateData.meituanQJC },
    { name: "饿了么-喻发发", value: currentDateData.elemeYFF },
    { name: "饿了么-秋金川", value: currentDateData.elemeQJC },
    { name: "客智联", value: currentDateData.kezhilian }
  ] : [];

  const totalSales = chartData.reduce((sum, item) => sum + item.value, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({
      ...prev,
      [name]: Number(value) || 0
    }));
  };

  const handleAddRecord = () => {
    const updatedRecord = { date: selectedDate, ...newRecord };
    const newData = [...data];
    const existingIndex = newData.findIndex(item => item.date === selectedDate);
    
    if (existingIndex >= 0) {
      newData[existingIndex] = updatedRecord;
    } else {
      newData.push(updatedRecord);
    }
    
    // 保存到Firebase
    set(ref(db, 'salesData'), newData);
    
    // 重置表单
    setNewRecord({
      meituanYFF: 0,
      meituanQJC: 0,
      elemeYFF: 0,
      elemeQJC: 0,
      kezhilian: 0
    });
  };

  const exportMonthlyToExcel = async () => {
    const [year, month] = selectedDate.split('-').slice(0, 2);
    const monthlyData = data.filter(item => {
      const [itemYear, itemMonth] = item.date.split('-').slice(0, 2);
      return itemYear === year && itemMonth === month;
    });

    if (monthlyData.length === 0) {
      alert('该月无数据可导出');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}年${month}月营业额`);
    
    // 设置表头
    worksheet.columns = [
      { header: "日期", key: "date", width: 15 },
      { header: "美团-喻发发", key: "meituanYFF", width: 12 },
      { header: "美团-秋金川", key: "meituanQJC", width: 12 },
      { header: "饿了么-喻发发", key: "elemeYFF", width: 12 },
      { header: "饿了么-秋金川", key: "elemeQJC", width: 12 },
      { header: "客智联", key: "kezhilian", width: 12 },
      { header: "总计", key: "total", width: 12 }
    ];
    
    // 添加数据
    monthlyData.forEach(item => {
      const total = item.meituanYFF + item.meituanQJC + item.elemeYFF + item.elemeQJC + item.kezhilian;
      worksheet.addRow({
        date: item.date,
        meituanYFF: item.meituanYFF,
        meituanQJC: item.meituanQJC,
        elemeYFF: item.elemeYFF,
        elemeQJC: item.elemeQJC,
        kezhilian: item.kezhilian,
        total: total
      });
    });
    
    // 添加汇总行
    const monthlyTotal = monthlyData.reduce((sum, item) => sum + 
      item.meituanYFF + item.meituanQJC + item.elemeYFF + item.elemeQJC + item.kezhilian, 0);
    
    worksheet.addRow({
      date: '月总计',
      meituanYFF: monthlyData.reduce((sum, item) => sum + item.meituanYFF, 0),
      meituanQJC: monthlyData.reduce((sum, item) => sum + item.meituanQJC, 0),
      elemeYFF: monthlyData.reduce((sum, item) => sum + item.elemeYFF, 0),
      elemeQJC: monthlyData.reduce((sum, item) => sum + item.elemeQJC, 0),
      kezhilian: monthlyData.reduce((sum, item) => sum + item.kezhilian, 0),
      total: monthlyTotal
    });
    
    // 生成并下载Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${year}年${month}月营业额数据.xlsx`;
    link.click();
  };

  if (loading) {
    return <div className="p-4 flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">餐饮营业额统计系统</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">选择日期</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2 rounded w-full max-w-xs"
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      {currentDateData ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{selectedDate} 营业额数据</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {chartData.map((item, index) => (
              <div key={index} className="border p-4 rounded-lg">
                <h3 className="font-medium text-lg">{item.name}</h3>
                <p className="text-2xl">{item.value.toLocaleString()} 元</p>
                <div className="h-2 w-full bg-gray-200 mt-2">
                  <div 
                    className="h-full" 
                    style={{
                      width: `${(item.value / totalSales * 100).toFixed(1)}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {(item.value / totalSales * 100).toFixed(1)}% 占比
                </p>
              </div>
            ))}
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium text-lg">总计</h3>
              <p className="text-3xl font-bold">{totalSales.toLocaleString()} 元</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">营业额占比</h2>
              <div className="flex justify-center">
                <PieChart width={500} height={300}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 元`, "金额"]} />
                  <Legend />
                </PieChart>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 mb-6 text-center">
          <p className="text-lg">该日期暂无数据，请添加记录</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">添加/更新记录</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.keys(newRecord).map((key) => (
            <div key={key}>
              <label className="block mb-2 font-medium">
                {{
                  meituanYFF: "美团-喻发发",
                  meituanQJC: "美团-秋金川",
                  elemeYFF: "饿了么-喻发发",
                  elemeQJC: "饿了么-秋金川",
                  kezhilian: "客智联"
                }[key] || key}
              </label>
              <Input
                type="number"
                name={key}
                value={newRecord[key as keyof typeof newRecord]}
                onChange={handleInputChange}
                placeholder="请输入金额"
                className="w-full"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleAddRecord} className="w-full md:w-auto">
          {currentDateData ? "更新记录" : "添加记录"}
        </Button>
      </div>

      <div className="flex justify-center">
        <Button onClick={exportMonthlyToExcel} size="lg">
          导出该月营业额数据
        </Button>
      </div>
    </div>
  );
}