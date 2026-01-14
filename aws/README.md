# Deploy and inference Cochl.Sense Cloud API on AWS SageMaker

This guide explains how to use the Cochl.Sense Cloud API on AWS SageMaker.
We support **Real-time Inference**, **Asynchronous Inference**, and **Batch Transform**.

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
  - `X-Amzn-SageMaker-Custom-Attributes`: (optional) Custom attributes to control sensitivity. Value must be a JSON string.
    - Supported Fields:
      - `default_sensitivity`: Default: 0. Range: [-2, 2] (integer). Adjusts sensitivity for all tags.
      - `tags_sensitivity`: Per-tag sensitivity adjustment. Range: [-2, 2] (integer).
    - Sensitivity can be set globally or individually per tag.
      - Positive values increase tag appearance (more tags will appear), negative values decrease it (fewer tags will appear).
      - If certain tags are not being detected frequently, try increasing the sensitivity.
      - If you experience too many false detections, lowering the sensitivity may help.
    - Example: `{"default_sensitivity": 1, "tags_sensitivity": {"Siren": 2, "Laughter": -2}}`

- **Body**:
  - The body of the request must be the raw binary data of the audio file.

### Payload Limits

| Inference Type | Max Payload Size | Processing Time Limit |
| :--- | :--- | :--- |
| **Real-time Inference** | 25 MB | 60 seconds |
| **Asynchronous Inference** | 1 GB | 60 minutes |
| **Batch Transform** | - | - |

**Note**: For Asynchronous Inference and Batch Transform, we recommend using a payload size smaller than the maximum limit to ensure stability. For Batch Transform, the default payload limit is 6 MB if not configured. Therefore, it is important to configure `MaxPayloadInMB` when creating a transform job.

For more details on limits, please refer to the [Inference options](https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html) page.

### Rate Limiting (HTTP 429)

When the endpoint receives more requests than it can handle, it may return HTTP status code `429 (Too Many Requests)`. This typically occurs when:

- Concurrent requests exceed the endpoint's processing capacity
- The request queue is full

To handle this, implement retry logic with exponential backoff in your client application. Consider scaling the number of instances if you consistently experience rate limiting.

### Performance Considerations

Processing time scales proportionally with audio file length. Shorter audio files allow for higher throughput.

#### Choosing the Right Inference Type

- **Real-time Inference**: Best for low-latency, on-demand requests.
- **Asynchronous Inference**: Suitable for longer audio files or high-concurrency workloads.
- **Batch Transform**: Best for processing large datasets at once. Note that provisioning time is significant, so it is not efficient for small batches.

For high-throughput workloads, consider scaling the number of instances.

## Output Format

The inference result is returned in JSON format.

```json
# StatusCode: 200
{
  "metadata": {
    "content_type": "audio/mp3",
    "length_sec": 3.012,
    "size_byte": 12345,
    "name": "sagemaker_input"
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

- [Sound Tags Documentation](https://docs.cochl.ai/sense/home/soundtags/)

## Inference Examples

Please refer to [Examples](examples.md) for detailed code snippets for:

- [Real-time Inference](examples.md#real-time-inference)
- [Asynchronous Inference](examples.md#asynchronous-inference)
- [Batch Transform](examples.md#batch-transform)

For a hands-on example, see the [Jupyter Notebook](notebook/Cochl_Sense-Model.ipynb).
