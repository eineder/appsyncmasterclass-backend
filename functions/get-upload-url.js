const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const process = require("process");

const { PutObjectCommand, S3 } = require("@aws-sdk/client-s3");

const s3 = new S3({
  useAccelerateEndpoint: true,
});
const ulid = require("ulid");

const { BUCKET_NAME } = process.env;

module.exports.handler = async (event) => {
  const id = ulid.ulid();
  let key = `${event.identity.username}/${id}`;

  const extension = event.arguments.extension;
  if (extension) {
    if (extension.startsWith(".")) {
      key += extension;
    } else {
      key += `.${extension}`;
    }
  }

  const contentType = event.arguments.contentType || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("content type should be an image");
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    ACL: "public-read",
    ContentType: contentType,
  };
  const signedUrl = await getSignedUrl(s3, new PutObjectCommand(params));
  return signedUrl;
};
