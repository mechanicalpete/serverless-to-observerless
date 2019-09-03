require("ts-node/register");

process.env.AWS_XRAY_CONTEXT_MISSING = 'LOG_ERROR';
process.env.BUCKET_NAME = '@@bucket-prefix@@-app-s2o';
process.env.DYNAMODB_TABLE = 'rock-paper-scissors';
process.env.AWS_REGION = '@@AwsRegion@@';

process.env.OVERRIDE_DYNAMODB_LOCAL_ENDPOINT = process.env.OVERRIDE_DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000';
process.env.OVERRIDE_S3_LOCAL_ENDPOINT = process.env.OVERRIDE_S3_LOCAL_ENDPOINT || 'http://localhost:8100';

// If you want to reference other typescript modules, do it via require:
const initialise = require('./initialise');

module.exports = async function () {
  await initialise.initialise();
  return null;
};