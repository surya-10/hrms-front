import React, { useEffect, useState } from 'react';
import { colorPairs } from '../ManagerPages/ManagerHome';
import axios from 'axios';

const ShowemployeeStats = () => {
    const [totalWorkTime, setTotalWorkTime] = useState('00:00:00');
    const [totalBreakTime, setTotalBreakTime] = useState(0);
    const [allRecords, setallRecords] = useState([]);
    const [averageHours, setAverageHours] = useState("");
    const [loading, setLoading] = useState(false);
    const [breakTaken, setBreakTaken] = useState(0);
    const [Productivity, setProductivity] = useState("");
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    const [viewBreak, setViewBreak] = useState(false)
    const [isOverBreak, setIsOverBreak] = useState(false);
    const [breakPercentageDifference, setBreakPercentageDifference] = useState("0");
    const [formattedBreakTime, setFormattedBreakTime] = useState("0H 0M");



    useEffect(() => {
        const fetchData = async () => {
            const attendanceRecords = localStorage.getItem("attendenceRecords");
            if (attendanceRecords) {
                const parsedRecords = JSON.parse(attendanceRecords);
                console.log(parsedRecords.slice(-2, -1))
                setallRecords(parsedRecords.slice(-2, -1));
                const lastSixRecords = parsedRecords.slice(-7);
                const lastDayRecords = parsedRecords.slice(-2, -1)
                const res = await getRecords(lastDayRecords);
                const avgHours = calculateAverageTime(res.map((data) => data.hours));
                console.log(avgHours)

                setAverageHours(avgHours);
                setLoading(true)
            }
            else {
                setAverageHours("0H 0M")
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const getAllBreaks = async () => {
            try {
                const response = await axios.get(`http://localhost:3002/api/routes/break-details/get-all-breaks/${userId}`, {
                    headers: {
                        authorization: `Bearer ${token}`,
                    }
                });
                const result = calculateBreakTime(response.data.breaks.breaks);
                setTotalBreakTime(result.percent);
                setIsOverBreak(result.isOver);
                setBreakPercentageDifference(result.percentageDifference);
                setFormattedBreakTime(result.formattedTime);
                setViewBreak(true);
            } catch (error) {
                console.log(error);
            }
        };
        getAllBreaks();
    }, []);

    function calculateBreakTime(breaks) {
        let totalMilliseconds = 0;

        breaks.forEach(breakItem => {
            if (breakItem.startTime && breakItem.endTime) {
                totalMilliseconds += (breakItem.endTime - breakItem.startTime);
            }
        });

        const totalHours = totalMilliseconds / (1000 * 60 * 60);
        const limitHours = 1.5;

        const percentOfLimit = (totalHours / limitHours) * 100;
        const isOver = totalHours > limitHours;

        const percentageDifference = isOver
            ? ((totalHours - limitHours) / limitHours * 100).toFixed(1)
            : ((limitHours - totalHours) / limitHours * 100).toFixed(1);

        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        const formattedTime = `${hours}H ${minutes}M`;

        return {
            percent: percentOfLimit > 100 ? 100 : percentOfLimit,
            isOver: isOver,
            percentageDifference: percentageDifference,
            formattedTime: formattedTime
        };
    }




    function calculateAverageTime(timeArray) {
        let totalMinutes = 0;
        let count = 0;

        timeArray.forEach(time => {
            if (time !== "-") {
                let [hours, minutes] = time.split('H').map(s => s.trim());
                minutes = minutes.replace('M', '').trim();
                totalMinutes += (parseInt(hours) * 60) + parseInt(minutes);
                count++;
            }
        });

        if (count === 0) return "0H 0M";

        let avgMinutes = Math.round(totalMinutes / count);
        let avgHours = Math.floor(avgMinutes / 60);
        let remainingMinutes = avgMinutes % 60;

        return `${avgHours}H ${remainingMinutes}M`;
    }

    const getRecords = async (data) => {
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

            const totalHours = calculateTotalHours(record.startTime, record.endTime);
            // console.log(totalHours);

            record.hours = totalHours;
            records.push(record);
        }
        return records;
    };

    function calculateTotalHours(startTime, endTime) {
        if (!startTime || !endTime) return "-";

        const start = new Date(`1970-01-01T${convertTo24HourFormat(startTime)}`);
        const end = new Date(`1970-01-01T${convertTo24HourFormat(endTime)}`);
        const diff = (end - start) / (1000 * 60);

        if (diff < 0) return "-";

        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;

        return `${hours}H ${minutes}M`;
    }

    function convertTo24HourFormat(time) {
        if (!time) return null;
        const [timePart, modifier] = time.split(" ");
        let [hours, minutes] = timePart.split(":").map(Number);

        if (modifier === "PM" && hours !== 12) {
            hours += 12;
        } else if (modifier === "AM" && hours === 12) {
            hours = 0;
        }

        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }

    const calculateChangePercent = (total, worked) => {
        if (!total || !worked) return { percent: 0, isOver: false, difference: "0" };

        const timeToMinutes = (time) => {
            let [hours, minutes] = time.split("H").map(s => s.trim());
            minutes = minutes.replace("M", "").trim();
            return (parseInt(hours) * 60) + (parseInt(minutes) || 0);
        };

        const totalMinutes = timeToMinutes(total);
        const workedMinutes = timeToMinutes(worked);

        if (isNaN(totalMinutes) || isNaN(workedMinutes) || totalMinutes === 0) {
            return { percent: 0, isOver: false, difference: "0" };
        }

        const percentage = (workedMinutes / totalMinutes) * 100;
        const difference = Math.abs(100 - percentage).toFixed(1);
        const isOver = percentage > 100;

        return {
            percent: percentage.toFixed(1),
            difference,
            isOver
        };
    };

    function calculatePercentLess(total, worked) {
        if (!total || !worked) return "0%";

        const timeToMinutes = (time) => {
            let [hours, minutes] = time.split("H").map(s => s.trim());
            minutes = minutes.replace("M", "").trim();
            return (parseInt(hours) * 60) + (parseInt(minutes) || 0);
        };
        const totalMinutes = timeToMinutes(total);
        const workedMinutes = timeToMinutes(worked);
        if (isNaN(totalMinutes) || isNaN(workedMinutes) || totalMinutes === 0) return "0%";
        const percentage = ((workedMinutes / totalMinutes) * 100).toFixed(1);
        console.log(percentage)
        return `${percentage}%`;
    };
    const productivityStats = calculateChangePercent("10H", averageHours);



    return (
        <div>
            <div className="bg-white p-4 rounded-lg shadow-xl">
                <h3 className="text-xl font-semibold text-gray-800 mb-3 "> stats</h3>
                <div className='grid grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-4'>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 flex items-center justify-center text-2xl rounded-full shadow-sm">
                                🌟
                            </div>
                            <div className={`text-xs font-medium ${!isOverBreak ? 'text-emerald-600' : 'text-red-600'} flex items-center rounded-full shadow-sm`}>
                                {!isOverBreak ? '↓' : '↑'} {breakPercentageDifference}%
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-sm text-gray-600 font-medium">Previous day break time</p>
                            <p className="text-lg font-[600] mt-1 text-gray-800">
                                {formattedBreakTime}
                                <span className='text-[12px] text-gray-600 ml-2'>/1.5H limit</span>
                            </p>
                        </div>
                        <div className="w-full h-1.5 rounded-full mt-3 bg-white/50 overflow-hidden">
                            <div
                                className={`h-full ${!isOverBreak ? 'bg-emerald-500' : 'bg-red-500'} rounded-full transition-all duration-1000`}
                                style={{
                                    width: `${totalBreakTime}%`,
                                    boxShadow: '0 0 8px rgba(0,0,0,0.1)'
                                }}
                            ></div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 text-emerald-600 flex items-center justify-center text-2xl rounded-full shadow-sm">
                                ⚡
                            </div>
                            <div className={`text-xs font-medium ${!productivityStats.isOver ? 'text-red-600' : 'text-emerald-600'} flex items-center  px-2 py-1 rounded-full shadow-sm`}>
                                {productivityStats.isOver ? '↑' : '↓'} {productivityStats.difference}%
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-sm text-gray-600 font-medium">Productivity - previous login</p>
                            <p className="text-lg font-[600] mt-1 text-gray-800">
                                {averageHours}
                                <span className='text-[12px] text-gray-600  ml-2'>/10H</span>
                            </p>
                        </div>
                        <div className="w-full h-1.5 rounded-full mt-3 bg-white/50 overflow-hidden">
                            <div
                                className={`h-full ${!productivityStats.isOver ? 'bg-red-500' : 'bg-emerald-500'} rounded-full transition-all duration-1000`}
                                style={{
                                    width: `${Math.min(productivityStats.percent, 100)}%`,
                                    boxShadow: '0 0 8px rgba(0,0,0,0.1)'
                                }}
                            ></div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 flex items-center justify-center text-2xl rounded-full shadow-sm">
                                🌟
                            </div>
                            <div className={`text-xs font-medium ${!isOverBreak ? 'text-emerald-600' : 'text-red-600'} flex items-center rounded-full shadow-sm`}>
                                {!isOverBreak ? '↓' : '↑'} {breakPercentageDifference}%
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-sm text-gray-600 font-medium">Break Time</p>
                            <p className="text-lg font-[600] mt-1 text-gray-800">
                                {formattedBreakTime}
                                <span className='text-[12px] text-gray-600 ml-2'>/1.5H limit</span>
                            </p>
                        </div>
                        <div className="w-full h-1.5 rounded-full mt-3 bg-white/50 overflow-hidden">
                            <div
                                className={`h-full ${!isOverBreak ? 'bg-emerald-500' : 'bg-red-500'} rounded-full transition-all duration-1000`}
                                style={{
                                    width: `${totalBreakTime}%`,
                                    boxShadow: '0 0 8px rgba(0,0,0,0.1)'
                                }}
                            ></div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    )
}

export default ShowemployeeStats