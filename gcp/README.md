# Deploy and inference Cochl.Sense Cloud API on Google Cloud Platform

This guide explains how to deploy and use the Cochl.Sense Cloud API VM through the GCP Marketplace.

## Deploy the virtual machine

You need to configure the VM's resources.
The minimum specification is the `n1-standard-2` machine type (2 vCPUs, 7.5GB memory), but we recommend using the `n1-standard-4` machine type (4 vCPUs, 15GB memory). Additionally, at least one NVIDIA T4 or better GPU and a minimum of 40GB of disk space are required.
Please refer to the screenshot below.
![machine type](/gcp/img/instance-type.png)

Once the VM deployment is complete, verify the configuration of the created resources.
After the VM is fully up and running, you can start using the application. (It is recommended to wait 1-2 minutes for a stable system load.)

Additionally, `for security reasons, SSH access is disabled`

## How to request the deployed VM

We provides REST APIs, you can see details below.
*It is recommended to check the status by calling `/health` before calling `/inference` for the first time*

### [GET] /health

#### health-check success response

```json
# StatusCode: 200
{
    "status": "ok"
}
```

#### health-check failure response

```json
# StatusCode: 503
{
    "error": "server response but not ready"
}
```

### [POST] /inference

#### inference request format

- The request must be sent as `multipart/form-data`:
  - `file`: The audio file (e.g., testfile.mp3).
  - `content_type`: The MIME type of the file (e.g., audio/mp3).
    - supported type : [ audio/mp3, audio/wav, audio/ogg ]

#### inference Success response

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
          },
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

#### inference failure response

```json
# StatusCode: 400
{
    "error": "invalid request format"
}

# StatusCode: 429
# This case occurs when system resources(cpu, memory or queue-time) exceed threshold
# If the queue-time exceeds the threshold, system typically starts accepting requests again after approximately 20 seconds.
{
    "error": "server is too busy"
}
```

### Inference request examples

#### curl

```bash
curl -X POST http://<vm public address>/inference \
-F "file=@testfile.mp3" \
-F "content_type=audio/mp3"
```

#### Python

```python
import requests
import json

url = "http://<vm public address>/inference"
file_path = "test.mp3"

with open(file_path, 'rb') as f:
    files = {'file': f}
    data = {'content_type': 'audio/mp3'}

    response = requests.post(url, files=files, data=data)

response_data = response.json()
print(json.dumps(response_data, indent=2, ensure_ascii=False))
```
