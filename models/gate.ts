//Nate Goldsborough
//Antares Network Discord Bot 

import mongoose, { Schema , Document } from 'mongoose';

const GATE = new Schema({
    id: String,
    NAME: String,
    GUILD_OWNER_ID: Array,
    BANNED_OWNERS: Array,
    BANNED_USERS: Array,
    BANNED_GUILDS: Array,
    TOTAL_MESSAGES: String,
    TOTAL_SERVERS: String,
    TOTAL_USERS: String,
    IGNORED_GUILDS: Array,
    UPDATE_TIME: String
});

export default mongoose.model('GATE', GATE);