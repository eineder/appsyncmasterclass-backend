const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { DynamoDB: DynamoDb } = require("@aws-sdk/client-dynamodb");
const DocumentClient = DynamoDBDocument.from(new DynamoDb());
const process = require("process");

const Chance = require("chance");
const chance = new Chance();
const { USERS_TABLE } = process.env;

module.exports.handler = async (event) => {
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    const name = event.request.userAttributes["name"];
    const suffix = chance.string({
      length: 8,
      casing: "upper",
      alpha: true,
      numeric: true,
    });
    const screenName = `${name.replace(/[^a-zA-Z0-9]/g, "")}${suffix}`;
    const now = new Date().toJSON();
    const user = {
      id: event.userName,
      name: name,
      screenName: screenName,
      lastSeen: now,
      createdAt: now,
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
      likesCounts: 0,
    };
    await DocumentClient.put({
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: "attribute_not_exists(id)",
    });
    return event;
  } else {
    return event;
  }
};
