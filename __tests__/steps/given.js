const chance = require("chance").Chance();
const velocityUtil = require("amplify-appsync-simulator/lib/velocity/util");
const cognitoUtil = require("../lib/cognitoUtil");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const a_random_user = () => {
  const firstname = chance.first({ nationality: "en" });
  const lastname = chance.last({ nationality: "en" });
  const suffix = chance.string({
    length: 4,
    pool: "abcdefghijklmnopqrstuvwxyz",
  });
  const name = `${firstname} ${lastname} ${suffix}`;
  const password = chance.string({ length: 8 });
  const email = `${firstname}.${lastname}-${suffix}@meineder.com`;

  return {
    name: name,
    password: password,
    email: email,
  };
};

const an_appsync_velocity_context = (identity, args, result, source) => {
  const util = velocityUtil.create([], new Date(), Object());

  const context = {
    identity,
    args,
    arguments: args,
    result,
    source,
  };

  return {
    context,
    ctx: context,
    util,
    utils: util,
  };
};

function an_appsync_js_context_json(identity, args = {}) {
  const ctx = {
    arguments: args,
    source: {},
    result: {},
    identity: {
      sub: "uuid",
      issuer: " https://cognito-idp.{region}.amazonaws.com/{userPoolId}",
      username: identity,
      claims: {},
      sourceIp: ["x.x.x.x"],
      defaultAuthStrategy: "ALLOW",
    },
  };

  return JSON.stringify(ctx);
}

const an_authenticated_user = async () => {
  const { name, email, password } = a_random_user();
  const { clientId, username } = await cognitoUtil.signupAndConfirmUser(
    name,
    email,
    password
  );
  const { accessToken, idToken } = await cognitoUtil.signInUser(
    clientId,
    username,
    password
  );
  return {
    name,
    username,
    accessToken,
    idToken,
  };
};

const an_inactive_user_with_tweets = async () => {
  const user = await an_authenticated_user();

  await tweet(user, chance.string({ length: 16 }));
  await tweet(user, chance.string({ length: 32 }));
  await tweet(user, chance.string({ length: 8 }));

  await updateLastSeen(user.username, "2001-01-01T00:00:00.000Z");
};

const updateLastSeen = async (userId, lastSeen) => {
  const db = new DynamoDB();
  const document = DynamoDBDocument.from(db);
  const { USERS_TABLE } = process.env;

  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: {
      id: userId,
    },
    UpdateExpression: "SET lastSeen = :lastSeen",
    ExpressionAttributeValues: {
      ":lastSeen": lastSeen,
    },
  });

  try {
    await document.update(command.input);
    console.log("User's lastSeen attribute updated successfully");
  } catch (error) {
    console.error("Error updating user's lastSeen attribute:", error);
  }
};

async function tweet(user, text) {
  const handler = require("../../functions/tweet").handler;
  const context = {};
  const event = {
    identity: {
      username: user.username,
    },
    arguments: {
      text,
    },
  };
  await handler(event, context);
}

module.exports = {
  a_random_user,
  an_appsync_velocity_context,
  an_appsync_js_context_json,
  an_authenticated_user,
  an_inactive_user_with_tweets,
};
