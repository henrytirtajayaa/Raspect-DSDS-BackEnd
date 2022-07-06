import test from "ava";
import {login} from "../../src/logic/auth-logic.mjs";
import {createMockUser, deleteMockUser} from "./mock-data-helper.mjs";
import {changeUserRole} from "../../src/logic/user-mgmt-logic.mjs";
import roles from "../../src/constant/role.mjs";
import jwt from 'jsonwebtoken';

test.serial.before(async t => {
    await createMockUser();
})

test.serial.after(async t => {
    await deleteMockUser();
})


test.serial('Change role of user', async t => {
    const updatedUser = await changeUserRole('andy.yeung@raspect.ai', roles.ROLE_ADMIN);
    t.is(updatedUser.role, roles.ROLE_ADMIN);
    const token = await login('andy.yeung@raspect.ai', 'password');
    const jwtDecoded = jwt.decode(token.accessToken);
    t.is(jwtDecoded.role, roles.ROLE_ADMIN);
});

test.serial('Change status of user', async t => {
    const updatedUser = await changeUserRole('andy.yeung@raspect.ai', roles.ROLE_ADMIN);
    t.is(updatedUser.role, roles.ROLE_ADMIN);
    const token = await login('andy.yeung@raspect.ai', 'password');
    const jwtDecoded = jwt.decode(token.accessToken);
    t.is(jwtDecoded.role, roles.ROLE_ADMIN);
});