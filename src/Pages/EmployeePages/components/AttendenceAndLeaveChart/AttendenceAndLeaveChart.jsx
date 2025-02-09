import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { colorPairs } from "../../../ManagerPages/ManagerHome";
import DotsLoader from "../../../../Components/Layout/animations/dotAnimations";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const AttendenceAndLeaveChart = () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    
    // Get current month name
    const getCurrentMonth = () => {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        return monthNames[new Date().getMonth()];
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [chartData, setChartData] = useState([]);
    const [showPieChart, setShowPieChart] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [workingDays, setWorkingDays] = useState(0);
    const [totalLeaves, setTotalLeaves] = useState(0);
    const [approvedLeaves, setApprovedLeaves] = useState(0);
    const [eachMonthData, setEachMonthData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [months, setMonths] = useState([
        { name: "January", value: 1, totalWorkingDays: 26 },
        { name: "February", value: 2, totalWorkingDays: 22 },
        { name: "March", value: 3, totalWorkingDays: 26 },
        { name: "April", value: 4, totalWorkingDays: 25 },
        { name: "May", value: 5, totalWorkingDays: 26 },
        { name: "June", value: 6, totalWorkingDays: 26 },
        { name: "July", value: 7, totalWorkingDays: 26 },
        { name: "August", value: 8, totalWorkingDays: 25 },
        { name: "September", value: 9, totalWorkingDays: 25 },
        { name: "October", value: 10, totalWorkingDays: 24 },
        { name: "November", value: 11, totalWorkingDays: 25 },
        { name: "December", value: 12, totalWorkingDays: 25 }
    ]);

    // Fetch attendance and leave data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch attendance data
                const attendanceResponse = await axios.get(
                    `http://localhost:3002/api/routes/attendence/get-loginHistory/${userId}`,
                    {
                        headers: { authorization: `Bearer ${token}` }
                    }
                );

                if (!attendanceResponse.data.ok) {
                    setLoading(false);
                    return;
                }

                // Set available months up to current month
                const currentMonth = new Date().getMonth() + 1; // 1-based month
                const availableMonths = months.slice(0, currentMonth);
                setSelectedMonths(availableMonths);

                const filterRecords = await getRecords(attendanceResponse.data.data);
                setAttendanceData(filterRecords);

                // Get current month's data
                const currentMonthNumber = months.find(m => m.name === selectedMonth)?.value || currentMonth;
                
                // Fetch monthly leave data
                const leaveResponse = await axios.get(
                    `http://localhost:3002/api/routes/time-off/monthly-leaves/${userId}/${currentMonthNumber}/2025`,
                    {
                        headers: { authorization: `Bearer ${token}` }
                    }
                );

                if (leaveResponse.data) {
                    const monthlyLeaveData = leaveResponse.data;
                    const totalApprovedLeaves = (monthlyLeaveData.total_leave_taken || 0) + 
                                              ((monthlyLeaveData.half_days_taken || 0) * 0.5);
                    setApprovedLeaves(totalApprovedLeaves);
                }

                // Update monthly data display
                updateMonthlyData(currentMonthNumber, filterRecords);
                setShowPieChart(true);
                
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Error fetching attendance data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, token, selectedMonth]);

    const getRecords = (data) => {
        const records = [];
        for (let i = 0; i < data.length; i++) {
            const record = {
                date: data[i].date,
                startTime: null,
                endTime: null,
            };
            for (let j = 0; j < data[i].logHistory.length; j++) {
                if (data[i].logHistory[j].type === "checkIn") {
                    record.startTime = data[i].logHistory[j].startTime;
                } else {
                    record.endTime = data[i].logHistory[j].endTime;
                }
            }
            record.colors = { 
                color: colorPairs[i % colorPairs.length].color, 
                bgColor: colorPairs[i % colorPairs.length].bgColor 
            };
            records.push(record);
        }
        return records;
    };

    const updateMonthlyData = (monthNumber, attendanceRecords) => {
        const currentDate = new Date();
        const currentDay = currentDate.getDate();
        const currentMonth = currentDate.getMonth() + 1;

        // Filter records up to current date only
        const monthFilter = attendanceRecords.filter((item) => {
            const date = new Date(item.date);
            // If it's a past month, include all days
            if (monthNumber < currentMonth) {
                return date.getMonth() === monthNumber - 1;
            }
            // If it's current month, include only up to current date
            if (monthNumber === currentMonth) {
                return date.getMonth() === monthNumber - 1 && date.getDate() <= currentDay;
            }
            return false;
        });

        const month = months.find(m => m.value === monthNumber);
        let totalWorkingDays = month?.totalWorkingDays || 26;
        
        // If it's current month, adjust working days to current date
        if (monthNumber === currentMonth) {
            totalWorkingDays = Math.min(totalWorkingDays, currentDay);
        }
        
        setWorkingDays(totalWorkingDays);
        setEachMonthData(monthFilter);
        
        // Calculate total leaves (absences)
        const daysPresent = monthFilter.length;
        const totalAbsences = totalWorkingDays - daysPresent;
        setTotalLeaves(totalAbsences);
    };

    const handleMonthChange = async (e) => {
        const newMonth = e.target.value;
        setSelectedMonth(newMonth);
        
        const monthNumber = months.find(m => m.name === newMonth)?.value;
        if (!monthNumber) return;

        try {
            // Fetch updated leave data for the selected month
            const leaveResponse = await axios.get(
                `http://localhost:3002/api/routes/time-off/monthly-leaves/${userId}/${monthNumber}/2025`,
                {
                    headers: { authorization: `Bearer ${token}` }
                }
            );

            if (leaveResponse.data) {
                const monthlyLeaveData = leaveResponse.data;
                const totalApprovedLeaves = (monthlyLeaveData.total_leave_taken || 0) + 
                                          ((monthlyLeaveData.half_days_taken || 0) * 0.5);
                setApprovedLeaves(totalApprovedLeaves);
            }

            // Update the display for the selected month
            updateMonthlyData(monthNumber, attendanceData);
        } catch (error) {
            console.error('Error fetching leave data:', error);
            toast.error('Error updating leave data');
        }
    };

    const calculateAttendancePercentage = () => {
        if (workingDays === 0) return 0;
        
        const daysPresent = eachMonthData.length;
        // Consider approved leaves as present days for attendance percentage
        const totalPresentDays = daysPresent + approvedLeaves;
        const percentage = (totalPresentDays / workingDays) * 100;
        return Math.min(100, Math.round(percentage)); // Cap at 100%
    };

    return (
        <div className="bg-white rounded-lg shadow-lg border-blue-500 p-3 flex flex-col grow h-[430px]">
            {loading ? (
                <div className="grow w-[380px] h-[430px] flex justify-center items-center">
                    <DotsLoader />
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-medium">Attendance Overview</h2>
                        <select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            {selectedMonths.map(month => (
                                <option key={month.value} value={month.name}>{month.name}</option>
                            ))}
                        </select>
                    </div>
                    {showPieChart && (
                        <div className="">
                            {eachMonthData.length === 0 ? (
                                <p className="text-center text-gray-500">No attendance records found for {selectedMonth}.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: "Present Days", value: eachMonthData.length },
                                                { name: "Approved Leaves", value: approvedLeaves },
                                                { name: "Absences", value: Math.max(0, totalLeaves - approvedLeaves) }
                                            ]}
                                            cx="50%"
                                            cy="40%"
                                            innerRadius={0}
                                            outerRadius={70}
                                            dataKey="value"
                                        >
                                            {COLORS.map((color, idx) => (
                                                <Cell key={`cell-${idx}`} fill={color} />
                                            ))}
                                        </Pie>
                                        <Tooltip wrapperStyle={{ fontSize: "12px", textAlign: "center" }} />
                                        <Legend wrapperStyle={{ fontSize: "12px", textAlign: "center" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    )}
                    {eachMonthData.length > 0 && (
                        <div className="space-y-3 mt-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-blue-900"></div>
                                <span className="text-gray-700 text-sm">
                                    <span className="font-medium">{workingDays}</span> Working Days
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-gray-700 text-sm">
                                    <span className="font-medium">{eachMonthData.length}</span> Present Days
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                                <span className="text-gray-700 text-sm">
                                    <span className="font-medium">{approvedLeaves}</span> Approved Leaves
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-gray-700 text-sm">
                                    <span className="font-medium">{Math.max(0, totalLeaves - approvedLeaves)}</span> Absences
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-gray-700 text-sm">
                                    <span className="font-bold">{calculateAttendancePercentage()}%</span> Attendance
                                    {calculateAttendancePercentage() >= 100 && (
                                        <span className="ml-1 text-green-600">(Perfect)</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttendenceAndLeaveChart;