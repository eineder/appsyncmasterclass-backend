const ulid = require("ulid");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { TweetType } = require("../lib/constants");
const process = require("process");

const { USERS_TABLE, TWEETS_TABLE, TIMELINES_TABLE } = process.env;

const tweet = async (event) => {
  const { text } = event.arguments;
  const { username } = event.identity;
  const id = ulid.ulid();
  const timestamp = new Date().toJSON();

  const newTweet = {
    __typename: TweetType.TWEET,
    id,
    text,
    creator: username,
    createdAt: timestamp,
    replies: 0,
    likes: 0,
    retweets: 0,
    liked: false,
    retweeted: false,
  };

  const document = DynamoDBDocument.from(new DynamoDB());
  await document.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: TWEETS_TABLE,
          Item: newTweet,
        },
      },
      {
        Put: {
          TableName: TIMELINES_TABLE,
          Item: {
            userId: username,
            tweetId: id,
            timestamp,
          },
        },
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: {
            id: username,
          },
          UpdateExpression: "ADD tweetsCount :one",
          ExpressionAttributeValues: {
            ":one": 1,
          },
          ConditionExpression: "attribute_exists(id)",
        },
      },
    ],
  });

  return newTweet;
};

module.exports.handler = tweet;
