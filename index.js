import {} from "dotenv/config";
import aws from "aws-sdk";
import express from "express";
import nunjucks from "nunjucks";
import knex from "knex";

const db = knex({
    client: "pg",
    connection: process.env.DATABASE_CONNECTION_STRING
});

const app = express();

nunjucks.configure("./templates/", {
    autoescape: true,
    express: app
});

async function getTasksFromDb() {
    return await db
        .select("*")
        .from("task");
}

const eventBridge = new aws.EventBridge({ region: "eu-west-2" });

app.get("/", (request, response) => {
    response.send("OK");
});

app.get("/tasks", async (request, response) => {
    const tasks = await getTasksFromDb();
    eventBridge.listRules({}, (err, rules) => {
        response.render("index.html", { tasks, rules: rules.Rules || [] });
    });
});

app.post("/tasks", async (request, response) => {
    eventBridge.putEvents({
        Entries: [
            {
                DetailType: "EIQ ML Event",
                Detail: JSON.stringify({
                    JobType: "short_event"
                }),
                Source: "EIQ Admin"
            }
        ]
    }, (error, data) => {
        console.log(error);
        console.log(data);
        response.redirect("/tasks");
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App started on port ${port}`));