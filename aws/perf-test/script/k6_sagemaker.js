import http from "k6/http"
import { check, sleep } from "k6"
import {
  Endpoint,
  SignatureV4,
} from "https://jslib.k6.io/aws/0.12.3/signature.js"

// Load all potential test files in the global scope (init stage)
const FILES = {
  "10sec_test.mp3": open("../../../dataset/10sec_test.mp3", "b"),
  "35sec_test.mp3": open("../../../dataset/35sec_test.mp3", "b"),
}

// Configuration from environment variables
const TARGET_FILE_NAME = __ENV.TARGET_FILE || "10sec_test.mp3"
const FILE_CONTENT = FILES[TARGET_FILE_NAME]

if (!FILE_CONTENT) {
  throw new Error(
    `File ${TARGET_FILE_NAME} not found. Available: ${Object.keys(FILES).join(
      ", "
    )}`
  )
}

// Default content type based on extension
const DEFAULT_CONTENT_TYPE = TARGET_FILE_NAME.endsWith(".mp3")
  ? "audio/mp3"
  : "audio/x-raw;rate=22050;format=f32le;channels=1"

const CONTENT_TYPE = __ENV.CONTENT_TYPE || DEFAULT_CONTENT_TYPE
const RESP_DURATION = parseInt(__ENV.THRESHOLD_DURATION || "2000")
const RATE = parseInt(__ENV.RATE || "5")
const TIME_UNIT = __ENV.TIME_UNIT || "1s"
const DURATION = __ENV.DURATION || "1m"
const MAX_VUS = parseInt(__ENV.MAX_VUS || "20")

// SageMaker configuration
const AWS_REGION = __ENV.AWS_REGION || "us-east-1"
const ENDPOINT_NAME = __ENV.ENDPOINT_NAME
const SENSITIVITY = __ENV.SENSITIVITY // Optional: -2 to 2

if (!ENDPOINT_NAME) {
  throw new Error("ENDPOINT_NAME environment variable is required")
}

// Get credentials from EC2 IMDS v2
function getCredentials() {
  const tokenRes = http.put("http://169.254.169.254/latest/api/token", null, {
    headers: { "X-aws-ec2-metadata-token-ttl-seconds": "300" },
    timeout: "5s",
  })
  if (tokenRes.status !== 200) {
    throw new Error(`IMDS token failed: ${tokenRes.status}`)
  }

  const headers = { "X-aws-ec2-metadata-token": tokenRes.body }

  const roleRes = http.get(
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    { headers, timeout: "5s" }
  )
  if (roleRes.status !== 200) {
    throw new Error(`No IAM role attached to EC2: ${roleRes.status}`)
  }

  const credsRes = http.get(
    `http://169.254.169.254/latest/meta-data/iam/security-credentials/${roleRes.body.trim()}`,
    { headers, timeout: "5s" }
  )
  const creds = JSON.parse(credsRes.body)

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.Token,
  }
}

// Performance test configuration
export const options = {
  scenarios: {
    sagemaker_test: {
      executor: "constant-arrival-rate",
      rate: RATE,
      timeUnit: TIME_UNIT,
      duration: DURATION,
      preAllocatedVUs: 1,
      maxVUs: MAX_VUS,
      exec: "testSageMakerEndpoint",
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${RESP_DURATION}`],
    http_req_failed: ["rate<0.01"],
  },
}

// Setup function to get credentials (runs once before VU code)
export function setup() {
  const credentials = getCredentials()
  console.log("Setup completed, credentials fetched successfully")
  return credentials
}

export function testSageMakerEndpoint(credentials) {
  // Validate credentials from setup
  if (!credentials || !credentials.accessKeyId) {
    console.error("Credentials not available:", JSON.stringify(credentials))
    return
  }

  // Create endpoint and signer
  const endpoint = new Endpoint(
    `https://runtime.sagemaker.${AWS_REGION}.amazonaws.com`
  )
  const signer = new SignatureV4({
    service: "sagemaker",
    region: AWS_REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })

  const path = `/endpoints/${ENDPOINT_NAME}/invocations`
  const headers = {
    "Content-Type": CONTENT_TYPE,
    Accept: "application/json",
  }

  // Add sensitivity if provided
  if (SENSITIVITY) {
    headers[
      "X-Amzn-SageMaker-Custom-Attributes"
    ] = `Sensitivity={"default_sensitivity": ${SENSITIVITY}}`
  }

  const signedRequest = signer.sign(
    {
      method: "POST",
      endpoint: endpoint,
      path: path,
      headers: headers,
      body: FILE_CONTENT,
    },
    {
      signingDate: new Date(),
      signingService: "sagemaker",
      signingRegion: AWS_REGION,
    }
  )

  const res = http.post(signedRequest.url, FILE_CONTENT, {
    headers: signedRequest.headers,
    timeout: "180s",
  })

  check(res, {
    "status is 200": (r) => r.status === 200,
    [`response time < ${RESP_DURATION}ms`]: (r) =>
      r.timings.duration < RESP_DURATION,
  })

  if (res.status !== 200) {
    console.error(`Request failed: ${res.status} - ${res.body}`)
  }

  sleep(0.5)
}
