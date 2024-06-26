require("dotenv").config();
const fs = require("fs");
const cognitoUtil = require("../lib/cognitoUtil");
const { GraphQL, registerFragment } = require("../lib/graphql");
const { AppSync } = require("@aws-sdk/client-appsync");
const process = require("process");

const myProfileFragment = `
fragment myProfileFields on MyProfile {
  id
  name
  screenName
  imageUrl
  backgroundImageUrl
  bio
  location
  website
  birthdate
  createdAt
  followersCount
  followingCount
  tweetsCount
  likesCounts
}
`;

const otherProfileFragment = `
fragment otherProfileFields on OtherProfile {
  id
  name
  screenName
  imageUrl
  backgroundImageUrl
  bio
  location
  website
  birthdate
  createdAt
  followersCount
  followingCount
  tweetsCount
  likesCounts
}
`;

const iProfileFragment = `
fragment iProfileFields on IProfile {
  ... on MyProfile {
    ... myProfileFields
  }

  ... on OtherProfile {
    ... otherProfileFields
  }
}
`;

const tweetFragment = `
fragment tweetFields on Tweet {
  id
  profile {
    ... iProfileFields
  }
  createdAt
  text
  replies
  likes
  retweets
  liked
}
`;

const iTweetFragment = `
fragment iTweetFields on ITweet {
  ... on Tweet {
    ... tweetFields
  }
}
`;

registerFragment("myProfileFields", myProfileFragment);
registerFragment("otherProfileFields", otherProfileFragment);
registerFragment("iProfileFields", iProfileFragment);
registerFragment("tweetFields", tweetFragment);
registerFragment("iTweetFields", iTweetFragment);

const we_invoke_confirmUserSignup = async (username, name, email) => {
  const handler = require("../../functions/confirm-user-signup").handler;
  const context = {};
  const event = {
    version: "1",
    region: process.env.AWS_REGION,
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    userName: username,
    triggerSource: "PostConfirmation_ConfirmSignUp",
    request: {
      userAttributes: {
        sub: username,
        "cognito:email_alias": email,
        "cognito:user_status": "CONFIRMED",
        email_verified: "false",
        name: name,
        email: email,
      },
    },
    response: {},
  };

  await handler(event, context);
};

/**
 * Performs a real sign up of a new user using Cognito
 */
const a_user_signs_up = async (password, name, email) => {
  const { username } = await cognitoUtil.signupAndConfirmUser(
    name,
    email,
    password
  );

  return {
    username,
    name,
    email,
  };
};

const a_user_calls_getMyProfile = async (user) => {
  const getMyProfile = `query getMyProfile {
    getMyProfile {
      ... myProfileFields

      tweets {
        nextToken
        tweets {
        ... iTweetFields
        }
      }
    }
  }`;
  const data = await GraphQL(
    process.env.API_URL,
    getMyProfile,
    {},
    user.accessToken
  );
  const profile = data.getMyProfile;

  console.log(`[${user.username}] - fetched profile`);

  return profile;
};

const a_user_calls_editMyProfle = async (user, input) => {
  const mutation = `mutation editMyProfile($input: ProfileInput!) {
    editMyProfile(newProfile: $input) {
      ... myProfileFields 

      tweets {
        nextToken
        tweets {
        ... iTweetFields
        }
      }
    }
  }`;
  const variables = {
    input,
  };

  const data = await GraphQL(
    process.env.API_URL,
    mutation,
    variables,
    user.accessToken
  );
  const profile = data.editMyProfile;
  console.log(`[${user.username}] - edited his profile`);

  return profile;
};

const we_invoke_getImageUploadUrl = async (
  username,
  extension,
  contentType
) => {
  const handler = require("../../functions/get-upload-url").handler;
  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      extension,
      contentType,
    },
  };

  return await handler(event, context);
};

const we_invoke_tweet = async (username, text) => {
  const handler = require("../../functions/tweet").handler;
  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      text,
    },
  };

  return await handler(event, context);
};

const we_invoke_retweet = async (username, tweetId) => {
  const handler = require("../../functions/retweet").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      tweetId,
    },
  };

  return await handler(event, context);
};

const we_invoke_unretweet = async (username, tweetId) => {
  const handler = require("../../functions/unretweet").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      tweetId,
    },
  };

  return await handler(event, context);
};

const a_user_calls_getImageUploadUrl = async (user, extension, contentType) => {
  const query = `query getImageUploadUrl($extension: String, $contentType: String) {
    getImageUploadUrl(extension: $extension, contentType: $contentType)
  }`;
  const variables = {
    extension,
    contentType,
  };
  const data = await GraphQL(
    process.env.API_URL,
    query,
    variables,
    user.accessToken
  );
  const url = data.getImageUploadUrl;
  console.log(`[${user.username}] - got image upload URL`);

  return url;
};

const a_user_calls_tweet = async (user, text) => {
  const mutation = `mutation tweet($text: String!) {
    tweet(text: $text) {
      id
      profile {
        ... iProfileFields
      }
      createdAt
      text
      replies
      likes
      retweets
      liked
    }
  }`;

  const variables = {
    text,
  };

  const data = await GraphQL(
    process.env.API_URL,
    mutation,
    variables,
    user.accessToken
  );
  const newTweet = data.tweet;
  console.log(`[${user.username}] - posted new tweet`);

  return newTweet;
};

const a_user_calls_getTweets = async (user, userId, limit, nextToken) => {
  const query = `query getTweets($userId: ID!, $limit: Int!, $nextToken: String) {
    getTweets(userId: $userId, limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        ... iTweetFields
      }
    }
  }`;

  const variables = {
    userId,
    limit,
    nextToken,
  };

  const data = await GraphQL(
    process.env.API_URL,
    query,
    variables,
    user.accessToken
  );

  return data.getTweets;
};

const a_user_calls_getMyTimeline = async (user, limit, nextToken) => {
  const getMyTimeline = `query getMyTimeline($limit: Int!, $nextToken: String) {
    getMyTimeline(limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        ... iTweetFields
      }
    }
  }`;
  const variables = {
    limit,
    nextToken,
  };

  const data = await GraphQL(
    process.env.API_URL,
    getMyTimeline,
    variables,
    user.accessToken
  );
  const result = data.getMyTimeline;

  console.log(`[${user.username}] - fetched timeline`);

  return result;
};

const a_user_calls_getLikes = async (user, userId, limit, nextToken) => {
  const getLikes = `query getLikes($userId: ID!, $limit: Int!, $nextToken: String) {
    getLikes(userId: $userId, limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        ... iTweetFields
      }
    }
  }`;
  const variables = {
    userId,
    limit,
    nextToken,
  };

  const data = await GraphQL(
    process.env.API_URL,
    getLikes,
    variables,
    user.accessToken
  );
  const result = data.getLikes;

  console.log(`[${user.username}] - fetched likes`);

  return result;
};

const a_user_calls_like = async (user, tweetId) => {
  const likeMutation = `mutation likeMutation($tweetId: ID!) {
    like(tweetId: $tweetId)
  }`;

  const variables = {
    tweetId,
  };

  const data = await GraphQL(
    process.env.API_URL,
    likeMutation,
    variables,
    user.accessToken
  );
  const result = data;

  console.log(`[${user.username}] - liked tweet ${tweetId}`);

  return result;
};

const a_user_calls_unlike = async (user, tweetId) => {
  const unlikeMutation = `mutation unlikeMutation($tweetId: ID!) {
    unlike(tweetId: $tweetId)
  }`;

  const variables = {
    tweetId,
  };

  const data = await GraphQL(
    process.env.API_URL,
    unlikeMutation,
    variables,
    user.accessToken
  );
  const result = data;

  console.log(`[${user.username}] - unliked tweet ${tweetId}`);

  return result;
};

const we_evaluate_resolver_function = async (
  resolverPath,
  contextJson,
  func = "request"
) => {
  const client = new AppSync({
    region: "eu-west-1",
  });
  const runtime = { name: "APPSYNC_JS", runtimeVersion: "1.0.0" };
  const code = fs.readFileSync(resolverPath, "utf8");

  const response = await client.evaluateCode({
    code,
    context: contextJson,
    runtime,
    function: func,
  });

  if (response.error) {
    throw response.error;
  }

  return JSON.parse(response.evaluationResult);
};

const we_invoke_deleteInactiveUsers = async () => {
  const handler = require("../../functions/delete-inactive-users").handler;

  return await handler({}, {});
};

module.exports = {
  we_invoke_confirmUserSignup,
  a_user_signs_up,
  a_user_calls_getMyProfile,
  a_user_calls_editMyProfle,
  we_invoke_getImageUploadUrl,
  a_user_calls_getImageUploadUrl,
  we_invoke_tweet,
  we_invoke_retweet,
  a_user_calls_tweet,
  we_invoke_unretweet,
  a_user_calls_getTweets,
  a_user_calls_getMyTimeline,
  a_user_calls_like,
  a_user_calls_unlike,
  a_user_calls_getLikes,
  we_evaluate_resolver_function,
  we_invoke_deleteInactiveUsers,
};
