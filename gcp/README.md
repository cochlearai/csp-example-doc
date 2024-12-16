# Deploy and inference Cochl-sense with GCP marketplace VM

## Deploy the virtual machine
TODO: add content how to deploy

## How to request the deployed VM
We provides REST APIs, you can see details below.

### [GET] /health
#### Success response
```json
# StatusCode: 200
{
    "status": "ok"
}
```

#### Failure response
```json
# StatusCode: 503
{
    "error": "server response but not ready"
}
```

### [POST] /inference
#### Request format
- The request must be sent as `multipart/form-data`:
- `file`: The audio file (e.g., testfile.mp3).
- `content_type`: The MIME type of the file (e.g., audio/mp3).
  - supported type : [ audio/mp3, audio/wav, audio/ogg ]

#### Success response
```json
# StatusCode: 200
{
  "metadata": {
    "content_type": "audio/mp3",
    "length_sec": 123,
    "size_byte": 1234,
    "name": "testfile.mp3"
  },
  "data": [
    {
        "tags": [
            {
                "name": "Gunshot",
                "probability": 0.654321,
            },
            ...
        ]
    },
    ...
  ]
}
```

#### Failure response
```json
# StatusCode: 400
{
    "error": "invalid request format"
}

# StatusCode: 429
# This case occurs when system resources(cpu, memory) exceed threshold
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

url = "http://<vm public address>/inference"

files = {
    "file": ("testfile.mp3", open("testfile.mp3", "rb"), "audio/mp3"),
    "content_type": (None, "audio/mp3")
}
response = requests.post(url, files=files)
```