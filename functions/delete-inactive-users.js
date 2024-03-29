const dynamo = require("../lib/dynamo");
const cognito = require("../lib/cognito");

exports.handler = async (event) => {
  console.log("deleteInactiveUsers called with Event: ", event);

  try {
    const scanResult = await dynamo.getOutdatedUsers();
    if (scanResult.Items && scanResult.Items.length === 0) {
      console.log("No items to delete");
      return event;
    }

    const ids = scanResult.Items.map((item) => item.id);
    await dynamo.deleteUsers(ids);
    console.log("Deleted users from DB: ", ids);

    const cognitoResponse = await cognito.deleteUsers(ids);
    console.log("Deleted users from Cognito: ", cognitoResponse);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
