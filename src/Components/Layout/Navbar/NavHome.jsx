import React, { useContext } from 'react'
import HrNavBar from './HrNavBar';
import ManagerNavBar from './ManagerNavBar';
import { AuthContext } from '../../../Router';
import EmployeeNavBar from './EmployeeNavBar';

const NavHome = () => {
    const { userData } = useContext(AuthContext);

    switch (userData?.role?.role_value) {
        case "admin":
            return (
                <div className='relative z-[10]'>
                    <HrNavBar />
                </div>
            );
        case "manager":
            return (
                <div className='relative z-[10]'>
                    <ManagerNavBar />
                </div>
            );
        case "user":
            return (
                <div className='relative z-[10]'>
                    <EmployeeNavBar />
                </div>
            );
        default:
            return null;
    }
};

export default NavHome;