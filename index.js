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

async function addTaskToDb() {
    return await db
        .insert({
            name: "sample",
            status: "QUEUED",
        })
        .into("task")
        .returning("*");
}

async function getTasksFromDb() {
    return await db
        .select("*")
        .from("task");
}

const sqs = new aws.SQS({ region: "eu-west-2" });

app.get("/", async (request, response) => {
    const tasks = await getTasksFromDb();
    response.render("index.html", { tasks });
});

app.post("/", async (request, response) => {
    console.log("received post request");
    const task = await addTaskToDb();
    console.log("added to the database");
    sqs.sendMessage({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: JSON.stringify(task),
    }, () => {
        console.log("done!!");
        response.redirect("/");
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App started on port ${port}`));