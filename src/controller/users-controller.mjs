import {createUser, getFilters, addFilter, removeFilter, findUser, getAllUsers, updateUser, deleteUser, filterUsers, updateFilter} from "../logic/user-mgmt-logic.mjs";
import sanitize from "mongo-sanitize";
export default class UsersController {

    static async createUser(ctx){
        const requestBody = ctx.request.body;
        Object.keys(requestBody).forEach((key, index) => {
            requestBody[key] = sanitize(requestBody[key]);
        });
        ctx.body = await createUser(requestBody);
    }

    static async getUserInfo(ctx) {
        const userId = ctx.params.id;
        const user = await findUser(userId);
        ctx.body = user;
    }

    static async getUsers(ctx) {
        const users = await getAllUsers();
        ctx.body = users;
    }

    static async updateUser(ctx) {
        const body = ctx.request.body;
        const userId = ctx.params.id;
        const updatedUser = await updateUser(userId, body);
        ctx.body = updatedUser;
    }

    static async deleteUser(ctx){
        const userId = ctx.params.id;
        const deletedUser = await deleteUser(userId);
        ctx.body = deletedUser;
    }

    static async filterUsers(ctx){
        const {searchString} = ctx.query;
        const users = await filterUsers(searchString);
        ctx.body = users;
    }

    static async getFilters(ctx){
        const userId = ctx.params.id;
        const user = await getFilters(userId);
        ctx.body = user;
    }

    static async addFilter(ctx){
        const userId = ctx.params.id;
        const newFilter = ctx.request.body;
        const updatedUser = await addFilter(userId, newFilter);
        ctx.body = updatedUser;
    }

    static async removeFilter(ctx){
        const userId = ctx.params.id;
        const filterId = ctx.params.filterid;
        const updatedUser = await removeFilter(userId, filterId);
        ctx.body = updatedUser;
    }

    static async updateFilter(ctx){
        const userId = ctx.params.id;
        const filterId = ctx.params.filterid;
        const body = ctx.request.body;
        const updatedUser = await updateFilter(userId, filterId, body);
        ctx.body = updatedUser;
    }
}