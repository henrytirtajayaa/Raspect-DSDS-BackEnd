import getConnection from "../model/connection-factory.mjs";
import mongoose from "mongoose";

export async function createTeam(teamInput){
    const db = await getConnection();
    const Team = db.model('Team');
    const team = new Team(teamInput);
    await team.save();
    return team;
}

export async function getTeam(teamId){
    const db = await getConnection();
    const Team = db.model('Team');
    return Team.findOne({
        _id: teamId 
    });
}

export async function getAllTeams(){
    const db = await getConnection();
    const Team = db.model('Team');
    return Team.find();
}

export async function deleteTeam(teamId){
    const db = await getConnection();
    const Team = db.model('Team');
    const Survey = db.model('Survey');
    await Team.deleteOne({
        _id: teamId
    });
    await Survey.updateMany({
    },{
        $pull: {
            teamIds: mongoose.Types.ObjectId(teamId)
        }
    })
    return teamId;
}

export async function updateTeam(post, teamId, updateParams){
    const db = await getConnection();
    const Team = db.model('Team');
    return await Team.findOneAndUpdate({
        _id: teamId
    },{
        $set: {...updateParams, 
            lastModifiedBy: post
        }
    },{
        new: true,
        timestamps: true
    });
}

export async function updateTeams(post, updateParams){
    const db = await getConnection();
    const Team = db.model('Team');
    if(updateParams.addTeams){
        for(const team of updateParams.addTeams){
            await createTeam(team);
        }
    }
    if(updateParams.deleteTeams){
        for(const team of updateParams.deleteTeams){
            await deleteTeam(team._id);
        }
    }
    if(updateParams.updateTeams){
        for(const team of updateParams.updateTeams){
            await updateTeam(post, team._id, team);
        }
    }
    return getAllTeams();
}