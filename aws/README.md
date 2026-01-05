# Deploy and inference Cochl.Sense Cloud API on AWS SageMaker

This guide explains how to use the Cochl.Sense Cloud API on AWS SageMaker.
Both Real-time Inference and Asynchronous Inference are supported.

## Input Format

- **Header**:
  - `Content-Type`: (*required*) The MIME type of the file (e.g., audio/mp3).
    - There are four options for file format audio: `[ audio/mp3, audio/wav, audio/ogg, application/octet-stream ]`
    - `application/octet-stream` is used for auto-detection of the audio format.
      - **Note**: Auto-detection does not support raw PCM data.
    - For raw PCM data, you can use this format: `audio/x-raw; rate={sample_rate}; format={sample_format}; channels={num of channel}`. For example, when samplerate is `22050 Hz`, sample format is `signed 24-bit little-endian` and number of channels is `1`, content_type should be `audio/x-raw; rate=22050; format=s24le; channels=1`.
       - s16le, s24le, s32le, s16be, s24be, s32be
       - u16le, u24le, u32le, u16be, u24be, u32be
       - f16le, f24le, f32le, f16be, f24be, f32be
  - `X-Default-Sensitivity`: (optional) Default: 0, If set, it allows to provide a default adjusted sensitivity for all tags
    - The sensitivity adjustment ranges in [-2, 2] (integer)
    - 0 is used if not set
  - `X-Tags-Sensitivity`: (optional) If set, it allows to adjust the sensitivity of a given tag [in this list](https://docs.cochl.ai/sense/home/soundtags/)
    - The sensitivity adjustment ranges in [-2, 2] (integer)
    - A value of 0 preserves the default sensitivity
    - e.g. {"Siren": 2, "Laughter": -2}
    - **Note**: This value must be a JSON string.

- **Body**:
  - The body of the request must be the raw binary data of the audio file.

### Payload Limits

| Inference Type | Max Payload Size | Processing Time Limit |
| :--- | :--- | :--- |
| **Real-time Inference** | 6 MB | 60 seconds |
| **Asynchronous Inference** | 1 GB | 60 minutes |

For more details on limits, please refer to the [Inference options](https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html) page.

## Output Format

The inference result is returned in JSON format.

```json
# StatusCode: 200
{
  "metadata": {
    "content_type": "audio/mp3",
    "length_sec": 3.012,
    "size_byte": 12345,
    "name": "testfile.mp3"
  },
  "data": [
    {
      "tags": [
          {
            "name": "Drum",
            "probability": 0.51982635
          }
      ],
      "start_time": 0,
      "end_time": 2
    },
    {
      "tags": [
          {
            "name": "Instrument",
            "probability": 0.9662908
          },
          {
            "name": "Piano",
            "probability": 0.44879228
          },
          {
            "name": "Music",
            "probability": 0.9662908
          }
       ],
       "start_time": 1,
       "end_time": 3
    }
  ]
}
```

Available tags can be found in the documentation below:
- https://docs.cochl.ai/sense/home/soundtags/

## Inference request examples

### Python (Boto3)

#### Real-time Inference

```python
import boto3

client = boto3.client('sagemaker-runtime')

endpoint_name = '<your-endpoint-name>'
file_path = 'test.mp3'
content_type = 'audio/mp3'

with open(file_path, 'rb') as f:
    payload = f.read()

response = client.invoke_endpoint(
    EndpointName=endpoint_name,
    ContentType=content_type,
    Body=payload
)

print(response['Body'].read().decode('utf-8'))
```

#### Real-time Inference - With sensitivity control

You can pass sensitivity parameters via `CustomAttributes` header.

```python
import boto3
import json

client = boto3.client('sagemaker-runtime')

endpoint_name = '<your-endpoint-name>'
file_path = 'test.mp3'
content_type = 'audio/mp3'

# Prepare CustomAttributes
# Note: Format depends on how the container parses it. Assuming key=value format.
tags_sensitivity = json.dumps({"Siren": 2, "Laughter": -2})
custom_attributes = f'X-Default-Sensitivity=1,X-Tags-Sensitivity={tags_sensitivity}'

with open(file_path, 'rb') as f:
    payload = f.read()

response = client.invoke_endpoint(
    EndpointName=endpoint_name,
    ContentType=content_type,
    CustomAttributes=custom_attributes,
    Body=payload
)

print(response['Body'].read().decode('utf-8'))
```

#### Asynchronous Inference

For Async Inference, you need to upload the file to S3 first.

```python
import boto3
import time

runtime_client = boto3.client('sagemaker-runtime')
s3_client = boto3.client('s3')

endpoint_name = '<your-async-endpoint-name>'
bucket_name = '<your-input-bucket>'
file_path = 'test.mp3'
s3_key = 'input/test.mp3'
input_location = f"s3://{bucket_name}/{s3_key}"

# Upload file to S3
s3_client.upload_file(file_path, bucket_name, s3_key)

# Invoke Endpoint
response = runtime_client.invoke_endpoint_async(
    EndpointName=endpoint_name,
    InputLocation=input_location,
    ContentType='audio/mp3'
)

output_location = response['OutputLocation']
print(f"Output will be stored at: {output_location}")

# Poll for result (simplified example)
while True:
    try:
        bucket = output_location.split('/')[2]
        key = '/'.join(output_location.split('/')[3:])
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        print(obj['Body'].read().decode('utf-8'))
        break
    except s3_client.exceptions.NoSuchKey:
        time.sleep(1)
```

### AWS CLI

#### Real-time Inference

```bash
aws sagemaker-runtime invoke-endpoint \
    --endpoint-name <your-endpoint-name> \
    --content-type audio/mp3 \
    --body fileb://test.mp3 \
    response.json

cat response.json
```

#### Real-time Inference - With sensitivity control

```bash
aws sagemaker-runtime invoke-endpoint \
    --endpoint-name <your-endpoint-name> \
    --content-type audio/mp3 \
    --custom-attributes 'X-Default-Sensitivity=1,X-Tags-Sensitivity={"Siren": 2, "Laughter": -2}' \
    --body fileb://test.mp3 \
    response.json

cat response.json
```

#### Asynchronous Inference

For Async Inference, providing the input location in S3 is required.

```bash
# Upload file to S3
aws s3 cp test.mp3 s3://<your-bucket>/input/test.mp3

# Invoke Endpoint
aws sagemaker-runtime invoke-endpoint-async \
    --endpoint-name <your-async-endpoint-name> \
    --input-location s3://<your-bucket>/input/test.mp3 \
    --content-type audio/mp3 \
    output-location.json

cat output-location.json
# The output-location.json contains the S3 path where the result will be stored.
```
