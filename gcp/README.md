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

We provide REST APIs. You can see details below.
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

# This case occurs when the model server has not fully loaded initially
{
    "error": "rpc error: code = Unavailable desc = connection error..."
}
```

### [POST] /inference

#### inference request format

- The request must be sent as *multipart/form-data*:
  - `file`: (*required*) The audio file (e.g., testfile.mp3).
  - `content_type`: (*required*) The MIME type of the file (e.g., audio/mp3).
    - There are three options for file format audio: `[ audio/mp3, audio/wav, audio/ogg ]`
    - For raw PCM data, you can use this format: `audio/x-raw; rate={sample_rate}; format={sample_format}; channels={num of channel}`. For example, when samplerate is `22050 Hz`, sample format is `signed 24-bit little-endian` and number of channels is `1`, content_type should be `audio/x-raw; rate=22050; format=s24le; channels=1`.
       - s16le, s24le, s32le, s16be, s24be, s32be
       - u16le, u24le, u32le, u16be, u24be, u32be
       - f16le, f24le, f32le, f16be, f24be, f32be
  - `default_sensitivity`: (optional) Default: 0, If set, it allows to provide a default adjusted sensitivity for all tags
    - The sensitivity adjustment ranges in [-2, 2]
    - 0 is used if not set
  - `tags_sensitivity`: (optional) If set, it allows to adjust the sensitivity of a given tag [in this list](https://docs.cochl.ai/sense/home/soundtags/)
    - The sensitivity adjustment ranges in [-2, 2]
    - A value of 0 preserves the default sensitivity
    - e.g. {"Siren": 2, "Laughter": -2}

##### Sensitivity control
- Sensitivity can be set globally or individually per tag.
- Positive values increase tag appearance (more tags will appear), negative values decrease it (fewer tags will appear)
  - If certain tags are not being detected frequently, try increasing the sensitivity.
  - If you experience too many false detection, lowering the sensitivity may help.

#### Inference success response

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

#### Inference failure response

```json
# StatusCode: 400
{
    "error": "invalid request format"
}

# StatusCode: 429
# This case occurs when system resources (cpu, memory or queue time) exceed threshold
# If the queue time exceeds the threshold, system typically starts accepting requests again after approximately 20 seconds.
{
    "error": "server is too busy"
}
```

### Inference request examples

#### Basic examples

##### curl

```bash
curl -X POST http://<vm public address>/inference \
-F "file=@testfile.mp3" \
-F "content_type=audio/mp3"
```

##### Python

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

#### Advanced examples

##### Python - With sensitivity control

```python
import requests
import json

url = "http://<vm public address>/inference"
file_path = "test.mp3"

with open(file_path, 'rb') as f:
    files = {'file': f}
    data = {
        'content_type': 'audio/mp3',
        'default_sensitivity': 1,  # global sensitivity: ranges in [-2, 2], default is 0
        'tags_sensitivity': json.dumps({"Siren": 2, "Laughter": -2})  # per-tag sensitivity: ranges in [-2, 2]
    }
    response = requests.post(url, files=files, data=data)

response_data = response.json()
print(json.dumps(response_data, indent=2, ensure_ascii=False))
```

##### Python - Raw PCM audio data

```python
import requests
import json

url = "http://<vm public address>/inference"
file_path = "raw_audio.raw"

# Example: 22050 Hz, signed 32-bit little-endian, mono channel
with open(file_path, 'rb') as f:
    files = {'file': f}
    data = {
        'content_type': 'audio/x-raw;rate=22050;format=s32le;channels=1'
    }
    response = requests.post(url, files=files, data=data)

response_data = response.json()
print(json.dumps(response_data, indent=2, ensure_ascii=False))
```
