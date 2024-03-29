import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { username } = ctx.identity;
  const { tweetId } = ctx.arguments;
  const transactionWriteItems = {
    operation: "TransactWriteItems",
    transactItems: [
      {
        table: "#LikesTable#",
        operation: "DeleteItem",
        key: util.dynamodb.toMapValues({ userId: username, tweetId }),
        condition: {
          expression: "attribute_exists(userId)",
        },
      },
      {
        table: "#TweetsTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: tweetId }),
        update: {
          expression: "ADD likes :minusOne",
          expressionValues: {
            ":minusOne": util.dynamodb.toDynamoDB(-1),
          },
        },
        condition: {
          expression: "attribute_exists(id)",
        },
      },
      {
        table: "#UsersTable#",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({ id: username }),
        update: {
          expression: "ADD likesCounts :minusOne",
          expressionValues: {
            ":minusOne": util.dynamodb.toDynamoDB(-1),
          },
        },
        condition: {
          expression: "attribute_exists(id)",
        },
      },
    ],
  };

  return transactionWriteItems;
}

export const response = (ctx) => {
  if (ctx.result?.cancellationReasons) {
    console.log(
      "Unlike resolver response cancelled.",
      ctx.result.cancellationReasons
    );
    util.error("DynamoDB transaction error");
  }

  if (ctx.error) {
    util.error("Failed to execute DynamoDB transaction");
  }

  return true;
};
