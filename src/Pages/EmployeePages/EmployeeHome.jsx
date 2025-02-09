import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import LeaveRequest from './components/LeaveForm/LeaveRequestForm';
import LoadingAnimation from '../../Components/Layout/animations/LoadingAnimation';
import axiosInstance from '../../utils/axiosConfig';
import { isTokenExpired, handleLogout } from '../../utils/auth';
import PunchInOut from './components/PunchInOut';
import AttendenceAndLeaveChart from './components/AttendenceAndLeaveChart/AttendenceAndLeaveChart';
import ShowemployeeStats from './ShowemployeeStats';
import EmployeeBreaks from './components/EmployeeBreaks';
import { UserRound, Pencil } from 'lucide-react';
import PermissionDropdown from './components/Permission requests/EmployeePermissions';
import EmergencyContactForm from './components/EmergencyContactForm/EmergencyContactForm';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend
);

function EmployeeHome() {

    const [employee, setEmployee] = useState([])
    const [currentTime, setCurrentTime] = useState('00:00:00');
    const [currentTime2, setCurrentTime2] = useState(new Date().toLocaleTimeString());
    const [totalWorkTime, setTotalWorkTime] = useState('00:00:00');
    const [isPunchedIn, setPunchedIn] = useState(false);
    const [punchInTime, setPunchInTime] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState('2025');
    const [breakTime, setBreakTime] = useState('00:00');
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [breakStartTime, setBreakStartTime] = useState(null);
    const [totalBreakTime, setTotalBreakTime] = useState(0);
    const [showQuote, setShowQuote] = useState(false);
    const [currentQuote, setCurrentQuote] = useState('');
    const [closeBtn, setCloseBtn] = useState(false);
    const [show, setShow] = useState(false);
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    const [startTime, setStartTime] = useState('');
    const [showPunchIn, setShowPunchIn] = useState(true);
    const [recordTime, setRecordTime] = useState({
        startTime: '',
        endTime: ''
    });
    const [totalLeaves, setTotalLEaves] = useState(0);
    const [lop, setLop] = useState(0)
    const [showEmergencyContactForm, setShowEmergencyContactForm] = useState(false);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [userPunchedIn, setUserPunchedIn] = useState(false);
    const [monthlyLeaveData, setMonthlyLeaveData] = useState({
        month: new Date().getMonth() + 1,
        year: 2025,
        total_leave_taken: 0,
        total_loss_of_pay: 0,
        half_days_taken: 0,
        half_day_count: 0,
        permission_count: 0
    });

    const breakOptions = [
        { id: 'break1', label: 'Tea Break 1', maxDuration: 1 },
        { id: 'break2', label: 'Tea Break 2', maxDuration: 1 },
        { id: 'lunch', label: 'Lunch break', maxDuration: 2 },
        { id: 'others', label: 'Other Break', maxDuration: Infinity }
    ];

    useEffect(() => {
        const user = localStorage.getItem('user');
        console.log(JSON.parse(user))
        if (user) {
            setEmployee(JSON.parse(user))
            setShow(true)
        }
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime2(new Date().toLocaleTimeString());
            if (startTime) {
                const now = new Date();
                const sessionDuration = new Date(now - startTime);
                const formattedDuration = sessionDuration.toLocaleTimeString("en-US", {
                    hour12: true,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        let timer;
        if (isPunchedIn) {
            timer = setInterval(() => {
                const elapsed = new Date() - punchInTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                setCurrentTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
                setTotalWorkTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                );
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isPunchedIn, punchInTime]);


    useEffect(() => {
        let timer;
        if (isOnBreak && breakStartTime) {
            timer = setInterval(() => {
                const elapsed = new Date() - breakStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                setBreakTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isOnBreak, breakStartTime]);

    const [showLeaveForm, setShowLeaveForm] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            const token = localStorage.getItem('token');
            if (token && isTokenExpired(token)) {
                await handleLogout();
            }
        };

        const tokenInterval = setInterval(checkToken, 5 * 60 * 1000);

        return () => {
            clearInterval(tokenInterval);
        };
    }, []);

    useEffect(() => {
        const fetchAttendence = async () => {
            try {
                const response = await axiosInstance.get(`/api/routes/attendence/get-loginHistory/${userId}`);
                if (!response.data.ok) {
                    localStorage.setItem("leaves", [])
                    localStorage.setItem("permission", [])
                    localStorage.setItem("attendenceRecords", [])
                    return
                }
                const leaves = response.data.leaves;
                if (leaves) {
                    const leaveCount = leaves.reduce((acc, val) => {
                        return acc + val.total_leave_taken
                    }, 0)
                    setTotalLEaves(leaveCount)
                    const lopCount = leaves.reduce((acc, val) => {
                        return acc + val.total_loss_of_pay
                    }, 0)
                    setLop(lopCount)
                }
                localStorage.setItem("leavesCount", JSON.stringify(leaves))
                localStorage.setItem("leaves", JSON.stringify(response.data.leaves))
                localStorage.setItem("permission", JSON.stringify(response.data.permissions))
                localStorage.setItem("attendenceRecords", JSON.stringify(response.data.data))
            } catch (error) {
                console.error("Error fetching attendance:", error);
            }
        }
        fetchAttendence();
    }, [userId]);

    useEffect(() => {
        const fetchEmergencyContacts = async () => {
            try {
                const response = await axiosInstance.get(`/api/routes/profile/get-profile/${userId}`);
                console.log("Emergency contacts response:", response.data);
                if (response.data.userDetails && response.data.userDetails[0].profile.emergency_contact) {
                    setEmergencyContacts(response.data.userDetails[0].profile.emergency_contact);
                }
            } catch (error) {
                console.error("Error fetching emergency contacts:", error);
            }
        };
        fetchEmergencyContacts();
    }, [userId]);

    useEffect(() => {
        const fetchMonthlyLeaves = async () => {
            try {
                await refreshLeaveData();
            } catch (error) {
                console.error("Error fetching monthly leaves:", error);
            }
        };
        fetchMonthlyLeaves();
    }, [selectedMonth, selectedYear, userId]);

    const refreshLeaveData = async () => {
        try {
            const monthlyLeaveResponse = await axiosInstance.get(
                `/api/routes/time-off/monthly-leaves/${userId}/${selectedMonth}/${selectedYear}`
            );
            
            console.log("Monthly Leave Response:", monthlyLeaveResponse);
            
            if (monthlyLeaveResponse.data) {
                const backendData = monthlyLeaveResponse.data;
                console.log(backendData)
                setMonthlyLeaveData({
                    month: selectedMonth,
                    year: parseInt(selectedYear),
                    total_leave_taken: backendData.total_leave_taken || 0,
                    half_days_taken: backendData.half_days_taken || 0,
                    total_loss_of_pay: backendData.total_loss_of_pay || 0,
                    half_day_count: backendData.half_day_count || 0,
                    permission_count: backendData.permission_count || 0
                });
                console.log(monthlyLeaveData)
            }

            // Refresh attendance and leave history
            const attendanceResponse = await axiosInstance.get(`/api/routes/attendence/get-loginHistory/${userId}`);
            if (attendanceResponse.data.ok) {
                localStorage.setItem("leavesCount", JSON.stringify(attendanceResponse.data.leaves));
                localStorage.setItem("leaves", JSON.stringify(attendanceResponse.data.leaves));
                localStorage.setItem("permission", JSON.stringify(attendanceResponse.data.permissions));
                localStorage.setItem("attendenceRecords", JSON.stringify(attendanceResponse.data.data));
            }
        } catch (error) {
            console.error("Error refreshing leave data:", error);
        }
    };

    useEffect(() => {
        refreshLeaveData();
    }, [selectedMonth, selectedYear, userId]);

    // Add a function to handle leave approval updates
    const handleLeaveApproved = () => {
        refreshLeaveData();
    };

    return (
        <div className="min-h-screen bg-[#F0F0FF]">
            {show ?
                <div className=" mx-auto space-y-4 ">
                    <div className=' rounded shadow-lg py-7 px-4 bg-gradient-to-br from-purple-800 to-indigo-700 mt-2'>
                        <div className='flex justify-start items-center gap-3 '>
                            <p className='text-white text-lg' ><UserRound size={37} /></p>
                            <h2 className="text-lg font-semibold text-gray-800 text-white">Welcome,  {employee.username}</h2>
                        </div>
                    </div>
                    <div className="flex flex-col  md:flex-row gap-4 h-[430px]">
                        <div>
                            {showPunchIn ? (
                                <PunchInOut
                                    onPunchStateChange={(state) => setUserPunchedIn(state)}
                                />
                            ) : (
                                <LoadingAnimation />
                            )}
                        </div>
                        <EmployeeBreaks isPunchedIn={userPunchedIn} />


                    </div>
                    <div className="flex flex-row flex-wrap  flex-grow gap-5">

                        <div className="bg-white rounded-lg shadow-lg  border-indigo-500 p-6 flex  flex-col grow w-[380px] h-[430px]">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-100 shadow-md">
                                    <img
                                        src="https://res.cloudinary.com/da6xossg7/image/upload/v1735627700/user1_k9cfrj.jpg"
                                        alt="Stephan Peralt"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800">{employee.username}</h2>
                                    <p className="text-sm text-gray-600">{employee.profession.designation}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                                    <p className="text-sm font-medium text-gray-800">{employee.phone}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                                    <p className="text-sm font-medium text-gray-800">{employee.email}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Report Office</p>
                                    <p className="text-sm font-medium text-gray-800">{employee.profession.reporting_manager}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Joined on</p>
                                    <p className="text-sm font-medium text-gray-800">{employee.profile.joining_date}</p>
                                </div>
                                {/* {emergencyContacts && emergencyContacts.length > 0 && (
                                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs text-gray-500">Emergency Contacts</p>
                                            <button 
                                                onClick={() => setShowEmergencyContactForm(true)}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Pencil size={14} strokeWidth={1.75} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {emergencyContacts.map((contact, index) => (
                                                <div key={index} className="border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                                                    <div className="flex justify-between">
                                                        <p className="text-sm font-medium text-gray-800">{contact.name}</p>
                                                        <p className="text-xs text-gray-600">{contact.relationship}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-600">{contact.phone_number}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )} */}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg  border-fuchsia-800  p-6 flex w-[380px] h-[430px] flex-col grow hover:shadow-xl transition-all duration-300 overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg">Leave Details</h2>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        className="p-2 bg-gray-50 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {[
                                            "January", "February", "March", "April", "May", "June",
                                            "July", "August", "September", "October", "November", "December"
                                        ].map((month, index) => (
                                            <option key={index + 1} value={index + 1}>{month}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="p-2 bg-gray-50 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {/* <option value="2024">2024</option> */}
                                        <option value="2025">2025</option>
                                    </select>
                                </div>
                            </div>
                            <div className='flex flex-col justify-between gap-5'>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-gray-50 p-3 ps-2 rounded-lg">
                                        <p className="text-gray-600 text-sm">Monthly Leave Quota</p>
                                        <p className="mt-1">1 day or 2 half-days</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 ps-2 rounded-lg">
                                        <p className="text-gray-600 text-sm">Permissions Taken</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="flex items-center gap-2">
                                                <p>{monthlyLeaveData?.permission_count || 0} of 2</p>
                                                {monthlyLeaveData?.permission_count >= 2 && (
                                                    <span className="text-xs text-amber-600">(Limit Reached)</span>
                                                )}
                                            </div>
                                            {monthlyLeaveData?.permission_count > 0 && (
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                    Approved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 ps-2 rounded-lg">
                                        <p className="text-gray-600 text-sm">Regular Leaves Taken</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p>{monthlyLeaveData?.total_leave_taken || 0} days</p>
                                            {monthlyLeaveData?.total_leave_taken > 0 && (
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                    Approved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 ps-2 rounded-lg">
                                        <p className="text-gray-600 text-sm">Half-Day Leaves Taken</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="flex items-center gap-2">
                                                <p>{monthlyLeaveData?.half_days_taken || 0} </p>
                                                <span className="text-xs text-gray-500">({monthlyLeaveData?.half_day_count || 0} half days)</span>
                                            </div>
                                            {monthlyLeaveData?.half_days_taken > 0 && (
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                    Approved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 ps-2 rounded-lg">
                                        <p className="text-gray-600 text-sm">Total Leaves</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p>{monthlyLeaveData?.total_leave_taken + ((monthlyLeaveData?.half_days_taken || 0) * 0.5) || 0} days</p>
                                            {(monthlyLeaveData?.total_leave_taken + ((monthlyLeaveData?.half_days_taken || 0) * 0.5)) > 1 && (
                                                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                                    Exceeds Quota
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 ps-2 rounded-lg">
                                        <p className="text-gray-600 text-sm">Loss of Pay</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className={monthlyLeaveData?.total_loss_of_pay > 0 ? "text-red-600" : "text-gray-900"}>
                                                {monthlyLeaveData?.total_loss_of_pay || 0} days
                                            </p>
                                            {monthlyLeaveData?.total_loss_of_pay > 0 && (
                                                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                                    LOP Applied
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowLeaveForm(true)
                                        setCloseBtn(true)
                                    }}
                                    className="w-full bg-gray-900 text-white py-3 rounded-lg mt-6 hover:bg-gray-800 transition-all transform hover:scale-[1.02] font-medium shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>Apply New Leave</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg border-indigo-500 p-6 flex w-[380px] h-[430px] flex-col grow hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold">Emergency Contacts</h2>
                                <button 
                                    onClick={() => setShowEmergencyContactForm(true)}
                                    className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <Pencil size={16} strokeWidth={1.75} />
                                </button>
                            </div>
                            
                            {emergencyContacts && emergencyContacts.length > 0 ? (
                                <div className="space-y-4">
                                    {emergencyContacts.map((contact, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">Name</p>
                                                    <p className="font-medium">{contact.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Relationship</p>
                                                    <p className="font-medium">{contact.relationship}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">Phone Number</p>
                                                    <p className="font-medium">{contact.phone_number}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <p className="text-gray-500 mb-4">No emergency contacts added yet</p>
                                    <button
                                        onClick={() => setShowEmergencyContactForm(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Add Emergency Contacts
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className='grow w-[380px]'>
                            <AttendenceAndLeaveChart />
                        </div>
                    </div>
                    <div>
                        <ShowemployeeStats />
                        <PermissionDropdown />
                    </div>

                </div>
                :
                <LoadingAnimation />}
            {showLeaveForm
                && <div className='flex min-h-screen w-h-screen absolute justify-center items-center top-0 z-[1000] overflow-y-auto'>
                    <LeaveRequest
                        onClose={() => setShowLeaveForm(false)}
                        onLeaveSubmitted={refreshLeaveData}
                    />

                </div>
            }
            {showEmergencyContactForm && (
                <EmergencyContactForm onClose={() => setShowEmergencyContactForm(false)} />
            )}
        </div>
    );
}

export default EmployeeHome;