require("dotenv").config();
const given = require("../../steps/given");
const when = require("../../steps/when");
const chance = require("chance").Chance();

describe("Given an authenticated user", () => {
  let user;
  beforeAll(async () => {
    user = await given.an_authenticated_user();
  });

  describe("When he sends a tweet", () => {
    let tweet;
    const text = chance.string({ length: 16 });
    beforeAll(async () => {
      tweet = await when.a_user_calls_tweet(user, text);
    });

    it("Should return the new tweet", () => {
      expect(tweet).toMatchObject({
        text,
        replies: 0,
        likes: 0,
        retweets: 0,
      });
    });

    it("He should get the new tweet when he calls getTweets", async () => {
      const { tweets, nextToken } = await when.a_user_calls_getTweets(
        user,
        user.username,
        25
      );

      expect(nextToken).toBeNull();
      expect(tweets.length).toEqual(1);
      expect(tweets[0]).toEqual(tweet);
    });
  });
});
