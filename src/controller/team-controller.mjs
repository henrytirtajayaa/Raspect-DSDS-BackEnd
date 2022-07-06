import {createTeam, getTeam, getAllTeams, deleteTeam, updateTeams} from "../logic/team-logic.mjs";

export default class TeamController {
    static async createTeam(ctx){
        const teamInput = ctx.request.body;
        ctx.body = await createTeam(teamInput);
    }

    static async getTeam(ctx){
        const teamId = ctx.params.id;
        ctx.body = await getTeam(teamId);
    }

    static async getAllTeams(ctx){
        ctx.body = await getAllTeams();
    }

    static async deleteTeam(ctx){
        const teamId = ctx.params.id;
        ctx.body = await deleteTeam(teamId);
    }

    static async updateTeams(ctx){
        const updateParams = ctx.request.body;
        const post = (ctx.state.user.post) ? ctx.state.user.post : ctx.state.user.staffId;
        ctx.body = await updateTeams(post, updateParams);
    }
}