// Runs once, the first time the mongo container starts with an empty data volume.
// Creates the least-privilege user the bot connects as.
const user = process.env.MONGO_APP_USER;
const pwd = process.env.MONGO_APP_PASSWORD;
if (!user || !pwd) throw new Error("MONGO_APP_USER and MONGO_APP_PASSWORD must be set");

db.getSiblingDB("antaresbot").createUser({
  user,
  pwd,
  roles: [{ role: "readWrite", db: "antaresbot" }],
});
