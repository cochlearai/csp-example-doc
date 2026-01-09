# AWS SageMaker Inference Examples

This document provides code examples for using the Cochl.Sense Cloud API on AWS SageMaker.

## Table of Contents

- [Real-time Inference](#real-time-inference)
- [Asynchronous Inference](#asynchronous-inference)
- [Batch Transform](#batch-transform)

## Real-time Inference

### Python (Boto3)

#### Basic Usage

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

#### With Sensitivity Control

You can pass sensitivity parameters via `CustomAttributes` header as a JSON string.

```python
import boto3
import json

client = boto3.client('sagemaker-runtime')

endpoint_name = '<your-endpoint-name>'
file_path = 'test.mp3'
content_type = 'audio/mp3'

# Prepare CustomAttributes as JSON
custom_attributes = json.dumps({
    "default_sensitivity": 1,
    "tags_sensitivity": {"Siren": 2, "Laughter": -2}
})

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

### AWS CLI

#### Basic Usage

```bash
aws sagemaker-runtime invoke-endpoint \
    --endpoint-name <your-endpoint-name> \
    --content-type audio/mp3 \
    --body fileb://test.mp3 \
    response.json

cat response.json
```

#### With Sensitivity Control

```bash
aws sagemaker-runtime invoke-endpoint \
    --endpoint-name <your-endpoint-name> \
    --content-type audio/mp3 \
    --custom-attributes '{"default_sensitivity": 1, "tags_sensitivity": {"Siren": 2, "Laughter": -2}}' \
    --body fileb://test.mp3 \
    response.json

cat response.json
```

## Asynchronous Inference

For Async Inference, you need to upload the file to S3 first.

### Python (Boto3)

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

## Batch Transform

Batch Transform allows you to run inference on a large dataset stored in S3.

If your dataset contains mixed audio formats (e.g., mp3, wav, ogg), we recommend using `application/octet-stream` as the `ContentType` to enable auto-detection.

### Python (Boto3)

```python
import boto3
import time

sagemaker_client = boto3.client('sagemaker')

model_name = '<your-model-name>'
transform_job_name = f'cochl-sense-transform-job-{int(time.time())}'
input_path = 's3://<your-input-bucket>/input-data/'
output_path = 's3://<your-output-bucket>/output-data/'

response = sagemaker_client.create_transform_job(
    TransformJobName=transform_job_name,
    ModelName=model_name,
    MaxConcurrentTransforms=1,
    MaxPayloadInMB=100,  # Max payload size
    TransformInput={
        'DataSource': {
            'S3DataSource': {
                'S3DataType': 'S3Prefix',
                'S3Uri': input_path
            }
        },
        'ContentType': 'application/octet-stream',
        'CompressionType': 'None',
        'SplitType': 'None'
    },
    TransformOutput={
        'S3OutputPath': output_path,
        'AssembleWith': 'None',
    },
    TransformResources={
        'InstanceType': 'ml.g4dn.xlarge', # Choose appropriate instance type
        'InstanceCount': 1
    }
)

print(f"Transform Job {transform_job_name} started.")
```

### AWS CLI

```bash
aws sagemaker create-transform-job \
    --transform-job-name cochl-sense-transform-job-$(date +%s) \
    --model-name <your-model-name> \
    --max-concurrent-transforms 1 \
    --max-payload-in-mb 100 \
    --transform-input DataSource={S3DataSource={S3DataType=S3Prefix,S3Uri=s3://<your-input-bucket>/input-data/}},ContentType=audio/mp3,CompressionType=None,SplitType=None \
    --transform-output S3OutputPath=s3://<your-output-bucket>/output-data/,AssembleWith=None \
    --transform-resources InstanceType=ml.g4dn.xlarge,InstanceCount=1
```
