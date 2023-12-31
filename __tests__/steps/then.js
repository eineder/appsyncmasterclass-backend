const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const http = require("axios").default;
const fs = require("fs");

const user_exists_in_UsersTable = async (id) => {
  const document = DynamoDBDocument.from(new DynamoDB());
  console.log(
    `Looking for user with id ${id} in table [${process.env.USERS_TABLE}].`
  );
  const resp = document.get({
    TableName: process.env.USERS_TABLE,
    Key: {
      id,
    },
  });

  expect((await resp).Item).toBeTruthy();

  return (await resp).Item;
};

const tweet_exists_in_tweets_table = async (id) => {
  const document = DynamoDBDocument.from(new DynamoDB());
  console.log(
    `Looking for tweet with id ${id} in table [${process.env.TWEETS_TABLE}].`
  );
  const resp = document.get({
    TableName: process.env.TWEETS_TABLE,
    Key: {
      id,
    },
  });

  expect((await resp).Item).toBeTruthy();

  return (await resp).Item;
};

const tweet_exists_in_timelines_table = async (userId, tweetId) => {
  const document = DynamoDBDocument.from(new DynamoDB());
  console.log(
    `Looking for tweet with id ${tweetId} for user ${userId} in table [${process.env.TIMELINES_TABLE}].`
  );
  const resp = document.get({
    TableName: process.env.TIMELINES_TABLE,
    Key: {
      userId,
      tweetId,
    },
  });

  expect((await resp).Item).toBeTruthy();

  return (await resp).Item;
};

const tweetsCount_is_updated_in_users_table = async (userId, count) => {
  const document = DynamoDBDocument.from(new DynamoDB());
  console.log(
    `Looking for user ${userId} in table [${process.env.USERS_TABLE}].`
  );
  const resp = document.get({
    TableName: process.env.USERS_TABLE,
    Key: {
      id: userId,
    },
  });

  expect((await resp).Item).toBeTruthy();
  expect((await resp).Item.tweetsCount).toEqual(count);

  return (await resp).Item;
};

const user_can_upload_image_to_url = async (url, filepath, contentType) => {
  const data = fs.readFileSync(filepath);
  try {
    await http({
      method: "put",
      url,
      headers: {
        "Content-Type": contentType,
      },
      data,
    });
  } catch (error) {
    console.log(error);
  }

  console.log("uploaded image to", url);
};

const user_can_download_from = async (url) => {
  const response = await http.get(url);

  console.log("downloaded image from ", url);

  return response.data;
};

module.exports = {
  user_exists_in_UsersTable,
  user_can_upload_image_to_url,
  user_can_download_from,
  tweet_exists_in_tweets_table,
  tweet_exists_in_timelines_table,
  tweetsCount_is_updated_in_users_table,
};
