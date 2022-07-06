import {createUser, findUserByStaffId} from "../logic/user-mgmt-logic.mjs";
import {ROLES} from "../constant/role.mjs";

export async function initDB() {
    const existingSuperAdmin = await findUserByStaffId('admin@raspect.ai');
    if (!existingSuperAdmin) {
        await createUser({
            staffId: 'admin@raspect.ai',
            password: 'RaspectAdmin2021', // Not secure, change to send password to email
            role: ROLES.ROLE_SUPER_ADMIN,
        });
    }
    const existingSupervisor = await findUserByStaffId('andy.yeung@raspect.ai');
    if (!existingSupervisor) {
        await createUser({
            staffId: 'andy.yeung@raspect.ai',
            password: 'RaspectAdmin2021', // Not secure, change to send password to email
            role: ROLES.ROLE_SUPERVISOR,
        });
    }
    const apiUser = await findUserByStaffId('dsds.api@raspect.ai');
    if (!apiUser) {
        await createUser({
            staffId: 'dsds.api@raspect.ai',
            password: 'RaspectAPI2021', // Not secure, change to send password to email
            role: ROLES.ROLE_API,
        });
    }
}