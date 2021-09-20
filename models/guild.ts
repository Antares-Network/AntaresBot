//Nate Goldsborough
//Antares Network Discord Bot 
//This project will morph overtime
//built for discord.js V.12.5.1
//
//guild.ts -- This houses the schema for talking to the MongoDB as well as the data that can be exchanged
// const mongoose = require('mongoose');


import { Schema } from 'mongoose';

const GUILD = new Schema({
    id: String,
    GUILD_JOIN_DATE: String,
    GUILD_ICON_URL: String,
    GUILD_ID: String,
    GUILD_NAME: String,
    GUILD_OWNER_ID: String,
    GUILD_MEMBER_COUNT: String,
    GUILD_MESSAGES: String
})

export default GUILD;